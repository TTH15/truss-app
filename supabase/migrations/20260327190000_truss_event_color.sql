-- =============================================
-- Truss App - Event color support
-- =============================================

alter table public.events
add column if not exists event_color text;

update public.events
set event_color = '#49B1E4'
where event_color is null or btrim(event_color) = '';

alter table public.events
alter column event_color set default '#49B1E4';
