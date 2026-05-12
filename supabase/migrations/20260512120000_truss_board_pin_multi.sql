-- Allow multiple pinned board posts with custom ordering.
drop index if exists board_posts_single_pinned_idx;

alter table public.board_posts
  add column if not exists pin_order integer;

-- Backfill: if any post is currently pinned (single-pin model), assign it order 0.
update public.board_posts
set pin_order = 0
where is_pinned = true
  and pin_order is null;

-- Keep is_pinned and pin_order consistent: pinned <=> pin_order is not null.
alter table public.board_posts
  drop constraint if exists board_posts_pin_state_consistent;

alter table public.board_posts
  add constraint board_posts_pin_state_consistent
  check ((is_pinned = true and pin_order is not null) or (is_pinned = false and pin_order is null));

create index if not exists board_posts_pin_order_idx
  on public.board_posts (pin_order)
  where pin_order is not null;
