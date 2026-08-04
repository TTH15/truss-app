-- =============================================
-- 本番DBの適用漏れをまとめて解消する（2026-08-05）
-- =============================================
-- 経緯:
--   運営チャットの送信が「Could not find the 'attachment_waveform' column」→
--   適用後は「'mention' column」で失敗した。マイグレーションが番号順に適用されておらず、
--   messages テーブルに列が欠けている。1つずつ潰すと往復が増えるため、
--   messages 関連の変更をまとめて冪等に適用する。
--
-- すべて IF NOT EXISTS / DO ブロックで書いてあるので、既に適用済みでも安全に再実行できる。
-- 実行後、末尾の確認クエリで列が揃っているかを見ること。

-- ---- 026: チャット強化（カテゴリ・既読時刻・添付） ----
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'message_category') THEN
    CREATE TYPE message_category AS ENUM ('inquiry', 'event_consult', 'membership', 'trouble');
  END IF;
END $$;

ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS category message_category,
  ADD COLUMN IF NOT EXISTS read_at timestamptz,
  ADD COLUMN IF NOT EXISTS attachment_path text,
  ADD COLUMN IF NOT EXISTS attachment_type text;

-- ---- 028: 構造化メンション ----
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS mention jsonb;

-- ---- 030: ボイスメッセージの波形 ----
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS attachment_waveform jsonb;

-- ---- 確認: アプリが INSERT 時に送る列が揃っているか ----
-- 期待: 14行すべてが present = true
SELECT
  expected.column_name,
  (c.column_name IS NOT NULL) AS present
FROM (
  VALUES
    ('sender_id'), ('receiver_id'), ('sender_name'), ('text'),
    ('is_admin'), ('is_broadcast'), ('broadcast_subject'), ('broadcast_subject_en'),
    ('category'), ('attachment_path'), ('attachment_type'), ('attachment_waveform'),
    ('flagged'), ('mention')
) AS expected(column_name)
LEFT JOIN information_schema.columns c
  ON c.table_schema = 'public'
 AND c.table_name = 'messages'
 AND c.column_name = expected.column_name
ORDER BY expected.column_name;
