/**
 * 電話番号の正規化・検証
 *
 * DB(users.phone)にはハイフンなしの数字のみで統一して保存する。
 * 入力時はハイフン・空白・全角数字を許容し、保存直前に normalizePhone を通す。
 */

/** ハイフン・空白・括弧等の区切りを除去し、全角数字を半角化する（+ は保持） */
export function normalizePhone(value: string): string {
  return value
    .replace(/[０-９＋]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xfee0))
    .replace(/[^0-9+]/g, "");
}

/** 正規化後に数字8〜15桁（先頭 + 許容）であれば有効 */
export function isValidPhone(value: string): boolean {
  return /^\+?\d{8,15}$/.test(normalizePhone(value));
}
