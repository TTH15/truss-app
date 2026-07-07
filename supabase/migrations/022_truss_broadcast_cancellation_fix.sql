-- Broadcast recall (送信取り消し) was non-functional because:
--   1. admin_broadcasts had no UPDATE RLS policy, so setting cancelled_at
--      silently affected 0 rows under RLS.
--   2. Non-admin recipients have no SELECT access to admin_broadcasts, so the
--      thread query couldn't tell which broadcasts were cancelled.
-- Fix: allow admins to UPDATE admin_broadcasts, and propagate cancellation
-- onto each message via messages.cancelled_at so every recipient's own
-- message query can filter without needing to read admin_broadcasts.

drop policy if exists admin_broadcasts_update_admin_only on public.admin_broadcasts;
create policy admin_broadcasts_update_admin_only
on public.admin_broadcasts for update
using (is_admin_safe())
with check (is_admin_safe());

alter table public.messages
  add column if not exists cancelled_at timestamptz;

create index if not exists messages_cancelled_at_idx
  on public.messages (cancelled_at)
  where cancelled_at is not null;
