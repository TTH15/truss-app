/**
 * events テーブルの読み取り
 */
import { supabase } from "../../supabase";
import { mapDbEventRowToEvent } from "../mappers";
import type { Event } from "../../types/app";

export async function queryEvents(): Promise<Event[]> {
  const startedAt = typeof performance !== "undefined" ? performance.now() : Date.now();
  const { data, error } = await supabase
    .from("events")
    .select("*")
    .order("date", { ascending: false });
  if (error) throw error;
  const rows = data ?? [];
  const endedAt = typeof performance !== "undefined" ? performance.now() : Date.now();
  console.info(
    `[perf] queryEvents: ${Math.round(endedAt - startedAt)}ms, rows=${rows.length}`
  );
  return rows.map(mapDbEventRowToEvent);
}
