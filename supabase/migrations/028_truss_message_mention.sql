-- =============================================
-- Truss App - メッセージへの構造化「メンション」参照
-- =============================================
-- Journey（イベント）・Memories（思い出写真）などを、プレーンテキストの絵文字装飾ではなく
-- ChatGPTの引用チップのような専用UIで表示するため、参照情報を構造化して持たせる。
-- 将来的に他の画面（Passport等）からの共有にも同じ仕組みを使い回せるよう、
-- type + id + 表示用のtitle/subtitle/imageUrlのみを持つ汎用JSONBとする
-- （常に最新のイベント/写真データを引き直すのではなく、送信時点のスナップショットを保持する。
-- 　元データが後で削除・変更されても過去のチャット履歴の表示が壊れないようにするため）。

ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS mention JSONB;

COMMENT ON COLUMN messages.mention IS
  '構造化メンション参照。例: {"type":"event","id":12,"title":"...","subtitle":"2026-07-09","imageUrl":"..."}';
