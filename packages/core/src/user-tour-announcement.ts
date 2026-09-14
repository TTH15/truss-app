import type { Language } from './types/app';

export interface UserTourAnnouncement {
  title: Record<Language, string>;
  description: Record<Language, string>;
  linkLabel: Record<Language, string>;
  linkUrl: string;
}

export const DEFAULT_USER_TOUR_ANNOUNCEMENT: UserTourAnnouncement = {
  title: { ja: 'LINE グループ', en: 'Line Group 「Truss LINE 2026-2027」' },
  description: {
    ja: 'イベントの案内やお知らせは LINE のグループでも配信しています。よければ参加してください。',
    en: 'By joining this group chat you can receive updates about new event information! Please join!',
  },
  linkLabel: { ja: 'LINE グループに参加する', en: 'Join the LINE group' },
  linkUrl: 'https://line.me/ti/g/H9QeX-kwRJ',
};

export const USER_TOUR_ANNOUNCEMENT_LIMITS = {
  title: 120,
  description: 1000,
  linkLabel: 80,
  linkUrl: 2048,
} as const;

export function normalizeUserTourAnnouncement(input: UserTourAnnouncement): UserTourAnnouncement {
  return {
    title: { ja: input.title.ja.trim(), en: input.title.en.trim() },
    description: { ja: input.description.ja.trim(), en: input.description.en.trim() },
    linkLabel: { ja: input.linkLabel.ja.trim(), en: input.linkLabel.en.trim() },
    linkUrl: input.linkUrl.trim(),
  };
}

/** 表示・保存の両方で検証する。案内文は HTML として扱わない。 */
export function validateUserTourAnnouncement(input: UserTourAnnouncement): 'required' | 'too-long' | 'invalid-url' | null {
  for (const field of ['title', 'description', 'linkLabel'] as const) {
    for (const language of ['ja', 'en'] as const) {
      if (!input[field][language].trim()) return 'required';
      if (input[field][language].length > USER_TOUR_ANNOUNCEMENT_LIMITS[field]) return 'too-long';
    }
  }
  if (!input.linkUrl.trim()) return 'required';
  if (input.linkUrl.length > USER_TOUR_ANNOUNCEMENT_LIMITS.linkUrl) return 'too-long';
  try {
    const url = new URL(input.linkUrl);
    if (!input.linkUrl.startsWith('https://') || /\s/.test(input.linkUrl) || url.protocol !== 'https:' || url.username || url.password) {
      return 'invalid-url';
    }
  } catch {
    return 'invalid-url';
  }
  return null;
}
