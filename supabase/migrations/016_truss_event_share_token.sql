-- events に共有用トークンを追加
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS share_token text;

-- 既存レコードを埋める（URL安全文字のみ）
UPDATE public.events
SET share_token = lower(substr(md5(random()::text || clock_timestamp()::text || id::text), 1, 16))
WHERE share_token IS NULL OR btrim(share_token) = '';

-- 新規作成時デフォルト
ALTER TABLE public.events
  ALTER COLUMN share_token SET DEFAULT lower(substr(md5(random()::text || clock_timestamp()::text), 1, 16));

-- 必須化 + 一意制約
ALTER TABLE public.events
  ALTER COLUMN share_token SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS events_share_token_key ON public.events (share_token);
