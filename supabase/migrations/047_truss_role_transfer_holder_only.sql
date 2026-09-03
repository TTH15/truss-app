-- =============================================
-- Truss App - 引き継ぎは「現職本人」のみ + 後任への通知
-- =============================================
-- 背景（2026-09-04 決定）:
-- - 046 までの transfer_role は is_admin_safe() しか見ていないため、
--   **役職者(officer)が単独で代表を挿げ替えられる**状態だった。
-- - 引き継ぎは現職が後任を指名する行為なので、実行できるのは
--   **その役職に現在就いている本人だけ**にする。
--   代表が副代表を付け替える、といった代理操作も認めない。
-- - 顧問教員は現状アカウントが無く、SE（開発・保守者）は DB を直接操作できるため、
--   上位役職による代理実行の口は設けない（下の「SE / 開発者向けの手順」を参照）。
--
-- 通知:
-- - 引き継ぎ完了を後任へ運営名義のアプリ内メッセージで知らせる。
-- - 送信をクライアントに任せると、前任が「部員」に降りた直後は
--   messages の RLS（messages_insert_approved_or_admin: is_admin_safe() を要求）で
--   弾かれてしまう。**引き継ぎと同じトランザクションで DB 側から挿入**する。
-- - 文面はアプリ側（i18n を持つ層）が p_notice で渡す。NULL なら送らない。
--
-- SE / 開発者向けの手順（transfer_role を使わずに直接付け替える場合）:
--   auth.role() が 'authenticated' でない接続（Dashboard の SQL Editor 等）では
--   032 のガードは働かないため、1人制約を守る順序で2回 UPDATE すればよい。
--     UPDATE public.users SET role = 'member'    WHERE id = '<前任のid>';
--     UPDATE public.users SET role = 'president' WHERE id = '<後任のid>';

-- p_notice を足すと引数の数が変わり、旧シグネチャが残ると PostgREST が
-- どちらを呼ぶか決められなくなるため、先に落としてから作り直す
DROP FUNCTION IF EXISTS public.transfer_role(UUID, TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.transfer_role(
  p_successor UUID,
  p_role TEXT,
  p_predecessor_new_role TEXT DEFAULT 'member',
  p_notice TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id UUID;
  v_caller_role TEXT;
  v_caller_name TEXT;
BEGIN
  IF p_role NOT IN ('president', 'vice_president') THEN
    RAISE EXCEPTION 'transfer_role supports president / vice_president only';
  END IF;
  IF p_predecessor_new_role NOT IN ('member', 'officer') THEN
    RAISE EXCEPTION 'predecessor new role must be member or officer';
  END IF;

  SELECT id, role, name INTO v_caller_id, v_caller_role, v_caller_name
  FROM users
  WHERE auth_id = auth.uid() AND withdrawn_at IS NULL
  LIMIT 1;

  -- 引き継げるのは現職本人だけ。運営権限があるだけでは足りない
  IF v_caller_role IS DISTINCT FROM p_role THEN
    RAISE EXCEPTION 'Only the current holder can transfer this role';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM users WHERE id = p_successor AND withdrawn_at IS NULL) THEN
    RAISE EXCEPTION 'successor not found or withdrawn';
  END IF;
  IF p_successor = v_caller_id THEN
    RAISE EXCEPTION 'successor must be someone else';
  END IF;

  -- ここから先の users への UPDATE は 032 の再検査を免除する（046。トランザクション内のみ有効）。
  -- 前任＝本人を先に降格するため、その後の自分の is_admin=FALSE で自滅しないようにする
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

  -- 後任への通知。前任はこの時点で運営権限を失っていることがあるため、
  -- クライアントからではなくここで挿入する（RLS は SECURITY DEFINER で迂回）
  IF p_notice IS NOT NULL AND length(btrim(p_notice)) > 0 THEN
    INSERT INTO public.messages (sender_id, receiver_id, sender_name, text, is_admin)
    VALUES (v_caller_id, p_successor, COALESCE(v_caller_name, 'Truss'), p_notice, TRUE);
  END IF;

  PERFORM set_config('truss.role_transfer', 'off', true);
END;
$$;

COMMENT ON FUNCTION public.transfer_role(UUID, TEXT, TEXT, TEXT) IS
  '代表・副代表の引き継ぎ。実行できるのはその役職の現職本人のみ（047）。'
  '前任の降格と後任の昇格、後任への通知を1トランザクションで行う';
