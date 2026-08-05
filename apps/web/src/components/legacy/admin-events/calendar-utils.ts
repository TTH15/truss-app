import type { Language } from '@truss/core';
import type { AdminEvent } from './types';

/** `2026-8-5` や ISO 文字列など表記の揺れを `2026-08-05` に揃える */
export function normalizeEventDateKey(raw: unknown): string {
  const text = String(raw ?? '').trim();
  if (!text) return '';
  const head = text.split('T')[0]?.replace(/\//g, '-');
  if (!head) return '';
  const m = head.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
  const d = new Date(text);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** カレンダーのセルとイベントの突き合わせに使う日付キー。month は 0 始まり */
export function toDateKey(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/**
 * 月のマス目。前後の空白は null で埋め、常に7の倍数になるようにする。
 */
export function buildCalendarDays(year: number, month: number): Array<number | null> {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();
  const totalCells = Math.ceil((daysInMonth + firstDay) / 7) * 7;
  return Array.from({ length: totalCells }, (_, i) => {
    const dayNumber = i - firstDay + 1;
    return dayNumber > 0 && dayNumber <= daysInMonth ? dayNumber : null;
  });
}

export function groupEventsByDate(events: AdminEvent[]): Map<string, AdminEvent[]> {
  const grouped = new Map<string, AdminEvent[]>();
  events.forEach((event) => {
    const key = normalizeEventDateKey(event?.date);
    if (!key) return;
    const existing = grouped.get(key);
    if (existing) existing.push(event);
    else grouped.set(key, [event]);
  });
  return grouped;
}

export function getMonthNames(language: Language): string[] {
  return language === 'ja'
    ? ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月']
    : ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
}

export function getDayNames(language: Language): string[] {
  return language === 'ja'
    ? ['日', '月', '火', '水', '木', '金', '土']
    : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
}
