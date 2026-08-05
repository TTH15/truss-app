import type { AdminEventParticipant } from './types';

/**
 * 参加者の識別子。取得経路によってドメイン型の `userId` だったり、
 * Supabase の生データの `user_id` / `id` だったりするので、いずれかから拾う。
 */
export function getParticipantUserId(participant: AdminEventParticipant): string {
  return String(participant?.userId ?? participant?.user_id ?? participant?.id ?? '');
}

/** 出席・支払いの保存値。こちらも camelCase と snake_case の両方を見る */
export function getParticipantStatusRaw(
  participant: AdminEventParticipant,
  field: 'attended' | 'paid',
): boolean {
  if (field === 'attended') return Boolean(participant?.attended ?? participant?.is_attended ?? false);
  return Boolean(participant?.paid ?? participant?.is_paid ?? false);
}

/** 登録が早い順。日時が壊れている行は後ろに送り、同着はIDで安定させる */
export function sortParticipantsByRegistration(rows: AdminEventParticipant[]): AdminEventParticipant[] {
  return [...rows].sort((a, b) => {
    const ta = new Date(String(a?.registeredAt ?? '')).getTime();
    const tb = new Date(String(b?.registeredAt ?? '')).getTime();
    if (Number.isNaN(ta) && Number.isNaN(tb)) {
      return getParticipantUserId(a).localeCompare(getParticipantUserId(b));
    }
    if (Number.isNaN(ta)) return 1;
    if (Number.isNaN(tb)) return -1;
    if (ta !== tb) return ta - tb;
    return getParticipantUserId(a).localeCompare(getParticipantUserId(b));
  });
}

/** 当日の受付用。氏名・ニックネーム・フリガナのどれかに一致すれば残す */
export function filterParticipantsByName(
  rows: AdminEventParticipant[],
  query: string,
  furiganaByUserId: Map<string, string>,
): AdminEventParticipant[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return rows;
  return rows.filter((participant) =>
    [participant.userName, participant.userNickname, furiganaByUserId.get(getParticipantUserId(participant))]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(needle)),
  );
}

/** 出席・支払いの変更をその場で反映するための一時キー（イベント×参加者） */
export function participantStatusKey(eventId: number, userId: string): string {
  return `${eventId}:${userId}`;
}
