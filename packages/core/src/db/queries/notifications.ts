/**
 * notifications テーブルの読み取り
 */
import { supabase } from "../../supabase";
import { mapDbNotificationRowToNotification } from "../mappers";
import type { Notification } from "../../types/app";

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
