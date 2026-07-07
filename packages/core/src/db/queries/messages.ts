/**
 * messages / chat_thread_metadata テーブルの読み取り
 */
import { supabase } from "../../supabase";
import { mapDbMessageRowToMessage } from "../mappers";
import type { Message, MessageThread, ChatThreadMetadata } from "../../types/app";

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
