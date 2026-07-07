-- =============================================
-- Truss App - Storage policies for gallery-photos
-- Object path: {event_id}/{user_id}-{timestamp}-{suffix}.{ext}
-- =============================================

drop policy if exists "gallery_photos_public_read" on storage.objects;
create policy "gallery_photos_public_read"
on storage.objects
for select
to public
using (bucket_id = 'gallery-photos');

drop policy if exists "gallery_photos_storage_insert" on storage.objects;
create policy "gallery_photos_storage_insert"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'gallery-photos'
  and (
    public.is_admin_safe()
    or (
      public.is_approved_safe()
      and split_part(name, '/', 2) like public.get_user_id()::text || '-%'
    )
  )
);

drop policy if exists "gallery_photos_storage_delete" on storage.objects;
create policy "gallery_photos_storage_delete"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'gallery-photos'
  and (
    public.is_admin_safe()
    or (
      public.is_approved_safe()
      and split_part(name, '/', 2) like public.get_user_id()::text || '-%'
    )
  )
);
