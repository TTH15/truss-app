-- =============================================
-- Truss App - 本番環境セットアップSQL
-- =============================================
-- 新しいSupabaseプロジェクトで実行してください
-- 順番に実行することを推奨します

-- =============================================
-- PART 1: 拡張機能とENUM型
-- =============================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TYPE user_category AS ENUM ('japanese', 'regular-international', 'exchange');

CREATE TYPE registration_step AS ENUM (
  'email_input',
  'email_sent',
  'email_verified',
  'initial_registration',
  'waiting_approval',
  'approved_limited',
  'profile_completion',
  'fee_payment',
  'fully_active'
);

CREATE TYPE event_status AS ENUM ('upcoming', 'past');
CREATE TYPE board_post_tag AS ENUM ('languageExchange', 'studyGroup', 'event');
CREATE TYPE board_post_display_type AS ENUM ('story', 'board');
CREATE TYPE notification_type AS ENUM ('message', 'event', 'photo', 'board');
CREATE TYPE notification_icon AS ENUM ('mail', 'calendar', 'image', 'user');
CREATE TYPE notification_link_page AS ENUM ('admin-chat', 'events', 'gallery', 'bulletin', 'messages');

-- =============================================
-- PART 2: テーブル作成
-- =============================================

-- Users Table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL DEFAULT '',
  nickname TEXT NOT NULL DEFAULT '',
  furigana TEXT NOT NULL DEFAULT '',
  birthday DATE,
  languages TEXT[] DEFAULT '{}',
  country TEXT NOT NULL DEFAULT '',
  category user_category NOT NULL DEFAULT 'japanese',
  approved BOOLEAN NOT NULL DEFAULT FALSE,
  is_admin BOOLEAN NOT NULL DEFAULT FALSE,
  student_id_image TEXT,
  student_number TEXT,
  grade TEXT,
  major TEXT,
  phone TEXT,
  organizations TEXT,
  blocked BOOLEAN NOT NULL DEFAULT FALSE,
  registration_step registration_step NOT NULL DEFAULT 'email_input',
  email_verified BOOLEAN NOT NULL DEFAULT FALSE,
  initial_registered BOOLEAN NOT NULL DEFAULT FALSE,
  profile_completed BOOLEAN NOT NULL DEFAULT FALSE,
  fee_paid BOOLEAN NOT NULL DEFAULT FALSE,
  student_id_reupload_requested BOOLEAN NOT NULL DEFAULT FALSE,
  reupload_reason TEXT,
  requested_at TIMESTAMPTZ,
  membership_year INTEGER,
  is_renewal BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_auth_id ON users(auth_id);
CREATE INDEX idx_users_approved ON users(approved);
CREATE INDEX idx_users_registration_step ON users(registration_step);
CREATE INDEX idx_users_category ON users(category);

