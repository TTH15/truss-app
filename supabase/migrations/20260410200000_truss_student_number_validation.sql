-- users.student_number の形式バリデーション（サーバー側）
-- 許可: 半角英数字 7桁 or 8桁（NULLは許可）
ALTER TABLE public.users
  DROP CONSTRAINT IF EXISTS users_student_number_format_chk;

ALTER TABLE public.users
  ADD CONSTRAINT users_student_number_format_chk
  CHECK (
    student_number IS NULL
    OR student_number ~ '^[A-Za-z0-9]{7,8}$'
  );
