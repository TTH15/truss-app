-- =============================================
-- Truss App - ユーザー役職(role)の追加
-- =============================================
-- 目的:
-- - users.role で役職(部員/役職者/副代表/代表/顧問教員)を管理する
-- - 現段階は肩書き(バッジ表示・名簿)用。RLS の権限分岐は将来段階的に追加する
-- - 将来的に admin_accounts による運営ログインを role ベースへ統合する布石
-- 注意:
-- - users_update_self_or_admin により本人が自分の行を更新できるため、
--   role カラムだけはトリガーで「管理者(is_admin)または service_role のみ変更可」に制限する

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'member';

ALTER TABLE public.users
  DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE public.users
  ADD CONSTRAINT users_role_check
  CHECK (role IN ('member', 'officer', 'vice_president', 'president', 'advisor'));

COMMENT ON COLUMN public.users.role IS
  '役職: member(部員, デフォルト) / officer(役職者) / vice_president(副代表) / president(代表) / advisor(顧問教員)';

-- role の変更は管理者のみ(本人による自己昇格を防ぐ)。
-- service_role(サーバー側 API)と Dashboard の手動操作(auth.role() が authenticated でない)は許可する。
CREATE OR REPLACE FUNCTION public.enforce_role_change_by_admin()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role
     AND auth.role() = 'authenticated'
     AND NOT is_admin_safe() THEN
    RAISE EXCEPTION 'Only admins can change user roles';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS users_role_change_admin_only ON public.users;
CREATE TRIGGER users_role_change_admin_only
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_role_change_by_admin();
