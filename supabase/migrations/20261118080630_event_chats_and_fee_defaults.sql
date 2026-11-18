-- Existing fee settings are preserved; admission_fee is the entry fee alone.
ALTER TABLE public.fee_settings ALTER COLUMN admission_fee SET DEFAULT 500;

ALTER TABLE public.events ADD COLUMN IF NOT EXISTS instagram_group_link text;
COMMENT ON COLUMN public.events.instagram_group_link IS 'Instagram group chat invitation URL';
