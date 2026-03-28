-- =============================================
-- gallery-photos: allow HEIF / HEIC (iPhone 等)
-- =============================================

update storage.buckets
set allowed_mime_types = array[
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/heic',
  'image/heif'
]
where id = 'gallery-photos';
