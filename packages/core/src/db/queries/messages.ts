/**
 * messages / chat_thread_metadata テーブルの読み取り
 */
import { supabase } from "../../supabase";
import { mapDbMessageRowToMessage } from "../mappers";
import type { Message, MessageThread, ChatThreadMetadata } from "../../types/app";

/**
 * 一度に取得するメッセージ件数の上限。
 * これを超える古い履歴は読み込まれない（本来はスレッド単位のページングにすべきで、
 * ここは「新しいメッセージが表示されない」を止めるための暫定対応）。
 */
const MESSAGE_FETCH_LIMIT = 1000;

function compareMessagesByTimeThenId(a: Message, b: Message): number {
  const ta = Date.parse(a.time);
  const tb = Date.parse(b.time);
  const na = Number.isNaN(ta) ? 0 : ta;
  const nb = Number.isNaN(tb) ? 0 : tb;
  if (na !== nb) return na - nb;
  return a.id - b.id;
}

/** 過去分を一度に読む件数。スレッドを遡るたびにこの単位で増える */
const OLDER_MESSAGES_PAGE_SIZE = 100;

/**
 * 特定スレッドの `before` より古いメッセージを取得する（過去へのページング用）。
 *
 * 初期表示は `queryMessageThreadsAndMetadata` が全体の直近 1000 件をまとめて読むため、
 * やりとりの多い環境では古い履歴がスレッドに含まれない。遡りたいスレッドだけ
 * これで追加取得する。スレッドに属する行は次の3種:
 * - 会員が送った行（sender_id = 会員）
 * - 運営がその会員へ送った行・個別配信（receiver_id = 会員）
 * - 全員向けの一斉送信（is_broadcast かつ receiver_id が NULL）
 */
export async function queryOlderThreadMessages(
  threadUserId: string,
  before: string,
  limit: number = OLDER_MESSAGES_PAGE_SIZE
): Promise<{ messages: Message[]; hasMore: boolean }> {
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .is("cancelled_at", null)
    .or(
      `sender_id.eq.${threadUserId},receiver_id.eq.${threadUserId},and(is_broadcast.eq.true,receiver_id.is.null)`
    )
    .lt("time", before)
    .order("time", { ascending: false })
    .limit(limit);
  if (error) throw error;
  const rows = (data ?? []).slice().reverse();
  return {
    messages: rows.map((r) => mapDbMessageRowToMessage(r as Parameters<typeof mapDbMessageRowToMessage>[0])),
    // limit ちょうど返ってきたときだけ「まだある」と見なす（1件も欠けずに終端まで来たら消える）
    hasMore: rows.length === limit,
  };
}

export async function queryMessageThreadsAndMetadata(): Promise<{
  threads: MessageThread;
  metadata: ChatThreadMetadata;
}> {
  const startedAt = typeof performance !== "undefined" ? performance.now() : Date.now();
  // PostgREST は上限（Supabase の既定は 1000 行）を超える分を黙って切り捨てる。
  // 昇順のまま取ると「最も古い 1000 件」しか返らず、新しく送ったメッセージが
  // いつまでも画面に出ない（2026-08-05 に発生。4月以降の全メッセージが欠落していた）。
  // 新しい順に取ってから並べ直すことで、直近ぶんが必ず含まれるようにする。
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .is("cancelled_at", null)
    .order("time", { ascending: false })
    .limit(MESSAGE_FETCH_LIMIT);
  if (error) throw error;
  // 表示・スレッド構築は古い順を前提にしているので戻す
  const rows = (data ?? []).slice().reverse();

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
    `[perf] queryMessageThreadsAndMetadata: ${Math.round(endedAt - startedAt)}ms, rows=${rows.length}${rows.length >= MESSAGE_FETCH_LIMIT ? '(上限に達しており古い履歴は未取得)' : ''}, threadKeys=${Object.keys(threads).length}, globalBroadcastRows=${globalBroadcastRows.length}`
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
