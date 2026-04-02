import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import {
  faCalendarDays,
  faPersonWalking,
  faComments,
  faVolleyball,
  faUtensils,
  faSeedling,
  faHammer,
  faChampagneGlasses,
  faFilm,
  faPlane,
  faFire,
  faMusic,
  faGamepad,
  faGraduationCap,
  faUsers,
  faMountainSun,
  faStar,
} from '@fortawesome/free-solid-svg-icons';

export const DEFAULT_EVENT_ICON_KEY = 'calendar';

export type EventIconKey = (typeof EVENT_ICON_OPTIONS)[number]['key'];

export const EVENT_ICON_OPTIONS = [
  { key: 'calendar', icon: faCalendarDays, labelJa: 'カレンダー', labelEn: 'Calendar' },
  { key: 'personWalking', icon: faPersonWalking, labelJa: 'ウォーキング', labelEn: 'Walking' },
  { key: 'comments', icon: faComments, labelJa: 'トーク', labelEn: 'Chat' },
  { key: 'volleyball', icon: faVolleyball, labelJa: 'バレー', labelEn: 'Volleyball' },
  { key: 'utensils', icon: faUtensils, labelJa: '食事', labelEn: 'Food' },
  { key: 'sakura', icon: faSeedling, labelJa: '桜', labelEn: 'Sakura' },
  { key: 'mochi', icon: faHammer, labelJa: '餅つき', labelEn: 'Mochi' },
  { key: 'party', icon: faChampagneGlasses, labelJa: 'パーティ', labelEn: 'Party' },
  { key: 'film', icon: faFilm, labelJa: '映画', labelEn: 'Movie' },
  { key: 'travel', icon: faPlane, labelJa: '旅行', labelEn: 'Travel' },
  { key: 'takoyaki', icon: faFire, labelJa: 'たこ焼き', labelEn: 'Takoyaki' },
  { key: 'music', icon: faMusic, labelJa: '音楽', labelEn: 'Music' },
  { key: 'gamepad', icon: faGamepad, labelJa: 'ゲーム', labelEn: 'Games' },
  { key: 'graduation', icon: faGraduationCap, labelJa: '学び', labelEn: 'Study' },
  { key: 'users', icon: faUsers, labelJa: '交流', labelEn: 'Meetup' },
  { key: 'outdoor', icon: faMountainSun, labelJa: 'アウトドア', labelEn: 'Outdoor' },
  { key: 'star', icon: faStar, labelJa: 'おすすめ', labelEn: 'Featured' },
] as const;

const ICON_MAP: Record<string, IconDefinition> = Object.fromEntries(
  EVENT_ICON_OPTIONS.map((o) => [o.key, o.icon])
);

export function getEventIconDefinition(key: string | undefined | null): IconDefinition {
  if (!key) return EVENT_ICON_OPTIONS[0].icon;
  return ICON_MAP[key] ?? EVENT_ICON_OPTIONS[0].icon;
}

export function normalizeEventIconKey(key: string | undefined | null): EventIconKey {
  if (key && ICON_MAP[key]) return key as EventIconKey;
  return DEFAULT_EVENT_ICON_KEY;
}
