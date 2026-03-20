/**
 * events テーブルへの書き込み（ドメイン Event ↔ DB 列の変換をここに集約）
 */
import { supabase } from "../../supabase";
import type { Event } from "../../../domain/types/app";

export type EventCreateInput = Omit<Event, "id" | "currentParticipants" | "likes">;

export async function insertEventRow(
  eventData: EventCreateInput
): Promise<{ error: Error | null }> {
  const { error } = await supabase.from("events").insert({
    title: eventData.title,
    title_en: eventData.titleEn ?? null,
    description: eventData.description,
    description_en: eventData.descriptionEn ?? null,
    date: eventData.date,
    time: eventData.time,
    location: eventData.location,
    location_en: eventData.locationEn ?? null,
    google_map_url: eventData.googleMapUrl ?? null,
    max_participants: eventData.maxParticipants,
    current_participants: 0,
    likes: 0,
    image: eventData.image || null,
    tags_friends_can_meet: eventData.tags.friendsCanMeet,
    tags_photo_contest: eventData.tags.photoContest,
    status: eventData.status,
    line_group_link: eventData.lineGroupLink ?? null,
  });
  return { error: error ? new Error(error.message) : null };
}

/** Partial<Event> → events テーブル用の snake_case パッチ（未定義キーは含めない） */
export function buildEventUpdatePatch(
  updates: Partial<Event>
): Record<string, unknown> {
  const dbUpdates: Record<string, unknown> = {};
  if (updates.title !== undefined) dbUpdates.title = updates.title;
  if (updates.titleEn !== undefined) dbUpdates.title_en = updates.titleEn;
  if (updates.description !== undefined) dbUpdates.description = updates.description;
  if (updates.descriptionEn !== undefined) dbUpdates.description_en = updates.descriptionEn;
  if (updates.date !== undefined) dbUpdates.date = updates.date;
  if (updates.time !== undefined) dbUpdates.time = updates.time;
  if (updates.location !== undefined) dbUpdates.location = updates.location;
  if (updates.locationEn !== undefined) dbUpdates.location_en = updates.locationEn;
  if (updates.googleMapUrl !== undefined) dbUpdates.google_map_url = updates.googleMapUrl;
  if (updates.maxParticipants !== undefined) {
    dbUpdates.max_participants = updates.maxParticipants;
  }
  if (updates.image !== undefined) dbUpdates.image = updates.image;
  if (updates.tags !== undefined) {
    dbUpdates.tags_friends_can_meet = updates.tags.friendsCanMeet;
    dbUpdates.tags_photo_contest = updates.tags.photoContest;
  }
  if (updates.status !== undefined) dbUpdates.status = updates.status;
  if (updates.lineGroupLink !== undefined) {
    dbUpdates.line_group_link = updates.lineGroupLink;
  }
  return dbUpdates;
}

export async function updateEventRow(
  eventId: number,
  updates: Partial<Event>
): Promise<{ error: Error | null }> {
  const dbUpdates = buildEventUpdatePatch(updates);
  if (Object.keys(dbUpdates).length === 0) {
    return { error: null };
  }
  const { error } = await supabase
    .from("events")
    .update(dbUpdates)
    .eq("id", eventId);
  return { error: error ? new Error(error.message) : null };
}

export async function deleteEventRow(
  eventId: number
): Promise<{ error: Error | null }> {
  const { error } = await supabase.from("events").delete().eq("id", eventId);
  return { error: error ? new Error(error.message) : null };
}
