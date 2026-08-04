import { DEFAULT_EVENT_ICON_KEY } from '@truss/core';
import type { AdminEvent, EventFormValues } from './types';

export const DEFAULT_EVENT_COLOR = '#49B1E4';

export const EVENT_COLORS = ['#49B1E4', '#4285F4', '#34A853', '#FBBC04', '#EA4335', '#A142F4'];

/**
 * イベントの多言語テキストを取り出す。
 * 日本語は「専用列 → 共通列」、英語は「専用列 → 共通列 → 日本語列」の順で最初に見つかった非空文字列を返す。
 */
export function getEventText(
  event: AdminEvent,
  key: 'title' | 'description' | 'location',
  locale: 'ja' | 'en',
): string {
  const jaKeyMap = {
    title: ['titleJa', 'title'],
    description: ['descriptionJa', 'description'],
    location: ['locationJa', 'location'],
  } as const;
  const enKeyMap = {
    title: ['titleEn', 'title'],
    description: ['descriptionEn', 'description', 'descriptionJa'],
    location: ['locationEn', 'location'],
  } as const;
  const keys = locale === 'ja' ? jaKeyMap[key] : enKeyMap[key];
  for (const candidate of keys) {
    const value = event?.[candidate];
    if (typeof value === 'string' && value.trim().length > 0) return value;
  }
  return '';
}

/** `startTime`/`endTime` が無い古いデータでは `time`（"10:00〜12:00" 等）を分解して補う */
export function parseEventTime(event: AdminEvent): { startTime: string; endTime: string } {
  if (event?.startTime || event?.endTime) {
    return {
      startTime: event.startTime || '',
      endTime: event.endTime || '',
    };
  }
  const raw = typeof event?.time === 'string' ? event.time : '';
  if (!raw) return { startTime: '', endTime: '' };
  const parts = raw.split(/[〜~\-]/).map((p: string) => p.trim());
  return {
    startTime: parts[0] || '',
    endTime: parts[1] || '',
  };
}

export function getEmptyEventForm(date: string = ''): EventFormValues {
  return {
    titleJa: '',
    titleEn: '',
    descriptionJa: '',
    descriptionEn: '',
    date,
    startTime: '',
    endTime: '',
    location: '',
    locationEn: '',
    googleMapUrl: '',
    participationFee: '0',
    maxParticipants: '',
    lineGroupUrl: '',
    image: null,
    eventColor: DEFAULT_EVENT_COLOR,
    eventIconKey: DEFAULT_EVENT_ICON_KEY,
  };
}

/** 既存イベントを編集フォームの値に変換する（詳細を開く・編集する・下書きを復元するのいずれからも使う） */
export function eventToFormValues(event: AdminEvent): EventFormValues {
  const { startTime, endTime } = parseEventTime(event);
  return {
    titleJa: getEventText(event, 'title', 'ja'),
    titleEn: getEventText(event, 'title', 'en'),
    descriptionJa: getEventText(event, 'description', 'ja'),
    descriptionEn: getEventText(event, 'description', 'en'),
    date: event?.date || '',
    startTime,
    endTime,
    location: getEventText(event, 'location', 'ja'),
    locationEn: getEventText(event, 'location', 'en'),
    googleMapUrl: event?.googleMapUrl || '',
    participationFee: String(event?.participationFee ?? 0),
    maxParticipants: String(event?.maxParticipants || ''),
    lineGroupUrl: event?.lineGroupLink || event?.lineGroupUrl || '',
    image: event?.image || null,
    eventColor: event?.eventColor || DEFAULT_EVENT_COLOR,
    eventIconKey: event?.eventIconKey || event?.event_icon || DEFAULT_EVENT_ICON_KEY,
  };
}

/**
 * 既存イベントを別の日付へ複製するときのフォーム値。
 * LINEグループ招待リンクだけは日付ごとに別物なので引き継がない。
 */
export function importedEventToFormValues(source: AdminEvent, date: string): EventFormValues {
  return { ...eventToFormValues(source), date, lineGroupUrl: '' };
}

/** フォームの共通部分（作成・更新で同じ列） */
function toBasePayload(values: EventFormValues) {
  return {
    title: values.titleJa,
    titleEn: values.titleEn || undefined,
    description: values.descriptionJa,
    descriptionEn: values.descriptionEn || undefined,
    date: values.date,
    time: `${values.startTime}〜${values.endTime}`,
    location: values.location,
    locationEn: values.locationEn || undefined,
    googleMapUrl: values.googleMapUrl || undefined,
    participationFee: Math.max(0, parseInt(values.participationFee || '0', 10) || 0),
    maxParticipants: parseInt(values.maxParticipants, 10) || 30,
    image: values.image || undefined,
    eventColor: values.eventColor || DEFAULT_EVENT_COLOR,
    eventIconKey: values.eventIconKey || DEFAULT_EVENT_ICON_KEY,
    lineGroupLink: values.lineGroupUrl || undefined,
  };
}

export function toCreatePayload(values: EventFormValues) {
  return {
    ...toBasePayload(values),
    tags: { friendsCanMeet: false, photoContest: false },
    status: 'upcoming' as const,
  };
}

export function toUpdatePayload(values: EventFormValues) {
  return toBasePayload(values);
}
