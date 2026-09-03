-- =============================================
-- 役職の引き継ぎ（transfer_role）が失敗するときの切り分け（読み取り専用）
-- =============================================
-- 用途:
--   運営画面で「引き継ぎに失敗しました」と出たときに、原因が
--   (a) 権限 (b) データの重複 (c) マイグレーション未適用 のどれかを特定する。
--   すべて SELECT のみで、実行しても何も変更しない。
--
-- 使い方:
--   Supabase Dashboard の SQL Editor に貼って実行し、各セクションの status を見る。
--   ⚠️ Dashboard から実行すると auth.uid() が NULL なので、is_admin_safe() の
--      結果そのものは当てにならない。代わりにセクション4の「リンク切れ」を見ること。
--
-- 画面側の詳細メッセージも併せて確認する:
--   引き継ぎ失敗のトーストに `詳細: <DBのメッセージ> (<SQLSTATE>)` が出る。
--   - `Only admins can change user roles (P0001)`
--       → **現職が自分で後任へ引き継いだときの自滅**（032 のガードが、直前の自己降格で
--         FALSE になった自分の is_admin を読んで弾く）。migration 046 で修正済み。
--         セクション6で 046 の適用状況を確認する
--   - `Only admins can transfer roles (P0001)` → セクション4
--   - `duplicate key ... uniq_users_single_president (23505)` → セクション2・3
--   - `Could not find the function ... (PGRST202)` → セクション1

-- ---------------------------------------------
-- 1. 引き継ぎに必要なスキーマが揃っているか（043 / 045）
-- ---------------------------------------------
SELECT
  '1. schema' AS section,
  object_name,
  CASE WHEN present THEN 'OK' ELSE 'MISSING' END AS status
FROM (
  VALUES
    ('function transfer_role',
     EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
             WHERE n.nspname = 'public' AND p.proname = 'transfer_role')),
    ('function record_role_history',
     EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
             WHERE n.nspname = 'public' AND p.proname = 'record_role_history')),
    ('table user_role_history',
     EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'user_role_history')),
    ('index uniq_users_single_president',
     EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'uniq_users_single_president')),
    ('index uniq_users_single_vice_president',
     EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'uniq_users_single_vice_president')),
    ('trigger users_record_role_history',
     EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'users_record_role_history' AND NOT tgisinternal))
) AS t(object_name, present);

-- ---------------------------------------------
-- 2. 1人制約が実際に守られているか
--    2件以上あると transfer_role は前任を1人しか降格しない（LIMIT 1）ため、
--    後任を昇格させる UPDATE が 23505（duplicate key）で失敗する
-- ---------------------------------------------
SELECT
  '2. holders' AS section,
  role,
  COUNT(*) AS holders,
  CASE WHEN COUNT(*) > 1 THEN 'DUPLICATE -> 引き継ぎは必ず失敗する' ELSE 'OK' END AS status
FROM public.users
WHERE role IN ('president', 'vice_president')
  AND withdrawn_at IS NULL
GROUP BY role;

-- ---------------------------------------------
-- 3. 退会済みなのに役職が残っている行
--    ユニークインデックスの対象外なので重複の温床になる
-- ---------------------------------------------
SELECT
  '3. withdrawn holders' AS section,
  role,
  COUNT(*) AS rows_with_role_after_withdrawal
FROM public.users
WHERE role IN ('president', 'vice_president')
  AND withdrawn_at IS NOT NULL
GROUP BY role;

-- ---------------------------------------------
-- 4. is_admin_safe() が false になる原因（= 'Only admins can transfer roles'）
--    is_admin_safe() は users.auth_id = auth.uid() の行の is_admin を見る。
--    運営なのに auth_id が無い／重複していると、ログインできても運営と認識されない
-- ---------------------------------------------
SELECT
  '4. admin linkage' AS section,
  check_name,
  cnt,
  CASE WHEN cnt > 0 THEN 'NG' ELSE 'OK' END AS status
FROM (
  SELECT 'is_admin=true なのに auth_id が NULL' AS check_name,
         COUNT(*) AS cnt
  FROM public.users
  WHERE is_admin = TRUE AND auth_id IS NULL AND withdrawn_at IS NULL
  UNION ALL
  SELECT '同じ auth_id を持つ users 行が複数',
         COUNT(*)
  FROM (
    SELECT auth_id FROM public.users
    WHERE auth_id IS NOT NULL
    GROUP BY auth_id HAVING COUNT(*) > 1
  ) d
  UNION ALL
  SELECT '役職者なのに is_admin=false（039/045 の連動漏れ）',
         COUNT(*)
  FROM public.users
  WHERE role IN ('officer', 'vice_president', 'president', 'advisor', 'se')
    AND is_admin = FALSE
    AND withdrawn_at IS NULL
) x;

-- ---------------------------------------------
-- 5. transfer_role の定義（SECURITY DEFINER と所有者の確認）
--    SECURITY DEFINER が外れていると RLS に阻まれて users を更新できない
-- ---------------------------------------------
SELECT
  '5. function' AS section,
  p.proname,
  pg_get_userbyid(p.proowner) AS owner,
  p.prosecdef AS security_definer,
  CASE WHEN p.prosecdef THEN 'OK' ELSE 'NG -> SECURITY DEFINER が必要' END AS status
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND p.proname = 'transfer_role';

-- ---------------------------------------------
-- 6. 046（自己降格による自滅の修正）が適用されているか
-- ---------------------------------------------
SELECT
  '6. migration 046' AS section,
  CASE WHEN prosrc LIKE '%truss.role_transfer%' THEN 'OK' ELSE 'MISSING -> 046 を適用する' END AS status
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND p.proname = 'enforce_role_change_by_admin';
