-- =============================================
-- Truss App - phone 必須化（空文字デフォルト）
-- =============================================
-- 目的:
-- - 初期登録で電話番号を必須入力にする方針に合わせる
-- - auth.users の作成トリガー（handle_new_user）は phone を明示しないため、
--   phone 列は DEFAULT '' を持たせ NOT NULL に変更する

ALTER TABLE public.users
  ALTER COLUMN phone SET DEFAULT '';

UPDATE public.users
SET phone = ''
WHERE phone IS NULL;

ALTER TABLE public.users
  ALTER COLUMN phone SET NOT NULL;

