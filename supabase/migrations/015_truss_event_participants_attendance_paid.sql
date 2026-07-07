-- event_participants に出席/支払い済みフラグを追加
ALTER TABLE public.event_participants
  ADD COLUMN IF NOT EXISTS attended boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS paid boolean NOT NULL DEFAULT false;

-- 管理者のみ event_participants を更新可能にする（RLS）
DROP POLICY IF EXISTS event_participants_update_admin_only ON public.event_participants;
CREATE POLICY event_participants_update_admin_only
ON public.event_participants FOR UPDATE
USING (is_admin_safe())
WITH CHECK (is_admin_safe());
