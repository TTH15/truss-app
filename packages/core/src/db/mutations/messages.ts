/**
 * チャット/メッセージ関連の書き込み集約
 */
import { supabase } from "../../supabase";
import type { MessageCategory, MessageMention } from "../../types/app";

function toErrorOrNull(error: { message: string } | null) {
  return error ? new Error(error.message) : null;
}

export async function sendMessageRow(input: {
  senderId: string;
  senderName: string;
  receiverId: string;
  text: string;
  isAdmin: boolean;
  isBroadcast?: boolean;
  broadcastSubject?: string;
  broadcastSubjectEn?: string;
  category?: MessageCategory;
  attachmentPath?: string;
  attachmentType?: string;
  attachmentWaveform?: number[];
  flagged?: boolean;
  mention?: MessageMention;
}): Promise<{ error: Error | null }> {
  const { error } = await supabase.from("messages").insert({
    sender_id: input.senderId,
    receiver_id: input.receiverId,
    sender_name: input.senderName,
    text: input.text,
    is_admin: input.isAdmin,
    is_broadcast: input.isBroadcast ?? false,
    broadcast_subject: input.broadcastSubject ?? null,
    broadcast_subject_en: input.broadcastSubjectEn ?? null,
    category: input.category ?? null,
    attachment_path: input.attachmentPath ?? null,
    attachment_type: input.attachmentType ?? null,
    attachment_waveform: input.attachmentWaveform ?? null,
    flagged: input.flagged ?? false,
    mention: input.mention ?? null,
  });

  return { error: toErrorOrNull(error) };
}

export async function sendBulkMessagesRow(input: {
  senderId: string;
  senderName: string;
  broadcastId?: number | null;
  messages: Array<{
    receiverId: string;
    text: string;
    isAdmin: boolean;
    isBroadcast?: boolean;
    broadcastSubject?: string;
    broadcastSubjectEn?: string;
  }>;
}): Promise<{ error: Error | null }> {
  if (input.messages.length === 0) return { error: null };
  const rows = input.messages.map((message) => ({
    sender_id: input.senderId,
    receiver_id: message.receiverId,
    sender_name: input.senderName,
    text: message.text,
    is_admin: message.isAdmin,
    is_broadcast: message.isBroadcast ?? false,
    broadcast_subject: message.broadcastSubject ?? null,
    broadcast_subject_en: message.broadcastSubjectEn ?? null,
    broadcast_id: input.broadcastId ?? null,
  }));
  const { error } = await supabase.from("messages").insert(rows);
  return { error: toErrorOrNull(error) };
}

export async function cancelBroadcastRow(
  broadcastId: number
): Promise<{ error: Error | null }> {
  const cancelledAt = new Date().toISOString();
  const { data, error } = await supabase
    .from("admin_broadcasts")
    .update({ cancelled_at: cancelledAt })
    .eq("id", broadcastId)
    .is("cancelled_at", null)
    .select("id");
  if (error) return { error: toErrorOrNull(error) };
  if (!data || data.length === 0) {
    return { error: new Error("broadcast not found or already cancelled") };
  }
  const { error: messagesError } = await supabase
    .from("messages")
    .update({ cancelled_at: cancelledAt })
    .eq("broadcast_id", broadcastId)
    .is("cancelled_at", null);
  return { error: toErrorOrNull(messagesError) };
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
    .update({ read: true, read_at: new Date().toISOString() })
    .eq("id", messageId);
  return { error: toErrorOrNull(error) };
}

/** 運営が会話内の個別メッセージにピン/フラグを付ける（運営専用の内部整理用途、会員には見せない） */
export async function updateMessageFlagsRow(
  messageId: number,
  updates: Partial<{ pinned: boolean; flagged: boolean }>
): Promise<{ error: Error | null }> {
  const { error } = await supabase.from("messages").update(updates).eq("id", messageId);
  return { error: toErrorOrNull(error) };
}

/** 会員が運営（staffInboxUserId宛）からのメッセージを既読にする */
export async function markAllMessagesAsReadForUserRow(
  userId: string
): Promise<{ error: Error | null }> {
  const { error } = await supabase
    .from("messages")
    .update({ read: true, read_at: new Date().toISOString() })
    .eq("receiver_id", userId)
    .eq("is_admin", true)
    .eq("read", false);
  return { error: toErrorOrNull(error) };
}

/** 運営がその会員（sender）からのメッセージを既読にする */
export async function markMemberMessagesAsReadRow(
  memberUserId: string
): Promise<{ error: Error | null }> {
  const { error } = await supabase
    .from("messages")
    .update({ read: true, read_at: new Date().toISOString() })
    .eq("sender_id", memberUserId)
    .eq("is_admin", false)
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

