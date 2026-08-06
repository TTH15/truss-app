/**
 * `YYYY-MM-DD` を**実行環境のローカル時刻**で作る。
 *
 * `new Date().toISOString().split('T')[0]` は UTC の日付になるため、日本時間の 0:00〜9:00 は
 * 前日を指す。「今日」を扱う場面（掲載期限の判定、日付入力の下限など）でそれを使うと、
 * 深夜だけ一日ずれる。日付そのものを比べたいときは必ずこちらを使う。
 */
export function toLocalDateKey(date: Date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
