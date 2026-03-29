alter table public.board_posts
add column if not exists is_pinned boolean not null default false;

drop index if exists board_posts_single_pinned_idx;
create unique index board_posts_single_pinned_idx
on public.board_posts (is_pinned)
where is_pinned = true;
