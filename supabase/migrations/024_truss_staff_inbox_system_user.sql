-- 運営受信箱（Truss Embassyチャットの宛先）を特定の管理者個人のuser.idから切り離す。
-- 従来は get_staff_inbox_user_id() が「最古の承認済み管理者」のidを返しており、
-- そのアカウントが削除されると messages.receiver_id の ON DELETE CASCADE により
-- 運営宛の全チャット履歴が失われるリスクがあった。個人に紐付かないシステム行を
-- 新設し、運営交代（アカウント削除）が過去のチャット履歴に一切影響しないようにする。

-- 1. 運営受信箱用のシステムユーザーを作成
--    auth_id は NULL のままにする（get_user_id()/is_admin_safe() 等は auth_id = auth.uid() で
--    照合するため、NULLの行は実在のログインセッションと絶対に一致せず、誰もこの行としてログインできない）。
INSERT INTO users (
  email, name, nickname, is_admin, approved, category,
  registration_step, email_verified, initial_registered, profile_completed, fee_paid
)
VALUES (
  'staff-inbox@system.truss.internal', 'Truss運営事務局', 'Truss運営事務局', TRUE, TRUE, 'japanese',
  'fully_active', TRUE, TRUE, TRUE, TRUE
)
ON CONFLICT (email) DO NOTHING;

-- 2. 既存の運営宛メッセージ（旧: 実在の管理者個人id宛）を新しいシステムIDへ付け替え
UPDATE messages
SET receiver_id = (SELECT id FROM users WHERE email = 'staff-inbox@system.truss.internal')
WHERE receiver_id IN (SELECT id FROM users WHERE is_admin = TRUE)
  AND receiver_id <> (SELECT id FROM users WHERE email = 'staff-inbox@system.truss.internal');

-- 3. RPCを新しいシステムIDを返すよう更新
CREATE OR REPLACE FUNCTION public.get_staff_inbox_user_id()
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (public.is_approved_safe() OR public.is_admin_safe()) THEN
    RETURN NULL;
  END IF;
  RETURN (
    SELECT id FROM public.users WHERE email = 'staff-inbox@system.truss.internal' LIMIT 1
  );
END;
$$;
