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

const USER_SELECT_COLUMNS = [
  "id",
  "email",
  "created_at",
  "name",
  "nickname",
  "furigana",
  "birthday",
  "languages",
  "country",
  "category",
  "approved",
  "is_admin",
  "avatar_path",
  "student_id_image",
  "student_number",
  "grade",
  "major",
  "phone",
  "organizations",
  "blocked",
  "registration_step",
  "email_verified",
  "initial_registered",
  "profile_completed",
  "fee_paid",
  "membership_year",
  "is_renewal",
  "student_id_reupload_requested",
  "reupload_reason",
  "requested_at",
].join(",");

export async function queryEvents(): Promise<Event[]> {
  const startedAt = typeof performance !== "undefined" ? performance.now() : Date.now();
  const { data, error } = await supabase
    .from("events")
    .select("id,title,title_en,description,description_en,date,time,location,location_en,google_map_url,max_participants,current_participants,likes,image,event_color,event_icon,tags_friends_can_meet,tags_photo_contest,status,photos_count,line_group_link")
    .order("date", { ascending: false });
  if (error) throw error;
  const rows = data ?? [];
  const endedAt = typeof performance !== "undefined" ? performance.now() : Date.now();
  console.info(
    `[perf] queryEvents: ${Math.round(endedAt - startedAt)}ms, rows=${rows.length}`
  );
  return rows.map(mapDbEventRowToEvent);
}

export async function queryPendingAndApprovedUsers(): Promise<{
  pending: User[];
  approved: User[];
}> {
  const startedAt = typeof performance !== "undefined" ? performance.now() : Date.now();
  const { data, error } = await supabase.from("users").select(USER_SELECT_COLUMNS);
  if (error) throw error;

  const rows = (data ?? []) as unknown as Array<Parameters<typeof mapDbUserRowToUser>[0]>;
  const pendingRows = rows.filter(
    (row) => row.approved === false && row.registration_step === "waiting_approval"
  );
  const approvedRows = rows.filter((row) => row.approved === true);

  const result = {
    pending: pendingRows.map(mapDbUserRowToUser),
    approved: approvedRows.map(mapDbUserRowToUser),
  };
  const endedAt = typeof performance !== "undefined" ? performance.now() : Date.now();
  console.info(
    `[perf] queryPendingAndApprovedUsers: ${Math.round(endedAt - startedAt)}ms, pending=${result.pending.length}, approved=${result.approved.length}`
  );
  return result;
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
  const startedAt = typeof performance !== "undefined" ? performance.now() : Date.now();
  const { data, error } = await supabase.from("event_participants").select("*");
  if (error) throw error;
  const participants: { [eventId: number]: EventParticipant[] } = {};
  (data ?? []).forEach((p) => {
    if (!participants[p.event_id]) participants[p.event_id] = [];
    participants[p.event_id].push(mapDbEventParticipantRow(p));
  });
  const endedAt = typeof performance !== "undefined" ? performance.now() : Date.now();
  console.info(
    `[perf] queryEventParticipantsGrouped: ${Math.round(endedAt - startedAt)}ms, rows=${(data ?? []).length}`
  );
  return participants;
}
