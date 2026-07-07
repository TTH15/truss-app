-- イベント一覧カレンダー用アイコン（Font Awesome のキー文字列）
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS event_icon text NOT NULL DEFAULT 'calendar';

COMMENT ON COLUMN public.events.event_icon IS 'Font Awesome solid アイコンキー（例: calendar, sakura）。アプリ側で解決。';

UPDATE public.events SET event_icon = 'calendar' WHERE event_icon IS NULL OR trim(event_icon) = '';
