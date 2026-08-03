/**
 * board_posts / board_post_replies テーブルの読み取り
 */
import { supabase } from "../../supabase";
import { mapDbBoardPostRowToBoardPost, mapDbBoardPostReplyRow } from "../mappers";
import type { BoardPost, BoardPostReply } from "../../types/app";

export async function queryBoardPostsWithReplies(): Promise<BoardPost[]> {
  const { data: posts, error: postsError } = await supabase
    .from("board_posts")
    .select("*")
    .eq("is_deleted", false)
    .eq("is_hidden", false)
    .order("time", { ascending: false });
  if (postsError) throw postsError;
  const list = posts ?? [];
  const postIds = list.map((p) => p.id);

  const repliesByPost: { [key: number]: BoardPostReply[] } = {};
  if (postIds.length > 0) {
    const { data: replies, error: repliesError } = await supabase
      .from("board_post_replies")
      .select("*")
      .in("post_id", postIds)
      .order("time", { ascending: true });
    if (repliesError) throw repliesError;
    (replies ?? []).forEach((r) => {
      if (!repliesByPost[r.post_id]) repliesByPost[r.post_id] = [];
      repliesByPost[r.post_id].push(mapDbBoardPostReplyRow(r));
    });
  }

  return list.map((p) =>
    mapDbBoardPostRowToBoardPost(p, repliesByPost[p.id] ?? [])
  );
}

/** ログイン中ユーザーが「興味あり」済みの投稿ID一覧（RLS により自分の行しか返らない） */
export async function queryInterestedBoardPostIds(userId: string): Promise<number[]> {
  const { data, error } = await supabase
    .from("board_post_interests")
    .select("post_id")
    .eq("user_id", userId);
  if (error) throw error;
  return (data ?? []).map((row) => row.post_id as number);
}
