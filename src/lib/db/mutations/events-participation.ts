/**
 * イベント参加・いいね関連の書き込みを集約
 */
import { supabase } from "../../supabase";

type ParticipantInput = {
  eventId: number;
  userId: string;
  userName: string;
  userNickname: string;
  photoRefusal: boolean;
};

function toErrorOrNull(error: { message: string } | null) {
  return error ? new Error(error.message) : null;
}

export async function registerEventParticipant(
  input: ParticipantInput
): Promise<{ error: Error | null }> {
  const { error: insertError } = await supabase.from("event_participants").insert({
    event_id: input.eventId,
    user_id: input.userId,
    user_name: input.userName,
    user_nickname: input.userNickname,
    photo_refusal: input.photoRefusal,
  });
  if (insertError) return { error: new Error(insertError.message) };

  const { error: rpcError } = await supabase.rpc("increment_participants", {
    event_id: input.eventId,
  });
  return { error: toErrorOrNull(rpcError) };
}

export async function unregisterEventParticipant(
  eventId: number,
  userId: string
): Promise<{ error: Error | null }> {
  const { error: deleteError } = await supabase
    .from("event_participants")
    .delete()
    .eq("event_id", eventId)
    .eq("user_id", userId);
  if (deleteError) return { error: new Error(deleteError.message) };

  const { error: rpcError } = await supabase.rpc("decrement_participants", {
    event_id: eventId,
  });
  return { error: toErrorOrNull(rpcError) };
}

export async function toggleEventLikeForUser(
  eventId: number,
  userId: string
): Promise<{ error: Error | null }> {
  const { data: existing, error: checkError } = await supabase
    .from("event_likes")
    .select("id")
    .eq("event_id", eventId)
    .eq("user_id", userId)
    .single();

  if (checkError && checkError.code !== "PGRST116") {
    return { error: new Error(checkError.message) };
  }

  if (existing) {
    const { error: deleteLikeError } = await supabase
      .from("event_likes")
      .delete()
      .eq("event_id", eventId)
      .eq("user_id", userId);
    if (deleteLikeError) return { error: new Error(deleteLikeError.message) };

    const { error: rpcError } = await supabase.rpc("decrement_event_likes", {
      p_event_id: eventId,
    });
    return { error: toErrorOrNull(rpcError) };
  }

  const { error: insertLikeError } = await supabase.from("event_likes").insert({
    event_id: eventId,
    user_id: userId,
  });
  if (insertLikeError) return { error: new Error(insertLikeError.message) };

  const { error: rpcError } = await supabase.rpc("increment_event_likes", {
    p_event_id: eventId,
  });
  return { error: toErrorOrNull(rpcError) };
}
