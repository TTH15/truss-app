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
