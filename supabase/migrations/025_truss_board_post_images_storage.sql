-- =============================================
-- Truss App - Storage bucket + policies for board-post-images
-- Object path: {user_id}-{timestamp}-{suffix}.{ext}（gallery-photosと違いイベント紐付けがないためフラット）
-- =============================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'board-post-images',
  'board-post-images',
  TRUE,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

drop policy if exists "board_post_images_public_read" on storage.objects;
create policy "board_post_images_public_read"
on storage.objects
for select
to public
using (bucket_id = 'board-post-images');

drop policy if exists "board_post_images_storage_insert" on storage.objects;
create policy "board_post_images_storage_insert"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'board-post-images'
  and (
    public.is_admin_safe()
    or (
      public.is_approved_safe()
      and name like public.get_user_id()::text || '-%'
    )
  )
);

drop policy if exists "board_post_images_storage_delete" on storage.objects;
create policy "board_post_images_storage_delete"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'board-post-images'
  and (
    public.is_admin_safe()
    or (
      public.is_approved_safe()
      and name like public.get_user_id()::text || '-%'
    )
  )
);
