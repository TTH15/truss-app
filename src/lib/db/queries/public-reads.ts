/**
 * 公開データの読み取りクエリ（Supabase Row 型はクライアント経由で推論、mappers でドメイン型へ）
 */
import { supabase } from "../../supabase";
import {
  mapDbUserRowToUser,
  mapDbEventRowToEvent,
  mapDbEventParticipantRow,
  mapDbMessageRowToMessage,
  mapDbNotificationRowToNotification,
  mapDbBoardPostRowToBoardPost,
  mapDbBoardPostReplyRow,
  mapDbGalleryPhotoRow,
} from "../mappers";
import type {
  User,
  Event,
  EventParticipant,
  MessageThread,
  ChatThreadMetadata,
  Notification,
  BoardPost,
  BoardPostReply,
  GalleryPhoto,
} from "../../../domain/types/app";

export async function queryEvents(): Promise<Event[]> {
  const { data, error } = await supabase
    .from("events")
    .select("*")
    .order("date", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapDbEventRowToEvent);
}

export async function queryPendingAndApprovedUsers(): Promise<{
  pending: User[];
  approved: User[];
}> {
  const [pendingResult, approvedResult] = await Promise.all([
    supabase
      .from("users")
      .select("*")
      .eq("approved", false)
      .eq("registration_step", "waiting_approval"),
    supabase.from("users").select("*").eq("approved", true),
  ]);
  if (pendingResult.error) throw pendingResult.error;
  if (approvedResult.error) throw approvedResult.error;
  return {
    pending: (pendingResult.data ?? []).map(mapDbUserRowToUser),
    approved: (approvedResult.data ?? []).map(mapDbUserRowToUser),
  };
}

export async function queryMessageThreadsAndMetadata(): Promise<{
  threads: MessageThread;
  metadata: ChatThreadMetadata;
}> {
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .order("time", { ascending: true });
  if (error) throw error;
  const threads: MessageThread = {};
  (data ?? []).forEach((m) => {
    const threadUserId = m.is_admin ? m.receiver_id : m.sender_id;
    if (!threadUserId) return;
    if (!threads[threadUserId]) threads[threadUserId] = [];
    threads[threadUserId].push(mapDbMessageRowToMessage(m));
  });
  const { data: metaData, error: metaError } = await supabase
    .from("chat_thread_metadata")
    .select("*");
  const metadata: ChatThreadMetadata = {};
  if (!metaError && metaData) {
    metaData.forEach((m) => {
      metadata[m.user_id] = {
        pinned: m.pinned,
        flagged: m.flagged,
        unreadCount: m.unread_count,
      };
    });
  }
  return { threads, metadata };
}

export async function queryNotificationsForUser(
  userId: string
): Promise<Notification[]> {
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("time", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapDbNotificationRowToNotification);
}

export async function queryBoardPostsWithReplies(): Promise<BoardPost[]> {
  const { data: posts, error: postsError } = await supabase
    .from("board_posts")
    .select("*")
    .eq("is_deleted", false)
    .eq("is_hidden", false)
    .order("time", { ascending: false });
  if (postsError) throw postsError;
  const list = posts ?? [];
  const postIds = list.map((p) => p.id);

  const repliesByPost: { [key: number]: BoardPostReply[] } = {};
  if (postIds.length > 0) {
    const { data: replies, error: repliesError } = await supabase
      .from("board_post_replies")
      .select("*")
      .in("post_id", postIds)
      .order("time", { ascending: true });
    if (repliesError) throw repliesError;
    (replies ?? []).forEach((r) => {
      if (!repliesByPost[r.post_id]) repliesByPost[r.post_id] = [];
      repliesByPost[r.post_id].push(mapDbBoardPostReplyRow(r));
    });
  }

  return list.map((p) =>
    mapDbBoardPostRowToBoardPost(p, repliesByPost[p.id] ?? [])
  );
}

export async function queryGalleryPhotos(): Promise<GalleryPhoto[]> {
  const { data, error } = await supabase
    .from("gallery_photos")
    .select("*")
    .order("uploaded_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapDbGalleryPhotoRow);
}

export async function queryEventParticipantsGrouped(): Promise<{
  [eventId: number]: EventParticipant[];
}> {
  const { data, error } = await supabase.from("event_participants").select("*");
  if (error) throw error;
  const participants: { [eventId: number]: EventParticipant[] } = {};
  (data ?? []).forEach((p) => {
    if (!participants[p.event_id]) participants[p.event_id] = [];
    participants[p.event_id].push(mapDbEventParticipantRow(p));
  });
  return participants;
}
