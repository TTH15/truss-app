-- =============================================
-- Truss App - Fee settings (annual/admission)
-- =============================================

CREATE TABLE IF NOT EXISTS fee_settings (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  annual_fee INTEGER NOT NULL DEFAULT 2000,
  admission_fee INTEGER NOT NULL DEFAULT 2500,
  currency TEXT NOT NULL DEFAULT 'JPY',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ensure singleton row exists
INSERT INTO fee_settings (id, annual_fee, admission_fee, currency)
VALUES (1, 2000, 2500, 'JPY')
ON CONFLICT (id) DO NOTHING;

-- Auto-update updated_at on update
DROP TRIGGER IF EXISTS update_fee_settings_updated_at ON fee_settings;
CREATE TRIGGER update_fee_settings_updated_at
  BEFORE UPDATE ON fee_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE fee_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS fee_settings_select_authenticated ON fee_settings;
CREATE POLICY fee_settings_select_authenticated
ON fee_settings FOR SELECT
USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS fee_settings_write_admin ON fee_settings;
CREATE POLICY fee_settings_write_admin
ON fee_settings FOR INSERT
WITH CHECK (is_admin_safe());

DROP POLICY IF EXISTS fee_settings_update_admin ON fee_settings;
CREATE POLICY fee_settings_update_admin
ON fee_settings FOR UPDATE
USING (is_admin_safe())
WITH CHECK (is_admin_safe());

DROP POLICY IF EXISTS fee_settings_delete_admin ON fee_settings;
CREATE POLICY fee_settings_delete_admin
ON fee_settings FOR DELETE
USING (is_admin_safe());

