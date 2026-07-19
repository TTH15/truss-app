/**
 * チャット関連のタイムスタンプ表示ロジック(Web/モバイル共通)
 */

/** 表示言語。アプリ側の同名型と互換の文字列リテラル("ja" | "en") */
export type Language = "ja" | "en";

const WEEKDAYS_JA = ["日", "月", "火", "水", "木", "金", "土"];
const WEEKDAYS_EN = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const pad2 = (n: number) => String(n).padStart(2, "0");

/** 楽観的更新時は `HH:MM` 形式の文字列が渡ってくるため、その場合は本日の時刻として解釈する */
export function parseMessageDate(raw: string): Date {
  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) return parsed;
  const hm = raw.match(/^(\d{1,2}):(\d{2})$/);
  if (hm) {
    const now = new Date();
    now.setHours(Number(hm[1]), Number(hm[2]), 0, 0);
    return now;
  }
  return new Date();
}

function diffCalendarDays(date: Date): number {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfTarget = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  return Math.round((startOfToday.getTime() - startOfTarget.getTime()) / 86400000);
}

export const toDateKey = (date: Date) =>
  `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;

/** 会話画面の日付区切り用ラベル(今日/昨日/月日+曜日/年月日+曜日) */
export function formatDateLabel(date: Date, language: Language): string {
  const diffDays = diffCalendarDays(date);
  if (diffDays === 0) return language === "ja" ? "今日" : "Today";
  if (diffDays === 1) return language === "ja" ? "昨日" : "Yesterday";
  const weekdays = language === "ja" ? WEEKDAYS_JA : WEEKDAYS_EN;
  const weekday = weekdays[date.getDay()];
  const now = new Date();
  if (date.getFullYear() < now.getFullYear()) {
    return language === "ja"
      ? `${date.getFullYear()}年${pad2(date.getMonth() + 1)}月${pad2(date.getDate())}日 ${weekday}`
      : `${date.getFullYear()}/${pad2(date.getMonth() + 1)}/${pad2(date.getDate())} ${weekday}`;
  }
  return `${pad2(date.getMonth() + 1)}/${pad2(date.getDate())} ${weekday}`;
}

/** 会話内の個別メッセージ用(同日グループ内に表示するため常に時刻) */
export function formatMessageTime(raw: string): string {
  const parsed = parseMessageDate(raw);
  return `${pad2(parsed.getHours())}:${pad2(parsed.getMinutes())}`;
}

/**
 * LINE 風のスレッド一覧プレビュー用フォーマット。
 * 当日: 時刻 / 昨日: "昨日" / 直近7日: 曜日 / それ以前: 日付
 */
export function formatRelativeListTime(raw: string, language: Language): string {
  const date = parseMessageDate(raw);
  const diffDays = diffCalendarDays(date);
  if (diffDays === 0) return formatMessageTime(raw);
  if (diffDays === 1) return language === "ja" ? "昨日" : "Yesterday";
  if (diffDays < 7) {
    const weekdays = language === "ja" ? WEEKDAYS_JA : WEEKDAYS_EN;
    return weekdays[date.getDay()];
  }
  const now = new Date();
  if (date.getFullYear() < now.getFullYear()) {
    return language === "ja"
      ? `${date.getFullYear()}年${pad2(date.getMonth() + 1)}月${pad2(date.getDate())}日`
      : `${date.getFullYear()}/${pad2(date.getMonth() + 1)}/${pad2(date.getDate())}`;
  }
  return language === "ja"
    ? `${pad2(date.getMonth() + 1)}月${pad2(date.getDate())}日`
    : `${pad2(date.getMonth() + 1)}/${pad2(date.getDate())}`;
}

/** "2026-07-09"のようなハイフン区切りの日付を"2026年7月9日"表記に変換する */
export function formatIsoDateJa(dateStr: string): string {
  const match = dateStr.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (!match) return dateStr;
  const [, y, m, d] = match;
  return `${y}年${Number(m)}月${Number(d)}日`;
}
