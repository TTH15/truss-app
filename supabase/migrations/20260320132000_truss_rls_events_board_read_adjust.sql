-- =============================================
-- Truss App - RLS Adjustments
-- 未承認でもイベントは閲覧可
-- ギャラリー閲覧/イベント参加/掲示板投稿・コメントは不可
-- （= gallery/participants/replies の write は承認者・管理者のまま）
-- =============================================

-- =============================================
-- events: SELECT は認証済みなら誰でも許可
-- =============================================
DROP POLICY IF EXISTS events_select_approved_or_admin ON events;

CREATE POLICY events_select_approved_or_admin
ON events FOR SELECT
USING (auth.uid() IS NOT NULL);

-- =============================================
-- board_posts: SELECT は認証済みなら誰でも許可（見えるものだけ）
-- UPDATE/DELETE/INSERT は既存の「管理者 or 承認者のみ」を維持
-- =============================================
DROP POLICY IF EXISTS board_posts_select_approved_visible_or_admin ON board_posts;

CREATE POLICY board_posts_select_approved_visible_or_admin
ON board_posts FOR SELECT
USING (
  is_admin_safe()
  OR (
    auth.uid() IS NOT NULL
    AND is_hidden = FALSE
    AND is_deleted = FALSE
  )
);

-- =============================================
-- board_post_replies: SELECT は認証済みなら誰でも許可（投稿/コメント追加は禁止のまま）
-- =============================================
DROP POLICY IF EXISTS board_post_replies_select_approved_or_admin ON board_post_replies;

CREATE POLICY board_post_replies_select_approved_or_admin
ON board_post_replies FOR SELECT
USING (is_admin_safe() OR auth.uid() IS NOT NULL);

