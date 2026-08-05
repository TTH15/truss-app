import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { supabase, type Language } from '@truss/core';
import {
  filterParticipantsByName,
  getParticipantStatusRaw,
  getParticipantUserId,
  participantStatusKey,
  sortParticipantsByRegistration,
} from './participants';
import type { AdminEvent, AdminEventParticipant } from './types';

interface UseEventParticipantsOptions {
  language: Language;
  selectedEvent: AdminEvent | null;
  eventParticipants: { [eventId: number]: AdminEventParticipant[] };
  /** event_participants は登録時点の氏名しか持たないため、フリガナは会員情報から引く */
  furiganaByUserId: Map<string, string>;
}

/**
 * イベント詳細の参加者一覧。並び替え・名前での絞り込み・メール宛先の選択と、
 * 当日の出席／支払いチェックの保存をまとめて持つ。
 */
export function useEventParticipants({
  language,
  selectedEvent,
  eventParticipants,
  furiganaByUserId,
}: UseEventParticipantsOptions) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState('');
  /**
   * チェックした瞬間に見た目を変えるための、保存前の上書き。
   * 保存に失敗したら元の値へ戻す。
   */
  const [statusOverrides, setStatusOverrides] = useState<Record<string, { attended?: boolean; paid?: boolean }>>({});

  const participants = useMemo(() => {
    if (!selectedEvent) return [];
    return sortParticipantsByRegistration(eventParticipants[selectedEvent.id] || []);
  }, [selectedEvent, eventParticipants]);

  const filtered = useMemo(
    () => filterParticipantsByName(participants, filter, furiganaByUserId),
    [participants, filter, furiganaByUserId],
  );

  const ids = useMemo(
    () => participants.map((participant) => getParticipantUserId(participant)).filter(Boolean),
    [participants],
  );

  const allSelected = ids.length > 0 && ids.every((id) => selectedIds.has(id));

  const getStatus = (participant: AdminEventParticipant, field: 'attended' | 'paid') => {
    if (!selectedEvent) return false;
    const override = statusOverrides[participantStatusKey(selectedEvent.id, getParticipantUserId(participant))];
    if (override && override[field] !== undefined) return Boolean(override[field]);
    return getParticipantStatusRaw(participant, field);
  };

  const attendedCount = participants.filter((participant) => getStatus(participant, 'attended')).length;

  const setAllSelected = (checked: boolean) => {
    setSelectedIds(checked ? new Set(ids) : new Set());
  };

  const toggleSelected = (userId: string, checked: boolean) => {
    if (!userId) return;
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(userId);
      else next.delete(userId);
      return next;
    });
  };

  const clearSelection = () => setSelectedIds(new Set());

  const changeStatus = async (
    participant: AdminEventParticipant,
    field: 'attended' | 'paid',
    checked: boolean,
  ) => {
    if (!selectedEvent) return;
    const userId = getParticipantUserId(participant);
    if (!userId) {
      toast.error(language === 'ja' ? '参加者IDが取得できないため更新できません' : 'Cannot update participant without id');
      return;
    }
    const key = participantStatusKey(selectedEvent.id, userId);
    const previous = getStatus(participant, field);
    setStatusOverrides((prev) => ({ ...prev, [key]: { ...(prev[key] || {}), [field]: checked } }));

    const { error } = await supabase
      .from('event_participants')
      .update((field === 'attended' ? { attended: checked } : { paid: checked }) as never)
      .eq('event_id', selectedEvent.id)
      .eq('user_id', userId);

    if (error) {
      setStatusOverrides((prev) => ({ ...prev, [key]: { ...(prev[key] || {}), [field]: previous } }));
      toast.error(language === 'ja' ? '参加者ステータスの更新に失敗しました' : 'Failed to update participant status');
    }
  };

  return {
    participants,
    filtered,
    count: participants.length,
    attendedCount,
    filter,
    setFilter,
    selectedIds,
    allSelected,
    setAllSelected,
    toggleSelected,
    clearSelection,
    getStatus,
    changeStatus,
    furiganaByUserId,
  };
}

export type EventParticipants = ReturnType<typeof useEventParticipants>;
