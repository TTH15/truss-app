-- =============================================
-- Truss App - イベント閲覧の記録（インサイト用）
-- =============================================
-- 目的:
-- - 会員がイベント詳細を開いた「ユニーク閲覧数」を数え、運営が
--   閲覧 → 参加 → 出席 の割合（クリック率・出席率）を見られるようにする。
--
-- 軽さを最優先した設計:
-- - 1人×1イベント = 1行の複合主キー。再閲覧は ON CONFLICT DO NOTHING で書き込まれない
--   （行数の上限は 会員数 × イベント数。閲覧履歴やページビューのログは持たない）。
-- - クライアントは送信済みをメモリで覚え、同じ画面での再訪は通信もしない。

CREATE TABLE IF NOT EXISTS public.event_views (
  event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  viewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (event_id, user_id)
);

COMMENT ON TABLE public.event_views IS
  'イベント詳細のユニーク閲覧（1人1イベント1行）。運営のインサイト表示用';

ALTER TABLE public.event_views ENABLE ROW LEVEL SECURITY;

-- 記録は本人としてのみ（他人の閲覧を偽造できない）
DROP POLICY IF EXISTS event_views_insert_self ON public.event_views;
CREATE POLICY event_views_insert_self
ON public.event_views FOR INSERT
WITH CHECK (user_id = get_user_id());

-- 集計は運営のみ（誰が見たかは会員には公開しない）
DROP POLICY IF EXISTS event_views_select_admin ON public.event_views;
CREATE POLICY event_views_select_admin
ON public.event_views FOR SELECT
USING (is_admin_safe());
