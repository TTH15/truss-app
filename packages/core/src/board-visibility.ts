import type { BoardPost } from "./types/app";
import { toLocalDateKey } from "./date-key";

/** ストーリーが表示される期間（投稿から24時間） */
const STORY_LIFETIME_MS = 24 * 60 * 60 * 1000;

/**
 * 掲示板（displayType: 'board'）の掲載期限が過ぎているか。
 * 期限日はその日いっぱい有効なので、日付の文字列同士を比較する。
 *
 * 基準日は**ローカル時刻**の「今日」。以前は UTC で比較していたため、日本時間の 0:00〜9:00 は
 * まだ前日と見なされ、期限切れの投稿が9時間ぶん長く表示されていた。
 */
export function isExpiredBoardPost(post: BoardPost, now: Date = new Date()): boolean {
  if (post.displayType !== "board") return false;
  if (!post.expiryDate) return false;
  return post.expiryDate < toLocalDateKey(now);
}

/** ストーリー（displayType: 'story'）が投稿から24時間を過ぎているか */
export function isExpiredStoryPost(post: BoardPost, now: Date = new Date()): boolean {
  if (post.displayType !== "story") return false;
  const posted = new Date(post.time).getTime();
  // 日時が壊れている行を消してしまわないよう、判定できないものは期限内として扱う
  if (Number.isNaN(posted)) return false;
  return now.getTime() - posted >= STORY_LIFETIME_MS;
}

/**
 * 会員の画面にまだ出ているか。
 * 運営画面で「掲載終了」を示すために使う。会員側の一覧の条件と必ず一致させること。
 *
 * - 掲示板: 掲載期限を過ぎたら消える
 * - ストーリー: 24時間で消える。ただし**リプライが付いていれば掲示板一覧に残り続ける**
 *   （会話が続いているものを時間で打ち切らないため）
 */
export function isBoardPostVisibleToMembers(post: BoardPost, now: Date = new Date()): boolean {
  if (post.isHidden || post.isDeleted) return false;
  if (post.displayType === "story") {
    if (!isExpiredStoryPost(post, now)) return true;
    return (post.replies?.length ?? 0) > 0;
  }
  return !isExpiredBoardPost(post, now);
}

/** 掲載が終わった理由。運営画面のバッジの出し分けに使う */
export function getBoardPostEndedReason(
  post: BoardPost,
  now: Date = new Date()
): "expired" | "storyFinished" | null {
  if (post.isHidden || post.isDeleted) return null;
  if (isBoardPostVisibleToMembers(post, now)) return null;
  return post.displayType === "story" ? "storyFinished" : "expired";
}
