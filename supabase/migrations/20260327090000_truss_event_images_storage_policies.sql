-- =============================================
-- Truss App - Storage policies for event-images
-- =============================================

-- Public read for event images (bucket is public)
drop policy if exists "event_images_public_read" on storage.objects;
create policy "event_images_public_read"
on storage.objects
for select
to public
using (bucket_id = 'event-images');

-- Admin-only write/update/delete for event images
drop policy if exists "event_images_admin_insert" on storage.objects;
create policy "event_images_admin_insert"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'event-images'
  and public.is_admin()
);

drop policy if exists "event_images_admin_update" on storage.objects;
create policy "event_images_admin_update"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'event-images'
  and public.is_admin()
)
with check (
  bucket_id = 'event-images'
  and public.is_admin()
);

drop policy if exists "event_images_admin_delete" on storage.objects;
create policy "event_images_admin_delete"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'event-images'
  and public.is_admin()
);
