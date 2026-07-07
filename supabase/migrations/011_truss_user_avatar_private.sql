-- =============================================
-- User profile avatar: DB column + private storage
-- =============================================

ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_path TEXT;

COMMENT ON COLUMN users.avatar_path IS 'Storage path in bucket user-avatars, e.g. {user_id}/avatar.jpg';

UPDATE storage.buckets
SET
  public = FALSE,
  file_size_limit = 2097152,
  allowed_mime_types = ARRAY[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/heic',
    'image/heif'
  ]::text[]
WHERE id = 'user-avatars';

-- RLS: anonymous cannot read; approved members & admins can read (signed URLs / API)
DROP POLICY IF EXISTS "user_avatars_select_approved_or_admin" ON storage.objects;
CREATE POLICY "user_avatars_select_approved_or_admin"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'user-avatars'
  AND (
    public.is_admin_safe()
    OR public.is_approved_safe()
    OR split_part(name, '/', 1) = public.get_user_id()::text
  )
);

DROP POLICY IF EXISTS "user_avatars_insert_own" ON storage.objects;
CREATE POLICY "user_avatars_insert_own"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'user-avatars'
  AND split_part(name, '/', 1) = public.get_user_id()::text
);

DROP POLICY IF EXISTS "user_avatars_update_own" ON storage.objects;
CREATE POLICY "user_avatars_update_own"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'user-avatars'
  AND split_part(name, '/', 1) = public.get_user_id()::text
)
WITH CHECK (
  bucket_id = 'user-avatars'
  AND split_part(name, '/', 1) = public.get_user_id()::text
);

DROP POLICY IF EXISTS "user_avatars_delete_own_or_admin" ON storage.objects;
CREATE POLICY "user_avatars_delete_own_or_admin"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'user-avatars'
  AND (
    public.is_admin_safe()
    OR split_part(name, '/', 1) = public.get_user_id()::text
  )
);
