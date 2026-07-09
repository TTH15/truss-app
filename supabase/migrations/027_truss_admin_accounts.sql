-- =============================================
-- Truss App - Admin accounts (管理者ログイン用の資格情報テーブル)
-- =============================================
-- apps/web/src/app/api/admin/login/route.ts が参照するテーブルだが、
-- これまでマイグレーションとして管理されておらず（本番はDashboardで手動作成された想定）、
-- dev DBには存在せず運営ログインができない状態だった。スキーマのみをここで管理する。
-- service role キー経由でのみアクセスする設計のため、RLSは有効化しポリシーは追加しない
-- （anon/authenticatedからは一切参照・更新できない＝password_hashが漏れる経路を作らない）。

CREATE TABLE IF NOT EXISTS admin_accounts (
  email TEXT PRIMARY KEY,
  password_hash TEXT NOT NULL,
  display_name TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS update_admin_accounts_updated_at ON admin_accounts;
CREATE TRIGGER update_admin_accounts_updated_at
  BEFORE UPDATE ON admin_accounts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE admin_accounts ENABLE ROW LEVEL SECURITY;
