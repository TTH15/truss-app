import type { Language } from '@truss/core';

/** 日付だけの値は、表示先のタイムゾーンで前日・翌日にずらさない。 */
export function formatDisplayDate(value: string | null | undefined, language: Language): string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return '-';
  const date = new Date(`${value}T12:00:00Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) return '-';

  return date.toLocaleDateString(language === 'ja' ? 'ja-JP' : 'en-US', {
    year: 'numeric',
    month: language === 'ja' ? 'long' : 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
}
