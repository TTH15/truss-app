-- =============================================
-- Truss App - 通知の種類ごとの受信設定
-- =============================================
-- 背景:
-- - ブラウザの通知許可はオリジン単位で「オン/オフ」しかなく、
--   「イベント案内だけ受け取る」といった制御はブラウザ側に存在しない。
--   種類ごとの可否はアプリで持ち、送信時に絞り込む必要がある。
-- - 購読（push_subscriptions）は端末ごとだが、この設定は**人ごと**に持つ。
--   端末を買い替えても設定を引き継げるようにするため。

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS notify_message BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS notify_event BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS notify_announcement BOOLEAN NOT NULL DEFAULT TRUE;

COMMENT ON COLUMN public.users.notify_message IS '運営からのメッセージ（チャット）の通知を受け取るか';
COMMENT ON COLUMN public.users.notify_event IS 'イベントの案内の通知を受け取るか';
COMMENT ON COLUMN public.users.notify_announcement IS 'お知らせ・会費などの通知を受け取るか';