-- Events Table
CREATE TABLE events (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  title_en TEXT,
  description TEXT NOT NULL DEFAULT '',
  description_en TEXT,
  date DATE NOT NULL,
  time TEXT NOT NULL,
  location TEXT NOT NULL,
  location_en TEXT,
  google_map_url TEXT,
  max_participants INTEGER NOT NULL DEFAULT 0,
  current_participants INTEGER NOT NULL DEFAULT 0,
  likes INTEGER NOT NULL DEFAULT 0,
  image TEXT,
  tags_friends_can_meet BOOLEAN NOT NULL DEFAULT FALSE,
  tags_photo_contest BOOLEAN NOT NULL DEFAULT FALSE,
  status event_status NOT NULL DEFAULT 'upcoming',
  photos_count INTEGER NOT NULL DEFAULT 0,
  line_group_link TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_events_date ON events(date);
CREATE INDEX idx_events_status ON events(status);

-- Event Participants Table
CREATE TABLE event_participants (
  id SERIAL PRIMARY KEY,
  event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_name TEXT NOT NULL,
  user_nickname TEXT NOT NULL,
  registered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  photo_refusal BOOLEAN NOT NULL DEFAULT FALSE,
  UNIQUE(event_id, user_id)
);

CREATE INDEX idx_event_participants_event ON event_participants(event_id);
CREATE INDEX idx_event_participants_user ON event_participants(user_id);

-- Event Likes Table
CREATE TABLE event_likes (
  id SERIAL PRIMARY KEY,
  event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(event_id, user_id)
);

-- Messages Table
CREATE TABLE messages (
  id SERIAL PRIMARY KEY,
  sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  receiver_id UUID REFERENCES users(id) ON DELETE CASCADE,
  sender_name TEXT NOT NULL,
  text TEXT NOT NULL,
  time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_admin BOOLEAN NOT NULL DEFAULT FALSE,
  read BOOLEAN NOT NULL DEFAULT FALSE,
  pinned BOOLEAN NOT NULL DEFAULT FALSE,
  flagged BOOLEAN NOT NULL DEFAULT FALSE,
  is_broadcast BOOLEAN NOT NULL DEFAULT FALSE,
  broadcast_subject TEXT,
  broadcast_subject_en TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_messages_sender ON messages(sender_id);
CREATE INDEX idx_messages_receiver ON messages(receiver_id);
CREATE INDEX idx_messages_is_broadcast ON messages(is_broadcast);
CREATE INDEX idx_messages_time ON messages(time DESC);

-- Chat Thread Metadata Table
CREATE TABLE chat_thread_metadata (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  admin_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  pinned BOOLEAN NOT NULL DEFAULT FALSE,
  flagged BOOLEAN NOT NULL DEFAULT FALSE,
  unread_count INTEGER NOT NULL DEFAULT 0,
  last_message_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id)
);

CREATE INDEX idx_chat_metadata_user ON chat_thread_metadata(user_id);
CREATE INDEX idx_chat_metadata_pinned ON chat_thread_metadata(pinned);
CREATE INDEX idx_chat_metadata_flagged ON chat_thread_metadata(flagged);

-- Notifications Table
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type notification_type NOT NULL,
  title TEXT NOT NULL,
  title_en TEXT,
  description TEXT NOT NULL DEFAULT '',
  description_en TEXT,
  time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  icon notification_icon NOT NULL DEFAULT 'mail',
  link TEXT,
  link_page notification_link_page,
  read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(read);
CREATE INDEX idx_notifications_time ON notifications(time DESC);

-- Board Posts Table
CREATE TABLE board_posts (
  id SERIAL PRIMARY KEY,
  author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  author TEXT NOT NULL,
  author_avatar TEXT,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT '',
  people_needed INTEGER NOT NULL DEFAULT 0,
  interested INTEGER NOT NULL DEFAULT 0,
  tag board_post_tag NOT NULL DEFAULT 'languageExchange',
  time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  image TEXT,
  display_type board_post_display_type NOT NULL DEFAULT 'board',
  expiry_date DATE,
  is_hidden BOOLEAN NOT NULL DEFAULT FALSE,
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  category TEXT,
  date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_board_posts_author ON board_posts(author_id);
CREATE INDEX idx_board_posts_tag ON board_posts(tag);
CREATE INDEX idx_board_posts_display_type ON board_posts(display_type);
CREATE INDEX idx_board_posts_is_hidden ON board_posts(is_hidden);
CREATE INDEX idx_board_posts_is_deleted ON board_posts(is_deleted);
CREATE INDEX idx_board_posts_time ON board_posts(time DESC);

-- Board Post Replies Table
CREATE TABLE board_post_replies (
  id SERIAL PRIMARY KEY,
  post_id INTEGER NOT NULL REFERENCES board_posts(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  author TEXT NOT NULL,
  author_avatar TEXT,
  content TEXT NOT NULL,
  time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_board_post_replies_post ON board_post_replies(post_id);
CREATE INDEX idx_board_post_replies_author ON board_post_replies(author_id);

-- Board Post Interests Table
CREATE TABLE board_post_interests (
  id SERIAL PRIMARY KEY,
  post_id INTEGER NOT NULL REFERENCES board_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(post_id, user_id)
);

-- Gallery Photos Table
CREATE TABLE gallery_photos (
  id SERIAL PRIMARY KEY,
  event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_name TEXT NOT NULL,
  event_date DATE NOT NULL,
  image TEXT NOT NULL,
  likes INTEGER NOT NULL DEFAULT 0,
  height INTEGER,
  user_name TEXT NOT NULL,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  approved BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_gallery_photos_event ON gallery_photos(event_id);
CREATE INDEX idx_gallery_photos_user ON gallery_photos(user_id);
CREATE INDEX idx_gallery_photos_approved ON gallery_photos(approved);
CREATE INDEX idx_gallery_photos_uploaded_at ON gallery_photos(uploaded_at DESC);

-- Gallery Photo Likes Table
CREATE TABLE gallery_photo_likes (
  id SERIAL PRIMARY KEY,
  photo_id INTEGER NOT NULL REFERENCES gallery_photos(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(photo_id, user_id)
);

-- =============================================
-- PART 3: トリガー関数
-- =============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_events_updated_at
  BEFORE UPDATE ON events
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_board_posts_updated_at
  BEFORE UPDATE ON board_posts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_chat_metadata_updated_at
  BEFORE UPDATE ON chat_thread_metadata
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- PART 4: ヘルパー関数
-- =============================================

-- Admin check function (SECURITY DEFINER to avoid RLS recursion)
CREATE OR REPLACE FUNCTION is_admin_safe()
RETURNS BOOLEAN AS $$
DECLARE
  v_is_admin BOOLEAN;
BEGIN
  SELECT is_admin INTO v_is_admin
  FROM users
  WHERE auth_id = auth.uid()
  LIMIT 1;
  RETURN COALESCE(v_is_admin, FALSE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- TypeScript の Database 型（public.Functions.is_admin）と名前を揃えるエイリアス
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$ SELECT is_admin_safe(); $$;

-- Get user ID function
CREATE OR REPLACE FUNCTION get_user_id()
RETURNS UUID AS $$
DECLARE
  v_user_id UUID;
BEGIN
  SELECT id INTO v_user_id FROM users WHERE auth_id = auth.uid() LIMIT 1;
  RETURN v_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Increment/Decrement functions
CREATE OR REPLACE FUNCTION increment_participants(event_id INTEGER)
RETURNS VOID AS $$
BEGIN
  UPDATE events SET current_participants = current_participants + 1 WHERE id = event_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION decrement_participants(event_id INTEGER)
RETURNS VOID AS $$
BEGIN
  UPDATE events SET current_participants = GREATEST(0, current_participants - 1) WHERE id = event_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION increment_event_likes(p_event_id INTEGER)
RETURNS VOID AS $$
BEGIN
  UPDATE events SET likes = likes + 1 WHERE id = p_event_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION decrement_event_likes(p_event_id INTEGER)
RETURNS VOID AS $$
BEGIN
  UPDATE events SET likes = GREATEST(0, likes - 1) WHERE id = p_event_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION increment_interested(post_id INTEGER)
RETURNS VOID AS $$
BEGIN
  UPDATE board_posts SET interested = interested + 1 WHERE id = post_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION decrement_interested(post_id INTEGER)
RETURNS VOID AS $$
BEGIN
  UPDATE board_posts SET interested = GREATEST(0, interested - 1) WHERE id = post_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION increment_photo_likes(photo_id INTEGER)
RETURNS VOID AS $$
BEGIN
  UPDATE gallery_photos SET likes = likes + 1 WHERE id = photo_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION decrement_photo_likes(photo_id INTEGER)
RETURNS VOID AS $$
BEGIN
  UPDATE gallery_photos SET likes = GREATEST(0, likes - 1) WHERE id = photo_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION increment_unread_count(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
  INSERT INTO chat_thread_metadata (user_id, unread_count, pinned, flagged)
  VALUES (p_user_id, 1, FALSE, FALSE)
  ON CONFLICT (user_id) 
  DO UPDATE SET 
    unread_count = chat_thread_metadata.unread_count + 1,
    last_message_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION reset_unread_count(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE chat_thread_metadata SET unread_count = 0 WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- PART 5: 自動トリガー関数
-- =============================================

-- User creation trigger (after auth signup)
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (auth_id, email, registration_step)
  VALUES (NEW.id, NEW.email, 'email_verified');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- Notification creation helper
CREATE OR REPLACE FUNCTION create_notification(
  p_user_id UUID,
  p_type notification_type,
  p_title TEXT,
  p_title_en TEXT,
  p_description TEXT,
  p_description_en TEXT,
  p_icon notification_icon,
  p_link TEXT DEFAULT NULL,
  p_link_page notification_link_page DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_notification_id UUID;
BEGIN
  INSERT INTO notifications (
    user_id, type, title, title_en, description, description_en, 
    icon, link, link_page, time, read
  )
  VALUES (
    p_user_id, p_type, p_title, p_title_en, p_description, p_description_en,
    p_icon, p_link, p_link_page, NOW(), FALSE
  )
  RETURNING id INTO v_notification_id;
  RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- PART 6: RLSポリシー（シンプル版）
-- =============================================
-- 注意: RLSは現在無効化されています。
-- セキュリティを強化したい場合は、以下のコメントを外して実行してください。

-- RLSを無効化（開発・テスト用）
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE events DISABLE ROW LEVEL SECURITY;
ALTER TABLE event_participants DISABLE ROW LEVEL SECURITY;
ALTER TABLE event_likes DISABLE ROW LEVEL SECURITY;
ALTER TABLE messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE chat_thread_metadata DISABLE ROW LEVEL SECURITY;
ALTER TABLE notifications DISABLE ROW LEVEL SECURITY;
ALTER TABLE board_posts DISABLE ROW LEVEL SECURITY;
ALTER TABLE board_post_replies DISABLE ROW LEVEL SECURITY;
ALTER TABLE board_post_interests DISABLE ROW LEVEL SECURITY;
ALTER TABLE gallery_photos DISABLE ROW LEVEL SECURITY;
ALTER TABLE gallery_photo_likes DISABLE ROW LEVEL SECURITY;

-- =============================================
-- PART 7: Realtime設定
-- =============================================

DO $$
DECLARE
  tables_to_add TEXT[] := ARRAY['events', 'board_posts', 'board_post_replies', 'gallery_photos', 'messages', 'notifications', 'event_participants', 'users'];
  t TEXT;
BEGIN
  FOREACH t IN ARRAY tables_to_add
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables 
      WHERE pubname = 'supabase_realtime' 
      AND tablename = t
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE %I', t);
    END IF;
  END LOOP;
END $$;

-- =============================================
-- PART 8: ストレージバケット
-- =============================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'student-id-images',
  'student-id-images',
  FALSE,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'event-images',
  'event-images',
  TRUE,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'gallery-photos',
  'gallery-photos',
  TRUE,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'user-avatars',
  'user-avatars',
  TRUE,
  2097152,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- =============================================
-- 完了メッセージ
-- =============================================
-- このSQLの実行が完了したら、以下を手動で行ってください：
-- 1. 管理者アカウントの作成（下記SQL参照）
-- 2. Google OAuth設定（Supabase Dashboard → Authentication → Providers）
-- 3. 環境変数の設定（Vercel）
