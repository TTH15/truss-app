-- =============================================
-- Truss App - Web Push の購読情報
-- =============================================
-- 目的:
-- - ブラウザ（PWA）への Web Push 送信に必要な endpoint と鍵を保持する
-- - 1ユーザーが複数端末を使うため endpoint 単位で1行（PK は endpoint）
-- 注意:
-- - 送信はサーバー側（service role）から行う。閲覧・削除は本人と管理者のみ。
-- - モバイルアプリ（Expo Push）は別系統。将来 Expo のトークンを扱う場合は別テーブルにする。

CREATE TABLE IF NOT EXISTS push_subscriptions (
  endpoint TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user ON push_subscriptions(user_id);

DROP TRIGGER IF EXISTS update_push_subscriptions_updated_at ON push_subscriptions;
CREATE TRIGGER update_push_subscriptions_updated_at
  BEFORE UPDATE ON push_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- 自分の購読のみ操作できる（管理者は送信先の確認のため参照可）
DROP POLICY IF EXISTS push_subscriptions_select_self_or_admin ON push_subscriptions;
CREATE POLICY push_subscriptions_select_self_or_admin
ON push_subscriptions FOR SELECT
USING (is_admin_safe() OR user_id = get_user_id());

DROP POLICY IF EXISTS push_subscriptions_insert_self ON push_subscriptions;
CREATE POLICY push_subscriptions_insert_self
ON push_subscriptions FOR INSERT
WITH CHECK (user_id = get_user_id());

DROP POLICY IF EXISTS push_subscriptions_update_self ON push_subscriptions;
CREATE POLICY push_subscriptions_update_self
ON push_subscriptions FOR UPDATE
USING (user_id = get_user_id())
WITH CHECK (user_id = get_user_id());

DROP POLICY IF EXISTS push_subscriptions_delete_self_or_admin ON push_subscriptions;
CREATE POLICY push_subscriptions_delete_self_or_admin
ON push_subscriptions FOR DELETE
USING (is_admin_safe() OR user_id = get_user_id());
