-- =============================================
-- Truss App - 管理者アカウント作成
-- =============================================
-- PRODUCTION_SETUP.sql を実行した後に実行してください

-- =============================================
-- 手順1: Supabase Dashboardで管理者ユーザーを作成
-- =============================================
-- 1. Supabase Dashboard → Authentication → Users
-- 2. 「Add user」をクリック
-- 3. Email: admin@truss.com（または任意のメールアドレス）
-- 4. Password: YOUR_PASSWORD（または任意のパスワード）
-- 5. 「Auto Confirm User」にチェック
-- 6. 「Create user」をクリック

-- =============================================
-- 手順2: 作成したユーザーのIDを確認
-- =============================================
-- 以下を実行してIDを取得:
SELECT id, email FROM auth.users WHERE email = 'admin@truss.com';

-- =============================================
-- 手順3: public.usersに管理者レコードを追加
-- =============================================
-- 上で取得したIDを使用して実行:
-- ※ 'YOUR_AUTH_USER_ID' を実際のIDに置き換えてください

/*
INSERT INTO public.users (
  id,
  auth_id,
  email,
  name,
  is_admin,
  approved,
  category,
  registration_step,
  email_verified,
  profile_completed,
  fee_paid
)
VALUES (
  'YOUR_AUTH_USER_ID',  -- auth.usersのIDをここに
  'YOUR_AUTH_USER_ID',  -- 同じIDをauth_idにも
  'admin@truss.com',
  '管理者',
  true,
  true,
  'japanese',
  'fully_active',
  true,
  true,
  true
);
*/

-- =============================================
-- 既存ユーザーを管理者に昇格させる場合
-- =============================================
-- 既にアプリに登録済みのユーザーを管理者にする場合:

/*
UPDATE public.users 
SET is_admin = true,
    approved = true,
    registration_step = 'fully_active'
WHERE email = 'your-email@example.com';
*/
