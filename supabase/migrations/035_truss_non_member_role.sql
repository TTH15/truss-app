-- =============================================
-- Truss App - 非会員(非部員) role の追加と、会費支払いに連動した昇格
-- =============================================
-- 目的:
-- - 年会費が未払いのうちは「会員ではない」ことを role として表現する
-- - 支払い確認(fee_paid = true)を受けて自動的に部員へ昇格させる
--
-- 設計の要点:
-- - fee_paid は複数の経路から更新される(承認時・支払い確認時・年度リセット時)ため、
--   アプリ側ではなく DB トリガーで同期する。経路を増やしても取りこぼさない。
-- - **昇格・降格は non_member ⇄ member の間だけ**に限定する。役職者・副代表・代表・顧問教員は
--   会費の状態で肩書きを書き換えてはいけない(未払いを理由に代表の肩書きが消えると復元できない)。
-- - トリガー名は既存の users_role_change_admin_only より後ろに並ぶようにする。
--   BEFORE トリガーは名前の昇順で実行されるため、先に「本人による role 変更」の検査を通し、
--   そのあとで会費由来の同期を行う。

ALTER TABLE public.users
  DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE public.users
  ADD CONSTRAINT users_role_check
  CHECK (role IN ('non_member', 'member', 'officer', 'vice_president', 'president', 'advisor'));

-- 新規登録者は未払いなので既定は非会員
ALTER TABLE public.users
  ALTER COLUMN role SET DEFAULT 'non_member';

COMMENT ON COLUMN public.users.role IS
  '役職: non_member(非会員, 既定) / member(部員) / officer(役職者) / vice_president(副代表) / president(代表) / advisor(顧問教員)。non_member ⇄ member は fee_paid に連動して自動更新される';

CREATE OR REPLACE FUNCTION public.sync_role_with_fee_paid()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.fee_paid IS DISTINCT FROM OLD.fee_paid THEN
    IF NEW.fee_paid AND NEW.role = 'non_member' THEN
      NEW.role := 'member';
    ELSIF NOT NEW.fee_paid AND NEW.role = 'member' THEN
      NEW.role := 'non_member';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS users_role_sync_on_fee_paid ON public.users;
CREATE TRIGGER users_role_sync_on_fee_paid
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_role_with_fee_paid();

-- 既存データを新しい規則に合わせる。
-- 未払いの「部員」を非会員へ下げるだけで、役職持ちには触れない。支払いを確認すれば自動で戻る。
UPDATE public.users
SET role = 'non_member'
WHERE role = 'member' AND fee_paid = FALSE;

-- 支払い済みなのに非会員のままの行があれば整合させる(既定値変更前に作られた行の保険)
UPDATE public.users
SET role = 'member'
WHERE role = 'non_member' AND fee_paid = TRUE;
