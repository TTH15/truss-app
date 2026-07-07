-- =============================================
-- student-id-images バケット用 Storage RLS（当初バケット作成のみで policy なしのため、アップロードが常に拒否されていた）
-- パスの先頭は auth.uid()（初期登録時は public.users 行がなくても送れるようにするため get_user_id とは使わない）
-- =============================================

UPDATE storage.buckets
SET
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY[
    'image/jpeg',
    'image/png',
    'image/webp'
  ]::text[]
WHERE id = 'student-id-images';

DROP POLICY IF EXISTS "student_id_images_select_own_or_admin" ON storage.objects;
CREATE POLICY "student_id_images_select_own_or_admin"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'student-id-images'
  AND (
    public.is_admin_safe()
    OR split_part(name, '/', 1) = auth.uid()::text
  )
);

DROP POLICY IF EXISTS "student_id_images_insert_own" ON storage.objects;
CREATE POLICY "student_id_images_insert_own"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'student-id-images'
  AND split_part(name, '/', 1) = auth.uid()::text
);

DROP POLICY IF EXISTS "student_id_images_update_own" ON storage.objects;
CREATE POLICY "student_id_images_update_own"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'student-id-images'
  AND split_part(name, '/', 1) = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'student-id-images'
  AND split_part(name, '/', 1) = auth.uid()::text
);

DROP POLICY IF EXISTS "student_id_images_delete_own_or_admin" ON storage.objects;
CREATE POLICY "student_id_images_delete_own_or_admin"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'student-id-images'
  AND (
    public.is_admin_safe()
    OR split_part(name, '/', 1) = auth.uid()::text
  )
);
