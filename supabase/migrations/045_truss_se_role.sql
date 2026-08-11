-- =============================================
-- Truss App - システム管理役職「SE」
-- =============================================
-- 目的:
-- - アプリの開発・保守者（平石孝也 / 2243327S）に、代表と同じ全権限を持つ
--   専用役職「SE」を付与する。
-- - SE は UI（メンバー詳細の役職セレクト）からは付与・変更できない。
--   設定・解除はこのようにSQLでのみ行う（引き継ぎ対象でもない）。
--
-- 権限の扱い:
-- - is_admin 連動（039）: SE も運営権限あり
-- - 上位役職判定（042 is_senior_admin_safe）: SE も保護文書（規約等）を編集可能
-- - 在任履歴（043）: SE への就任・退任も記録する
-- - 1人制約は設けない（SQL でしか付与できないため運用で足りる）

-- 1) role の許容値に 'se' を追加
ALTER TABLE public.users
  DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE public.users
  ADD CONSTRAINT users_role_check
  CHECK (role IN ('non_member', 'member', 'officer', 'vice_president', 'president', 'advisor', 'se'));

COMMENT ON COLUMN public.users.role IS
  '役職: non_member(非会員, 既定) / member(部員) / officer(役職者) / vice_president(副代表) / president(代表) / advisor(顧問教員) / se(システム管理者, SQLでのみ設定)。non_member ⇄ member は fee_paid に連動して自動更新される';

-- 2) is_admin 連動（039 の関数を SE 対応版で置き換え）
CREATE OR REPLACE FUNCTION public.sync_admin_flag_with_role()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    IF NEW.role IN ('officer', 'vice_president', 'president', 'advisor', 'se') THEN
      NEW.is_admin := TRUE;
    ELSIF OLD.role IN ('officer', 'vice_president', 'president', 'advisor', 'se') THEN
      NEW.is_admin := FALSE;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- 3) 上位役職判定（042 の関数を SE 対応版で置き換え）
CREATE OR REPLACE FUNCTION public.is_senior_admin_safe()
RETURNS BOOLEAN AS $$
DECLARE
  v_role TEXT;
BEGIN
  SELECT role INTO v_role
  FROM users
  WHERE auth_id = auth.uid()
  LIMIT 1;
  RETURN COALESCE(v_role IN ('president', 'vice_president', 'advisor', 'se'), FALSE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 4) 在任履歴（043 の CHECK とトリガーを SE 対応版で置き換え）
ALTER TABLE public.user_role_history
  DROP CONSTRAINT IF EXISTS user_role_history_role_check;
ALTER TABLE public.user_role_history
  ADD CONSTRAINT user_role_history_role_check
  CHECK (role IN ('officer', 'vice_president', 'president', 'advisor', 'se'));

CREATE OR REPLACE FUNCTION public.record_role_history()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    IF OLD.role IN ('officer', 'vice_president', 'president', 'advisor', 'se') THEN
      UPDATE public.user_role_history
      SET ended_on = CURRENT_DATE
      WHERE user_id = OLD.id AND role = OLD.role AND ended_on IS NULL;
    END IF;
    IF NEW.role IN ('officer', 'vice_president', 'president', 'advisor', 'se') THEN
      INSERT INTO public.user_role_history (user_id, role, started_on, source)
      VALUES (NEW.id, NEW.role, CURRENT_DATE, 'auto');
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- 5) 平石孝也（2243327S）へ SE を付与
--    （上で関数を差し替えてから実行するため、is_admin 連動・履歴記録も SE 対応で動く）
UPDATE public.users
SET role = 'se'
WHERE student_number = '2243327S' AND withdrawn_at IS NULL;
