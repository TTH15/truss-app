-- =============================================
-- Truss Embassyチャット強化
-- =============================================
-- 1メンバー=1会話の構造は変えず（chat_threadsテーブルは見送り、軽量版採用）、
-- 各メッセージに category（相談カテゴリ）・read_at（既読タイムスタンプ）・
-- 添付ファイル（画像のみ、V1）を追加する。

-- =============================================
-- PART 1: 相談カテゴリ
-- =============================================

CREATE TYPE message_category AS ENUM ('inquiry', 'event_consult', 'membership', 'trouble');

ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS category message_category;

-- =============================================
-- PART 2: 既読タイムスタンプ（双方向）
-- =============================================
-- 既存の read (boolean) は残し、read_at を追加して同時に更新する運用にする。
-- RLSの messages_update_receiver_or_admin は receiver本人 OR is_admin_safe() のいずれかで
-- 更新可能なため、運営が会員のメッセージ（receiver=運営受信箱）を既読にする場合も、
-- 会員が運営のメッセージ（receiver=自分）を既読にする場合も、追加のポリシー変更なしで動く。

ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS read_at timestamptz;

-- =============================================
-- PART 3: 添付ファイル（画像のみ、V1）
-- =============================================

ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS attachment_path text,
  ADD COLUMN IF NOT EXISTS attachment_type text;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'chat-attachments',
  'chat-attachments',
  FALSE,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif']
)
ON CONFLICT (id) DO NOTHING;

-- SELECT: 管理者、またはそのメッセージの送信者・受信者本人のみ閲覧可能
-- （gallery-photos等の「承認済みなら誰でも」より狭い、messagesテーブルへの参照付きポリシー。
--   チャット添付は1:1の会話内容のため、他の会員から見えないようにする）
DROP POLICY IF EXISTS "chat_attachments_select_participant_or_admin" ON storage.objects;
CREATE POLICY "chat_attachments_select_participant_or_admin"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'chat-attachments'
  AND (
    public.is_admin_safe()
    OR EXISTS (
      SELECT 1 FROM public.messages m
      WHERE m.attachment_path = storage.objects.name
        AND (m.sender_id = public.get_user_id() OR m.receiver_id = public.get_user_id())
    )
  )
);

-- INSERT: 承認済み会員・管理者は自分のUID配下のパスにのみアップロード可能
DROP POLICY IF EXISTS "chat_attachments_insert_own" ON storage.objects;
CREATE POLICY "chat_attachments_insert_own"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'chat-attachments'
  AND split_part(name, '/', 1) = public.get_user_id()::text
  AND (public.is_admin_safe() OR public.is_approved_safe())
);

-- DELETE: 管理者、または自分がアップロードしたもの
DROP POLICY IF EXISTS "chat_attachments_delete_own_or_admin" ON storage.objects;
CREATE POLICY "chat_attachments_delete_own_or_admin"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'chat-attachments'
  AND (public.is_admin_safe() OR split_part(name, '/', 1) = public.get_user_id()::text)
);
