import type { Event as DomainEvent, EventParticipant as DomainEventParticipant } from '@truss/core';

// Supabaseの生データはドメイン型に無い snake_case フィールドを含むことがあるため許容しておく
export type AdminEvent = DomainEvent & { event_icon?: string };

export type AdminEventParticipant = DomainEventParticipant & {
  id?: string;
  user_id?: string;
  is_attended?: boolean;
  is_paid?: boolean;
};

/** 親（AdminPage）へ渡す作成・更新データ。ドメイン型と完全一致しないため緩く受ける */
export type AdminEventFormData = Record<string, unknown>;

/**
 * イベント作成・編集フォームが保持する値。
 * DBの型（数値・null）ではなく入力欄がそのまま扱える文字列で持ち、保存時に変換する。
 */
export interface EventFormValues {
  titleJa: string;
  titleEn: string;
  descriptionJa: string;
  descriptionEn: string;
  date: string;
  startTime: string;
  endTime: string;
  location: string;
  locationEn: string;
  googleMapUrl: string;
  participationFee: string;
  maxParticipants: string;
  lineGroupUrl: string;
  image: string | null;
  eventColor: string;
  eventIconKey: string;
}
