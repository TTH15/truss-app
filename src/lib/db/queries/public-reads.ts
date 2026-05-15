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
  Message,
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
    .select("id,title,title_en,description,description_en,date,time,location,location_en,google_map_url,participation_fee,max_participants,current_participants,likes,image,event_color,event_icon,tags_friends_can_meet,tags_photo_contest,status,photos_count,line_group_link,share_token")
    .order("date", { ascending: false });
  if (error) throw error;
  const rows = data ?? [];
  const endedAt = typeof performance !== "undefined" ? performance.now() : Date.now();
  console.info(
    `[perf] queryEvents: ${Math.round(endedAt - startedAt)}ms, rows=${rows.length}`
  );
  return rows.map(mapDbEventRowToEvent);
}

/** 承認済み（または管理者）のみ RPC が UUID を返す。RLS 下で users を一覧できない一般メンバー向け。 */
export async function queryStaffInboxUserId(): Promise<string | null> {
  const { data, error } = await supabase.rpc("get_staff_inbox_user_id");
  if (error) throw error;
  if (data == null || typeof data !== "string") return null;
  return data;
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

function compareMessagesByTimeThenId(a: Message, b: Message): number {
  const ta = Date.parse(a.time);
  const tb = Date.parse(b.time);
  const na = Number.isNaN(ta) ? 0 : ta;
  const nb = Number.isNaN(tb) ? 0 : tb;
  if (na !== nb) return na - nb;
  return a.id - b.id;
}

export async function queryMessageThreadsAndMetadata(): Promise<{
  threads: MessageThread;
  metadata: ChatThreadMetadata;
}> {
  const startedAt = typeof performance !== "undefined" ? performance.now() : Date.now();
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .is("cancelled_at", null)
    .order("time", { ascending: true });
  if (error) throw error;
  const rows = data ?? [];

  const threads: MessageThread = {};
  const pushThread = (userId: string, msg: Message) => {
    if (!threads[userId]) threads[userId] = [];
    threads[userId].push(msg);
  };

  const globalBroadcastRows: typeof rows = [];

  for (const raw of rows) {
    const m = raw as {
      is_admin?: unknown;
      is_broadcast?: unknown;
      receiver_id: string | null;
      sender_id: string;
    };
    const isBroadcast = m.is_broadcast === true;
    const fromStaff = m.is_admin === true;
    if (isBroadcast && !m.receiver_id) {
      globalBroadcastRows.push(raw);
      continue;
    }
    const threadUserId = fromStaff ? m.receiver_id : m.sender_id;
    if (!threadUserId) continue;
    pushThread(threadUserId, mapDbMessageRowToMessage(raw as Parameters<typeof mapDbMessageRowToMessage>[0]));
  }

  if (globalBroadcastRows.length > 0) {
    const { data: memberRows, error: memberError } = await supabase
      .from("users")
      .select("id")
      .eq("is_admin", false);
    if (memberError) throw memberError;
    const memberIds = (memberRows ?? []).map((r) => r.id as string);
    for (const raw of globalBroadcastRows) {
      const mapped = mapDbMessageRowToMessage(raw as Parameters<typeof mapDbMessageRowToMessage>[0]);
      for (const uid of memberIds) {
        pushThread(uid, { ...mapped });
      }
    }
  }

  for (const userId of Object.keys(threads)) {
    threads[userId].sort(compareMessagesByTimeThenId);
  }

  const endedAt = typeof performance !== "undefined" ? performance.now() : Date.now();
  console.info(
    `[perf] queryMessageThreadsAndMetadata: ${Math.round(endedAt - startedAt)}ms, threadKeys=${Object.keys(threads).length}, globalBroadcastRows=${globalBroadcastRows.length}`
  );

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
