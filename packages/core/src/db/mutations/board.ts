/**
 * 掲示板関連の書き込み集約
 */
import { supabase } from "../../supabase";
import type { BoardPost, BoardPostReply } from "../../types/app";

function toErrorOrNull(error: { message: string } | null) {
  return error ? new Error(error.message) : null;
}

export async function createBoardPostRow(
  authorId: string,
  post: Omit<BoardPost, "id" | "replies">
): Promise<{ error: Error | null }> {
  const { error } = await supabase.from("board_posts").insert({
    author_id: authorId,
    author: post.author,
    author_avatar: post.authorAvatar,
    title: post.title,
    content: post.content,
    language: post.language,
    people_needed: post.peopleNeeded,
    interested: 0,
    tag: post.tag,
    image: post.image || null,
    display_type: post.displayType,
    expiry_date: post.expiryDate || null,
    is_hidden: false,
    is_deleted: false,
    category: post.category || null,
    date: post.date || null,
    is_pinned: false,
  });

  return { error: toErrorOrNull(error) };
}

export async function togglePinBoardPostRow(
  postId: number,
  pinned: boolean
): Promise<{ error: Error | null }> {
  if (!pinned) {
    const { error } = await supabase
      .from("board_posts")
      .update({ is_pinned: false, pin_order: null })
      .eq("id", postId);
    return { error: toErrorOrNull(error) };
  }

  const { data: maxRow, error: maxError } = await supabase
    .from("board_posts")
    .select("pin_order")
    .not("pin_order", "is", null)
    .order("pin_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (maxError) return { error: new Error(maxError.message) };

  const nextOrder = (maxRow?.pin_order ?? -1) + 1;
  const { error } = await supabase
    .from("board_posts")
    .update({ is_pinned: true, pin_order: nextOrder })
    .eq("id", postId);
  return { error: toErrorOrNull(error) };
}

export async function reorderPinnedBoardPostsRow(
  orderedPostIds: number[]
): Promise<{ error: Error | null }> {
  // 一意制約はないが衝突防止と単純化のため、一旦負の値で逃がしてから正の順序を割り当てる
  for (let index = 0; index < orderedPostIds.length; index += 1) {
    const id = orderedPostIds[index];
    const { error } = await supabase
      .from("board_posts")
      .update({ is_pinned: true, pin_order: -(index + 1) })
      .eq("id", id);
    if (error) return { error: new Error(error.message) };
  }
  for (let index = 0; index < orderedPostIds.length; index += 1) {
    const id = orderedPostIds[index];
    const { error } = await supabase
      .from("board_posts")
      .update({ is_pinned: true, pin_order: index })
      .eq("id", id);
    if (error) return { error: new Error(error.message) };
  }
  return { error: null };
}

export async function addReplyRow(
  authorId: string,
  postId: number,
  reply: Omit<BoardPostReply, "id">
): Promise<{ error: Error | null }> {
  const { error } = await supabase.from("board_post_replies").insert({
    post_id: postId,
    author_id: authorId,
    author: reply.author,
    author_avatar: reply.authorAvatar,
    content: reply.content,
  });

  return { error: toErrorOrNull(error) };
}

export async function togglePostInterestForUser(
  postId: number,
  userId: string
): Promise<{ error: Error | null }> {
  const { data: existing, error: checkError } = await supabase
    .from("board_post_interests")
    .select("id")
    .eq("post_id", postId)
    .eq("user_id", userId)
    .single();

  if (checkError && checkError.code !== "PGRST116") {
    return { error: new Error(checkError.message) };
  }

  if (existing) {
    const { error: deleteError } = await supabase
      .from("board_post_interests")
      .delete()
      .eq("post_id", postId)
      .eq("user_id", userId);
    if (deleteError) return { error: new Error(deleteError.message) };

    const { error: rpcError } = await supabase.rpc("decrement_interested", {
      post_id: postId,
    });
    return { error: toErrorOrNull(rpcError) };
  }

  const { error: insertError } = await supabase
    .from("board_post_interests")
    .insert({ post_id: postId, user_id: userId });
  if (insertError) return { error: new Error(insertError.message) };

  const { error: rpcError } = await supabase.rpc("increment_interested", {
    post_id: postId,
  });
  return { error: toErrorOrNull(rpcError) };
}

export async function deleteBoardPostRow(
  postId: number
): Promise<{ error: Error | null }> {
  const { error } = await supabase.rpc("delete_board_post", {
    p_post_id: postId,
  });

  return { error: toErrorOrNull(error) };
}

