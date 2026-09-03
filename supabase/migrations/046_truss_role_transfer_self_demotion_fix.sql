-- =============================================
-- Truss App - 「現職が自分で後任へ引き継ぐ」と必ず失敗する問題の修正
-- =============================================
-- 症状:
--   現職の代表が自分のアカウントで後任へ引き継ごうとすると、必ず
--   `Only admins can change user roles` (P0001) で失敗し、何も変わらない。
--
-- 原因:
--   transfer_role（043）は1人制約（uniq_users_single_president）を避けるため、
--   「前任の降格 → 後任の昇格」の順に2つの UPDATE を実行する。
--   **前任が操作している本人**の場合:
--     1つ目の UPDATE で sync_admin_flag_with_role（039/045）が
--     本人の is_admin を FALSE にする。
--     2つ目の UPDATE で enforce_role_change_by_admin（032）が is_admin_safe() を
--     評価すると、同じトランザクション内で書き換わった自分の is_admin=FALSE を読み、
--     「運営ではない」と判定して例外を投げる。
--   → トランザクション全体がロールバックされ、引き継ぎは常に失敗する。
--   transfer_role 入口の検査自体は通っているため、エラー文は 043 の
--   'Only admins can transfer roles' ではなく 032 のものになる（これが切り分けの決め手）。
--
-- 修正方針:
--   transfer_role は入口で is_admin_safe() を検査済みなので、その中の UPDATE に限り
--   032 の再検査を免除する。目印はトランザクションローカルな設定値
--   （set_config の第3引数 true）で持ち、関数を抜ければ必ず消える。
--   PostgREST から set_config は呼べない（pg_catalog のため公開されない）ので、
--   会員がこの目印を自分で立てて昇格する経路は無い。
--
-- 併せて修正:
--   前任の降格を LIMIT 1 の1人だけでなく「現保持者すべて」に広げる。
--   1人制約が何らかの理由で欠けていて2人以上いる場合に、後任の昇格が
--   一意制約（23505）に当たって失敗するのを防ぐ。

-- ---------------------------------------------
-- 1. 役職変更ガード（032）に、引き継ぎ中の免除を追加
-- ---------------------------------------------
CREATE OR REPLACE FUNCTION public.enforce_role_change_by_admin()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role
     AND auth.role() = 'authenticated'
     -- transfer_role の中（運営権限は入口で検査済み）は再検査しない。
     -- 自分自身を降格した直後に自分が運営でなくなり、続く UPDATE を弾いてしまうため
     AND COALESCE(current_setting('truss.role_transfer', true), '') <> 'on'
     AND NOT is_admin_safe() THEN
    RAISE EXCEPTION 'Only admins can change user roles';
  END IF;
  RETURN NEW;
END;
$$;

-- ---------------------------------------------
-- 2. 引き継ぎ関数（043）の置き換え
-- ---------------------------------------------
CREATE OR REPLACE FUNCTION public.transfer_role(
  p_successor UUID,
  p_role TEXT,
  p_predecessor_new_role TEXT DEFAULT 'member'
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_admin_safe() THEN
    RAISE EXCEPTION 'Only admins can transfer roles';
  END IF;
  IF p_role NOT IN ('president', 'vice_president') THEN
    RAISE EXCEPTION 'transfer_role supports president / vice_president only';
  END IF;
  IF p_predecessor_new_role NOT IN ('member', 'officer') THEN
    RAISE EXCEPTION 'predecessor new role must be member or officer';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM users WHERE id = p_successor AND withdrawn_at IS NULL) THEN
    RAISE EXCEPTION 'successor not found or withdrawn';
  END IF;

  -- ここから先の users への UPDATE は 032 の再検査を免除する（トランザクション内のみ有効）
  PERFORM set_config('truss.role_transfer', 'on', true);

  -- 前任を先に降格しないと1人制約に当たる。
  -- 2人以上残っている異常状態でも後任の昇格が通るよう、現保持者はすべて降格させる
  UPDATE users
  SET role = p_predecessor_new_role
  WHERE role = p_role
    AND withdrawn_at IS NULL
    AND id <> p_successor;

  UPDATE users
  SET role = p_role
  WHERE id = p_successor AND role IS DISTINCT FROM p_role;

  PERFORM set_config('truss.role_transfer', 'off', true);
END;
$$;

COMMENT ON FUNCTION public.transfer_role(UUID, TEXT, TEXT) IS
  '代表・副代表の引き継ぎ。前任の降格と後任の昇格を1トランザクションで行う。'
  '運営権限は入口で検査し、中の UPDATE は 032 のガードを免除する（046: 自己降格による自滅の回避）';
