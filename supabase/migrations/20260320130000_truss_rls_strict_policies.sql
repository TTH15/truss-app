-- =============================================
-- Truss App - Strict RLS Policies
-- 承認状態（approved）/ 管理者（is_admin_safe）を軸に絞る
-- =============================================

-- 承認済みかどうか（RLS 再帰回避のため SECURITY DEFINER）
CREATE OR REPLACE FUNCTION is_approved_safe()
RETURNS boolean AS $$
DECLARE
  v_is_approved boolean;
BEGIN
  SELECT approved INTO v_is_approved
  FROM users
  WHERE auth_id = auth.uid()
  LIMIT 1;
  RETURN COALESCE(v_is_approved, FALSE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- =============================================
-- Enable RLS
-- =============================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_thread_metadata ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE board_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE board_post_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE board_post_interests ENABLE ROW LEVEL SECURITY;
ALTER TABLE gallery_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE gallery_photo_likes ENABLE ROW LEVEL SECURITY;

-- =============================================
-- users
-- =============================================
DROP POLICY IF EXISTS users_select_self_or_admin ON users;
CREATE POLICY users_select_self_or_admin
ON users FOR SELECT
USING (auth_id = auth.uid() OR is_admin_safe());

DROP POLICY IF EXISTS users_insert_self ON users;
CREATE POLICY users_insert_self
ON users FOR INSERT
WITH CHECK (auth_id = auth.uid());

DROP POLICY IF EXISTS users_update_self_or_admin ON users;
CREATE POLICY users_update_self_or_admin
ON users FOR UPDATE
USING (id = get_user_id() OR is_admin_safe())
WITH CHECK (id = get_user_id() OR is_admin_safe());

DROP POLICY IF EXISTS users_delete_admin ON users;
CREATE POLICY users_delete_admin
ON users FOR DELETE
USING (is_admin_safe());

-- =============================================
-- events
-- =============================================
DROP POLICY IF EXISTS events_select_approved_or_admin ON events;
CREATE POLICY events_select_approved_or_admin
ON events FOR SELECT
USING (is_admin_safe() OR is_approved_safe());

DROP POLICY IF EXISTS events_write_admin ON events;
CREATE POLICY events_write_admin
ON events FOR INSERT
WITH CHECK (is_admin_safe());
CREATE POLICY events_write_admin_update
ON events FOR UPDATE
USING (is_admin_safe())
WITH CHECK (is_admin_safe());
CREATE POLICY events_write_admin_delete
ON events FOR DELETE
USING (is_admin_safe());

-- =============================================
-- event_participants
-- =============================================
DROP POLICY IF EXISTS event_participants_select_admin_or_self_approved ON event_participants;
CREATE POLICY event_participants_select_admin_or_self_approved
ON event_participants FOR SELECT
USING (is_admin_safe() OR (is_approved_safe() AND user_id = get_user_id()));

DROP POLICY IF EXISTS event_participants_insert_self_approved_or_admin ON event_participants;
CREATE POLICY event_participants_insert_self_approved_or_admin
ON event_participants FOR INSERT
WITH CHECK (is_admin_safe() OR (is_approved_safe() AND user_id = get_user_id()));

DROP POLICY IF EXISTS event_participants_delete_self_approved_or_admin ON event_participants;
CREATE POLICY event_participants_delete_self_approved_or_admin
ON event_participants FOR DELETE
USING (is_admin_safe() OR (is_approved_safe() AND user_id = get_user_id()));

-- =============================================
-- event_likes
-- =============================================
DROP POLICY IF EXISTS event_likes_select_admin_or_self_approved ON event_likes;
CREATE POLICY event_likes_select_admin_or_self_approved
ON event_likes FOR SELECT
USING (is_admin_safe() OR (is_approved_safe() AND user_id = get_user_id()));

DROP POLICY IF EXISTS event_likes_insert_self_approved_or_admin ON event_likes;
CREATE POLICY event_likes_insert_self_approved_or_admin
ON event_likes FOR INSERT
WITH CHECK (is_admin_safe() OR (is_approved_safe() AND user_id = get_user_id()));

DROP POLICY IF EXISTS event_likes_delete_self_approved_or_admin ON event_likes;
CREATE POLICY event_likes_delete_self_approved_or_admin
ON event_likes FOR DELETE
USING (is_admin_safe() OR (is_approved_safe() AND user_id = get_user_id()));

-- =============================================
-- messages
-- =============================================
DROP POLICY IF EXISTS messages_select_approved_or_admin ON messages;
CREATE POLICY messages_select_approved_or_admin
ON messages FOR SELECT
USING (
  is_admin_safe()
  OR (
    is_approved_safe()
    AND (
      sender_id = get_user_id()
      OR receiver_id = get_user_id()
      OR (is_broadcast = TRUE AND receiver_id IS NULL)
    )
  )
);

DROP POLICY IF EXISTS messages_insert_approved_or_admin ON messages;
CREATE POLICY messages_insert_approved_or_admin
ON messages FOR INSERT
WITH CHECK (
  sender_id = get_user_id()
  AND (
    (is_admin = TRUE AND is_admin_safe())
    OR (is_admin = FALSE AND is_approved_safe())
  )
);

DROP POLICY IF EXISTS messages_update_receiver_or_admin ON messages;
CREATE POLICY messages_update_receiver_or_admin
ON messages FOR UPDATE
USING (is_admin_safe() OR (is_approved_safe() AND receiver_id = get_user_id()))
WITH CHECK (is_admin_safe() OR (is_approved_safe() AND receiver_id = get_user_id()));

-- =============================================
-- chat_thread_metadata
-- =============================================
DROP POLICY IF EXISTS chat_thread_metadata_select_self_approved_or_admin ON chat_thread_metadata;
CREATE POLICY chat_thread_metadata_select_self_approved_or_admin
ON chat_thread_metadata FOR SELECT
USING (is_admin_safe() OR (is_approved_safe() AND user_id = get_user_id()));

DROP POLICY IF EXISTS chat_thread_metadata_insert_self_approved_or_admin ON chat_thread_metadata;
CREATE POLICY chat_thread_metadata_insert_self_approved_or_admin
ON chat_thread_metadata FOR INSERT
WITH CHECK (is_admin_safe() OR (is_approved_safe() AND user_id = get_user_id()));

DROP POLICY IF EXISTS chat_thread_metadata_update_self_approved_or_admin ON chat_thread_metadata;
CREATE POLICY chat_thread_metadata_update_self_approved_or_admin
ON chat_thread_metadata FOR UPDATE
USING (is_admin_safe() OR (is_approved_safe() AND user_id = get_user_id()))
WITH CHECK (is_admin_safe() OR (is_approved_safe() AND user_id = get_user_id()));

-- =============================================
-- notifications
-- =============================================
DROP POLICY IF EXISTS notifications_select_self_approved_or_admin ON notifications;
CREATE POLICY notifications_select_self_approved_or_admin
ON notifications FOR SELECT
USING (is_admin_safe() OR (is_approved_safe() AND user_id = get_user_id()));

DROP POLICY IF EXISTS notifications_update_self_approved_or_admin ON notifications;
CREATE POLICY notifications_update_self_approved_or_admin
ON notifications FOR UPDATE
USING (is_admin_safe() OR (is_approved_safe() AND user_id = get_user_id()))
WITH CHECK (is_admin_safe() OR (is_approved_safe() AND user_id = get_user_id()));

DROP POLICY IF EXISTS notifications_delete_self_approved_or_admin ON notifications;
CREATE POLICY notifications_delete_self_approved_or_admin
ON notifications FOR DELETE
USING (is_admin_safe() OR (is_approved_safe() AND user_id = get_user_id()));

-- =============================================
-- board_posts
-- =============================================
DROP POLICY IF EXISTS board_posts_select_approved_visible_or_admin ON board_posts;
CREATE POLICY board_posts_select_approved_visible_or_admin
ON board_posts FOR SELECT
USING (is_admin_safe() OR (is_approved_safe() AND is_hidden = FALSE AND is_deleted = FALSE));

DROP POLICY IF EXISTS board_posts_insert_self_approved_or_admin ON board_posts;
CREATE POLICY board_posts_insert_self_approved_or_admin
ON board_posts FOR INSERT
WITH CHECK (
  is_admin_safe()
  OR (
    is_approved_safe()
    AND author_id = get_user_id()
    AND is_hidden = FALSE
    AND is_deleted = FALSE
  )
);

DROP POLICY IF EXISTS board_posts_update_admin_only ON board_posts;
CREATE POLICY board_posts_update_admin_only
ON board_posts FOR UPDATE
USING (is_admin_safe())
WITH CHECK (is_admin_safe());

DROP POLICY IF EXISTS board_posts_delete_admin_only ON board_posts;
CREATE POLICY board_posts_delete_admin_only
ON board_posts FOR DELETE
USING (is_admin_safe());

-- =============================================
-- board_post_replies
-- =============================================
DROP POLICY IF EXISTS board_post_replies_select_approved_or_admin ON board_post_replies;
CREATE POLICY board_post_replies_select_approved_or_admin
ON board_post_replies FOR SELECT
USING (is_admin_safe() OR is_approved_safe());

DROP POLICY IF EXISTS board_post_replies_insert_self_approved_or_admin ON board_post_replies;
CREATE POLICY board_post_replies_insert_self_approved_or_admin
ON board_post_replies FOR INSERT
WITH CHECK (is_admin_safe() OR (is_approved_safe() AND author_id = get_user_id()));

-- =============================================
-- board_post_interests
-- =============================================
DROP POLICY IF EXISTS board_post_interests_select_self_approved_or_admin ON board_post_interests;
CREATE POLICY board_post_interests_select_self_approved_or_admin
ON board_post_interests FOR SELECT
USING (is_admin_safe() OR (is_approved_safe() AND user_id = get_user_id()));

DROP POLICY IF EXISTS board_post_interests_insert_self_approved_or_admin ON board_post_interests;
CREATE POLICY board_post_interests_insert_self_approved_or_admin
ON board_post_interests FOR INSERT
WITH CHECK (is_admin_safe() OR (is_approved_safe() AND user_id = get_user_id()));

DROP POLICY IF EXISTS board_post_interests_delete_self_approved_or_admin ON board_post_interests;
CREATE POLICY board_post_interests_delete_self_approved_or_admin
ON board_post_interests FOR DELETE
USING (is_admin_safe() OR (is_approved_safe() AND user_id = get_user_id()));

-- =============================================
-- gallery_photos
-- =============================================
DROP POLICY IF EXISTS gallery_photos_select_approved_or_admin ON gallery_photos;
CREATE POLICY gallery_photos_select_approved_or_admin
ON gallery_photos FOR SELECT
USING (
  is_admin_safe()
  OR (is_approved_safe() AND approved = TRUE)
);

DROP POLICY IF EXISTS gallery_photos_insert_self_approved_or_admin ON gallery_photos;
CREATE POLICY gallery_photos_insert_self_approved_or_admin
ON gallery_photos FOR INSERT
WITH CHECK (
  is_admin_safe()
  OR (
    is_approved_safe()
    AND user_id = get_user_id()
    AND approved = FALSE
  )
);

DROP POLICY IF EXISTS gallery_photos_update_likes_admin_or_approved ON gallery_photos;
CREATE POLICY gallery_photos_update_likes_admin_or_approved
ON gallery_photos FOR UPDATE
USING (
  is_admin_safe()
  OR (is_approved_safe() AND approved = TRUE)
)
WITH CHECK (
  is_admin_safe()
  OR (is_approved_safe() AND approved = TRUE)
);

DROP POLICY IF EXISTS gallery_photos_delete_admin_only ON gallery_photos;
CREATE POLICY gallery_photos_delete_admin_only
ON gallery_photos FOR DELETE
USING (is_admin_safe());

-- =============================================
-- gallery_photo_likes
-- =============================================
DROP POLICY IF EXISTS gallery_photo_likes_select_self_approved_or_admin ON gallery_photo_likes;
CREATE POLICY gallery_photo_likes_select_self_approved_or_admin
ON gallery_photo_likes FOR SELECT
USING (is_admin_safe() OR (is_approved_safe() AND user_id = get_user_id()));

DROP POLICY IF EXISTS gallery_photo_likes_insert_self_approved_or_admin ON gallery_photo_likes;
CREATE POLICY gallery_photo_likes_insert_self_approved_or_admin
ON gallery_photo_likes FOR INSERT
WITH CHECK (is_admin_safe() OR (is_approved_safe() AND user_id = get_user_id()));

DROP POLICY IF EXISTS gallery_photo_likes_delete_self_approved_or_admin ON gallery_photo_likes;
CREATE POLICY gallery_photo_likes_delete_self_approved_or_admin
ON gallery_photo_likes FOR DELETE
USING (is_admin_safe() OR (is_approved_safe() AND user_id = get_user_id()));

