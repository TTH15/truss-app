-- 管理者の一斉送信履歴テーブル
CREATE TABLE IF NOT EXISTS public.admin_broadcasts (
  id BIGSERIAL PRIMARY KEY,
  admin_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  subject_ja TEXT NOT NULL DEFAULT '',
  subject_en TEXT NOT NULL DEFAULT '',
  message_ja TEXT NOT NULL DEFAULT '',
  message_en TEXT NOT NULL DEFAULT '',
  recipient_filters TEXT[] NOT NULL DEFAULT '{}'::text[],
  recipient_count INTEGER NOT NULL DEFAULT 0 CHECK (recipient_count >= 0),
  notification_type TEXT NOT NULL CHECK (notification_type IN ('email', 'inApp', 'both')),
  status TEXT NOT NULL CHECK (status IN ('sent', 'scheduled')),
  scheduled_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_broadcasts_admin_user_id
  ON public.admin_broadcasts(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_broadcasts_created_at
  ON public.admin_broadcasts(created_at DESC);

ALTER TABLE public.admin_broadcasts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS admin_broadcasts_select_admin_only ON public.admin_broadcasts;
CREATE POLICY admin_broadcasts_select_admin_only
ON public.admin_broadcasts FOR SELECT
USING (is_admin_safe());

DROP POLICY IF EXISTS admin_broadcasts_insert_admin_only ON public.admin_broadcasts;
CREATE POLICY admin_broadcasts_insert_admin_only
ON public.admin_broadcasts FOR INSERT
WITH CHECK (is_admin_safe());
