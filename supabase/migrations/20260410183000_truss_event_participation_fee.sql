-- events に参加費（円）を追加
ALTER TABLE public.events
ADD COLUMN IF NOT EXISTS participation_fee integer NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.events.participation_fee IS 'Event participation fee in JPY';
