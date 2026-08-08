-- =============================================
-- Truss App - is_admin の変更を管理者のみに制限
-- =============================================
-- 背景:
-- - 運営画面へのアクセスを「個人の Google アカウント + users.is_admin」で許可する
--   （admin_accounts の共有パスワードログインからの段階的な移行。第1段階）。
-- - その前提として is_admin の変更が守られている必要があるが、これまでトリガーが無く、
--   users_update_self_or_admin ポリシーは本人による自分の行の UPDATE を許すため、
--   **会員が自分の is_admin を true にできる穴が既にあった**（032 は role だけを守っていた）。
--
-- 032 の enforce_role_change_by_admin と同じパターン:
-- service_role（サーバー側 API）と Dashboard の手動操作（auth.role() が authenticated でない）は許可する。

CREATE OR REPLACE FUNCTION public.enforce_admin_flag_change_by_admin()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.is_admin IS DISTINCT FROM OLD.is_admin
     AND auth.role() = 'authenticated'
     AND NOT is_admin_safe() THEN
    RAISE EXCEPTION 'Only admins can change the admin flag';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS users_admin_flag_change_admin_only ON public.users;
CREATE TRIGGER users_admin_flag_change_admin_only
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_admin_flag_change_by_admin();
