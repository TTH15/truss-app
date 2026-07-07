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
