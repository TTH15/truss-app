/**
 * 通知関連の書き込み集約
 */
import { supabase } from "../../supabase";

function toErrorOrNull(error: { message: string } | null) {
  return error ? new Error(error.message) : null;
}

export async function markNotificationAsReadRow(
  notificationId: string
): Promise<{ error: Error | null }> {
  const { error } = await supabase
    .from("notifications")
    .update({ read: true })
    .eq("id", notificationId);
  return { error: toErrorOrNull(error) };
}

export async function dismissNotificationRow(
  notificationId: string
): Promise<{ error: Error | null }> {
  const { error } = await supabase
    .from("notifications")
    .delete()
    .eq("id", notificationId);
  return { error: toErrorOrNull(error) };
}

