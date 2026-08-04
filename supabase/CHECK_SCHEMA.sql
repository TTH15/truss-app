-- =============================================
-- スキーマ適用状況の確認（いつでも安全に実行できる読み取り専用クエリ）
-- =============================================
-- 用途:
--   マイグレーションは Dashboard から手動適用しているため、適用漏れが起きても
--   実行するまで気づけない（2026-08-05 には messages の列欠けで、運営・会員を問わず
--   すべてのメッセージ送信が失敗していた）。
--   デプロイ前後にこれを流せば、どのマイグレーションが未適用かが一目で分かる。
--
-- 見方: status が MISSING の行が未適用。該当するマイグレーション番号を適用する。

WITH expected(migration, kind, object_name, detail) AS (
  VALUES
    -- 026: チャット強化
    ('026', 'column', 'messages', 'category'),
    ('026', 'column', 'messages', 'read_at'),
    ('026', 'column', 'messages', 'attachment_path'),
    ('026', 'column', 'messages', 'attachment_type'),
    -- 027: 運営ログイン用の資格情報
    ('027', 'table',  'admin_accounts', null),
    -- 028: 構造化メンション
    ('028', 'column', 'messages', 'mention'),
    -- 030: ボイスメッセージの波形
    ('030', 'column', 'messages', 'attachment_waveform'),
    -- 032: 役職
    ('032', 'column', 'users', 'role'),
    ('032', 'function', 'enforce_role_change_by_admin', null),
    -- 034: Web Push の購読
    ('034', 'table',  'push_subscriptions', null),
    -- 035: 非会員 role（会費連動）
    ('035', 'function', 'sync_role_with_fee_paid', null),
    -- 036: 退会
    ('036', 'column', 'users', 'withdrawn_at'),
    ('036', 'function', 'withdraw_own_account', null),
    ('036', 'function', 'find_withdrawn_record', null)
)
SELECT
  e.migration,
  e.kind,
  e.object_name || COALESCE('.' || e.detail, '') AS object,
  CASE
    WHEN e.kind = 'column' AND EXISTS (
      SELECT 1 FROM information_schema.columns c
      WHERE c.table_schema = 'public' AND c.table_name = e.object_name AND c.column_name = e.detail
    ) THEN 'ok'
    WHEN e.kind = 'table' AND EXISTS (
      SELECT 1 FROM information_schema.tables t
      WHERE t.table_schema = 'public' AND t.table_name = e.object_name
    ) THEN 'ok'
    WHEN e.kind = 'function' AND EXISTS (
      SELECT 1 FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public' AND p.proname = e.object_name
    ) THEN 'ok'
    ELSE 'MISSING'
  END AS status
FROM expected e
ORDER BY e.migration, e.object_name, e.detail NULLS FIRST;
