-- Broadcast cancellation support.
alter table public.admin_broadcasts
  add column if not exists cancelled_at timestamptz;

alter table public.messages
  add column if not exists broadcast_id bigint references public.admin_broadcasts(id) on delete set null;

create index if not exists messages_broadcast_id_idx
  on public.messages (broadcast_id)
  where broadcast_id is not null;
