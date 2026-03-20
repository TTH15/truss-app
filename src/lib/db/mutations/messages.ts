/**
 * チャット/メッセージ関連の書き込み集約
 */
import { supabase } from "../../supabase";

function toErrorOrNull(error: { message: string } | null) {
  return error ? new Error(error.message) : null;
}

export async function sendMessageRow(input: {
  senderId: string;
  senderName: string;
  receiverId: string;
  text: string;
  isAdmin: boolean;
}): Promise<{ error: Error | null }> {
  const { error } = await supabase.from("messages").insert({
    sender_id: input.senderId,
    receiver_id: input.receiverId,
    sender_name: input.senderName,
    text: input.text,
    is_admin: input.isAdmin,
  });

  return { error: toErrorOrNull(error) };
}

export async function sendBroadcastRow(input: {
  senderId: string;
  senderName: string;
  text: string;
  subjectJa: string;
  subjectEn: string;
}): Promise<{ error: Error | null }> {
  const { error } = await supabase.from("messages").insert({
    sender_id: input.senderId,
    receiver_id: null,
    sender_name: input.senderName,
    text: input.text,
    is_admin: true,
    is_broadcast: true,
    broadcast_subject: input.subjectJa,
    broadcast_subject_en: input.subjectEn,
  });

  return { error: toErrorOrNull(error) };
}

export async function markMessageAsReadRow(
  messageId: number
): Promise<{ error: Error | null }> {
  const { error } = await supabase
    .from("messages")
    .update({ read: true })
    .eq("id", messageId);
  return { error: toErrorOrNull(error) };
}

export async function markAllMessagesAsReadForUserRow(
  userId: string
): Promise<{ error: Error | null }> {
  const { error } = await supabase
    .from("messages")
    .update({ read: true })
    .eq("receiver_id", userId)
    .eq("is_admin", true)
    .eq("read", false);
  return { error: toErrorOrNull(error) };
}

export async function updateChatMetadataRow(
  userId: string,
  updates: Partial<{ pinned: boolean; flagged: boolean }>
): Promise<{ error: Error | null }> {
  const { data: existing, error: existingError } = await supabase
    .from("chat_thread_metadata")
    .select("id")
    .eq("user_id", userId)
    .single();

  if (existingError && existingError.code !== "PGRST116") {
    return { error: new Error(existingError.message) };
  }

  if (existing) {
    const { error } = await supabase
      .from("chat_thread_metadata")
      .update(updates)
      .eq("user_id", userId);
    return { error: toErrorOrNull(error) };
  }

  const { error } = await supabase.from("chat_thread_metadata").insert({
    user_id: userId,
    pinned: updates.pinned || false,
    flagged: updates.flagged || false,
    unread_count: 0,
  });

  return { error: toErrorOrNull(error) };
}

