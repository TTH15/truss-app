-- =============================================
-- Truss App - 運営権限(is_admin)を役職(role)に連動させる
-- =============================================
-- 方針（2026-08-08 決定）: **「部員」「非会員」以外の役職には運営権限がある**。
-- 運営権限を役職と別に手で付け外しする運用はやめ、役職を唯一の源泉にする。
--
-- 連動の規則:
-- - 役職を officer / vice_president / president / advisor に変更 → is_admin を TRUE に
-- - それらの役職から member / non_member へ降格 → is_admin を FALSE に
-- - member ⇄ non_member の切り替え（会費連動, migration 035）では is_admin に触らない。
--   これにより、役職を持たない既存の専用アカウント（Truss Admin 等）や
--   システム受信箱の is_admin は会費の状態が変わっても維持される。
--
-- トリガーの実行順（BEFORE は名前の昇順）:
--   users_admin_flag_change_admin_only (038: is_admin の自己変更ガード)
--   → users_role_change_admin_only (032: role の自己変更ガード)
--   → users_role_sync_admin_flag (本トリガー: 管理者の役職変更を is_admin に反映)
--   → users_role_sync_on_fee_paid (035: 会費 → member/non_member)
-- 本トリガーによる is_admin の書き換えは 038 のガードより後に起きるため検査されないが、
-- role の変更自体が 032 で管理者に限定されているので、会員が悪用する経路はない。

CREATE OR REPLACE FUNCTION public.sync_admin_flag_with_role()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    IF NEW.role IN ('officer', 'vice_president', 'president', 'advisor') THEN
      NEW.is_admin := TRUE;
    ELSIF OLD.role IN ('officer', 'vice_president', 'president', 'advisor') THEN
      NEW.is_admin := FALSE;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS users_role_sync_admin_flag ON public.users;
CREATE TRIGGER users_role_sync_admin_flag
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_admin_flag_with_role();

-- 既存データの整合: 役職を持つのに運営権限が無い行に付与する
UPDATE public.users
SET is_admin = TRUE
WHERE role IN ('officer', 'vice_president', 'president', 'advisor')
  AND is_admin = FALSE
  AND withdrawn_at IS NULL;

COMMENT ON COLUMN public.users.is_admin IS
  '運営権限。役職(role)が officer / vice_president / president / advisor のとき TRUE（migration 039 のトリガーで連動）。役職なしで TRUE の行は移行前の専用アカウントかシステム受信箱';
