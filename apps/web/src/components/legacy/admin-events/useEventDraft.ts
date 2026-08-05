import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import type { Language } from '@truss/core';
import type { AdminEvent, EventFormValues } from './types';

// タブ切り替えや画面遷移でフォームがアンマウントされても編集内容を復元できるようにするための一時保存キー
const EVENT_DRAFT_STORAGE_KEY = 'truss-admin-event-draft-v1';
/** 入力が落ち着いてから書き込むまでの待ち時間 */
const SAVE_DEBOUNCE_MS = 400;

interface EventDraft {
  mode: 'create' | 'edit';
  eventId?: AdminEvent['id'];
  date?: string | null;
  formData?: EventFormValues;
}

interface UseEventDraftOptions {
  language: Language;
  values: EventFormValues;
  isFormOpen: boolean;
  /** 保存時に、いま何を編集しているかを記録する */
  editingEvent: AdminEvent | null;
  isEditMode: boolean;
  selectedDate: string | null;
  /** 編集中の下書きを復元するには、対象イベントが読み込まれている必要がある */
  events: AdminEvent[];
  /** 復元できたときに呼ぶ。画面側の状態（開くフォーム・比較の基準）を整えてもらう */
  onRestore: (draft: { formData: EventFormValues; date: string | null; target: AdminEvent | null }) => void;
}

export function clearEventDraft() {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(EVENT_DRAFT_STORAGE_KEY);
  } catch {
    // ストレージが使用できない環境では何もしない
  }
}

/**
 * イベントフォームの下書きを localStorage に退避する。
 * 運営はタブを行き来しながら作業するため、フォームを開いたまま画面を離れても入力が消えないようにする。
 */
export function useEventDraft({
  language,
  values,
  isFormOpen,
  editingEvent,
  isEditMode,
  selectedDate,
  events,
  onRestore,
}: UseEventDraftOptions) {
  const restoredRef = useRef(false);

  // 再マウント時に一度だけ復元する
  useEffect(() => {
    if (restoredRef.current) return;
    if (typeof window === 'undefined') return;

    let raw: string | null = null;
    try {
      raw = window.localStorage.getItem(EVENT_DRAFT_STORAGE_KEY);
    } catch {
      restoredRef.current = true;
      return;
    }
    if (!raw) {
      restoredRef.current = true;
      return;
    }

    let draft: EventDraft | null = null;
    try {
      draft = JSON.parse(raw);
    } catch {
      draft = null;
    }
    if (!draft || !draft.formData) {
      restoredRef.current = true;
      clearEventDraft();
      return;
    }

    if (draft.mode === 'edit') {
      // 編集対象のイベントが一覧に読み込まれるまで待つ
      if (events.length === 0) return;
      const target = events.find((ev) => String(ev.id) === String(draft.eventId));
      if (!target) {
        restoredRef.current = true;
        clearEventDraft();
        return;
      }
      onRestore({ formData: draft.formData, date: null, target });
    } else {
      onRestore({ formData: draft.formData, date: draft.date ?? null, target: null });
    }
    restoredRef.current = true;
    toast.success(language === 'ja' ? '編集中だった内容を復元しました' : 'Restored your unsaved draft');
    // onRestore は呼び出し側で毎回作られる関数。依存に入れると復元のたびに再実行されてしまう。
    // 実行は restoredRef で一度きりに制限しているため、意図的に外している
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events, language]);

  // フォームを開いている間、入力内容を一定間隔で退避する
  useEffect(() => {
    if (typeof window === 'undefined') return;
    // 復元前に書き込むと、復元されるはずだった下書きを空のフォームで上書きしてしまう
    if (!restoredRef.current) return;
    if (!isFormOpen) return;

    const timer = window.setTimeout(() => {
      const draft: EventDraft =
        isEditMode && editingEvent
          ? { mode: 'edit', eventId: editingEvent.id, formData: values }
          : { mode: 'create', date: selectedDate, formData: values };
      try {
        window.localStorage.setItem(EVENT_DRAFT_STORAGE_KEY, JSON.stringify(draft));
      } catch {
        // ストレージ容量超過などは無視する
      }
    }, SAVE_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [values, isFormOpen, isEditMode, editingEvent, selectedDate]);
}
