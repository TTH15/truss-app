/**
 * event_participants テーブルの読み取り
 */
import { supabase } from "../../supabase";
import { mapDbEventParticipantRow } from "../mappers";
import type { EventParticipant } from "../../types/app";

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

/** ログイン中ユーザーが「いいね」済みのイベントID一覧（RLS により自分の行しか返らない） */
export async function queryLikedEventIds(userId: string): Promise<number[]> {
  const { data, error } = await supabase
    .from("event_likes")
    .select("event_id")
    .eq("user_id", userId);
  if (error) throw error;
  return (data ?? []).map((row) => row.event_id as number);
}

/**
 * イベント詳細を開いたことを記録する（インサイトの「ユニーク閲覧数」用）。
 * 1人1イベント1行。2回目以降は何も書かれないので、失敗も含めて画面の動作には影響させないこと。
 */
export async function recordEventViewRow(eventId: number, userId: string): Promise<void> {
  const { error } = await supabase
    .from("event_views")
    .upsert({ event_id: eventId, user_id: userId }, { onConflict: "event_id,user_id", ignoreDuplicates: true });
  if (error) throw error;
}

/** イベントのユニーク閲覧数（運営のみ RLS で読める） */
export async function queryEventViewCount(eventId: number): Promise<number> {
  const { count, error } = await supabase
    .from("event_views")
    .select("*", { count: "exact", head: true })
    .eq("event_id", eventId);
  if (error) throw error;
  return count ?? 0;
}
