import { useState, useEffect, useRef, useMemo } from 'react';
import { Button } from '../ui/button';
import { X, Save } from 'lucide-react';
import { toast } from 'sonner';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrashCan } from '@fortawesome/free-solid-svg-icons';
import type { Language } from '@truss/core';
import { BulkEmailModal } from './BulkEmailModal';
import { useData } from '../../contexts/DataContext';
import { supabase, queryEventViewCount } from '@truss/core';
import { adminEventsTranslations } from './admin-events/translations';
import {
  eventToFormValues,
  getEmptyEventForm,
  getEventText,
  importedEventToFormValues,
  toCreatePayload,
  toUpdatePayload,
} from './admin-events/event-form';
import { EventFormModal } from './admin-events/EventFormModal';
import { ImageEditorModal } from './admin-events/ImageEditorModal';
import { EventCalendar } from './admin-events/EventCalendar';
import { EventDetailModal } from './admin-events/EventDetailModal';
import { ConfirmDialog } from './admin-events/ConfirmDialog';
import { clearEventDraft, useEventDraft } from './admin-events/useEventDraft';
import { useEventParticipants } from './admin-events/useEventParticipants';
import { useCalendarMonth } from './admin-events/useCalendarMonth';
import { useEventImageEditor } from './admin-events/useEventImageEditor';
import type { AdminEvent, AdminEventFormData, AdminEventParticipant, EventFormValues } from './admin-events/types';

interface AdminEventsProps {
  language: Language;
  events?: AdminEvent[];
  eventParticipants?: { [eventId: number]: AdminEventParticipant[] };
  onCreateEvent?: (eventData: AdminEventFormData) => Promise<void>;
  onUpdateEvent?: (eventId: number, eventData: AdminEventFormData) => Promise<void>;
  onDeleteEvent?: (eventId: number) => Promise<void>;
  onSendBulkEmail?: (userIds: string[], subjectJa: string, subjectEn: string, messageJa: string, messageEn: string, sendInApp: boolean, sendEmail: boolean, pushCategory?: 'event' | 'announcement') => void;
  /** チャットのメンション等、外部から特定イベントの詳細を開きたい場合に指定する */
  focusEventId?: number;
  onFocusEventHandled?: () => void;
}


export function AdminEvents({
  language,
  events: propsEvents = [],
  eventParticipants = {},
  onCreateEvent = async () => { },
  onUpdateEvent = async () => { },
  onDeleteEvent = async () => { },
  onSendBulkEmail,
  focusEventId,
  onFocusEventHandled,
}: AdminEventsProps) {
  const t = adminEventsTranslations[language];
  const calendar = useCalendarMonth(propsEvents, language);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<AdminEvent | null>(null);
  const [showNewEventForm, setShowNewEventForm] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isSavingEvent, setIsSavingEvent] = useState(false);
  const [isDeletingEvent, setIsDeletingEvent] = useState(false);
  const [isImportingEvent, setIsImportingEvent] = useState(false);
  const saveInFlightRef = useRef(false);
  const [confirmType, setConfirmType] = useState<'create' | 'update'>('create');
  // event_participants は登録時点の氏名しか持たないため、フリガナは会員情報から引く
  const { approvedMembers } = useData();
  const furiganaByUserId = useMemo(() => {
    const map = new Map<string, string>();
    approvedMembers.forEach((member) => {
      if (member.furigana?.trim()) map.set(member.id, member.furigana.trim());
    });
    return map;
  }, [approvedMembers]);
  // 参加者一覧（並び替え・絞り込み・宛先の選択・当日の出席/支払いの保存）
  const participants = useEventParticipants({
    language,
    selectedEvent,
    eventParticipants,
    furiganaByUserId,
  });

  const [initialEventSnapshot, setInitialEventSnapshot] = useState('');

  useEffect(() => {
    if (!focusEventId) return;
    const target = propsEvents.find((event) => event.id === focusEventId);
    if (!target) return;
    // 外部（チャットのメンション等）から渡されるfocusEventIdの変化に応じて詳細を開き、
    // 親に処理済みを通知する必要があり、event handler化が難しいのでeffect内setStateを許可する
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelectedEvent(target);
    setEditMode(false);
    onFocusEventHandled?.();
  }, [focusEventId, propsEvents, onFocusEventHandled]);


  // 新規・編集フォームの入力値（変換や保存用ペイロードの組み立ては ./admin-events/event-form に集約）
  const [newEvent, setNewEvent] = useState<EventFormValues>(getEmptyEventForm());

  // 画像のプレビュー・モザイク加工・アップロード（キャンバス操作と履歴は hook 側が持つ）
  const imageEditor = useEventImageEditor({
    language,
    uploadKey: selectedEvent?.id,
    onSaved: (url) => setNewEvent((prev) => ({ ...prev, image: url })),
    onRemoved: () => setNewEvent((prev) => ({ ...prev, image: null })),
  });

  const handleAddEvent = (day: number) => {
    const dateStr = calendar.dateKeyOf(day);
    setSelectedDate(dateStr);
    const nextEvent = { ...newEvent, date: dateStr };
    setNewEvent(nextEvent);
    setInitialEventSnapshot(JSON.stringify(nextEvent));
    setShowNewEventForm(true);
    setSelectedEvent(null);
  };

  // ドロップした日に、モーダル無しで即時作成する（LINEグループ招待リンク以外を流用）
  const handleCreateImportedEventToDate = async (sourceEvent: AdminEvent, day: number) => {
    if (!onCreateEvent) return;
    if (isImportingEvent) return;
    try {
      const dateStr = calendar.dateKeyOf(day);
      // 同じ日付にドロップした場合は複製せずキャンセル
      if (typeof sourceEvent?.date === 'string' && sourceEvent.date === dateStr) {
        return;
      }
      setIsImportingEvent(true);
      // LINEグループ招待リンクだけは引き継がない（importedEventToFormValues で空にしている）
      await onCreateEvent(toCreatePayload(importedEventToFormValues(sourceEvent, dateStr)));
      toast.success(language === 'ja' ? 'イベントを作成しました（インポート）' : 'Event created (import)');
    } catch (error) {
      console.error('Import create failed:', error);
      toast.error(language === 'ja' ? 'インポート作成に失敗しました。' : 'Failed to create imported event.');
    } finally {
      setIsImportingEvent(false);
    }
  };

  const handleEventClick = (event: AdminEvent) => {
    setSelectedEvent(event);
    const nextEvent = eventToFormValues(event);
    setNewEvent(nextEvent);
    setInitialEventSnapshot(JSON.stringify(nextEvent));
    // まず詳細表示を開き、参加者一覧・いいね数を確認できるようにする
    setEditMode(false);
    participants.clearSelection();
    setShowNewEventForm(false);
    if (!event?.image) {
      void (async () => {
        const { data, error } = await supabase
          .from('events')
          .select('image,event_color,event_icon')
          .eq('id', event.id)
          .maybeSingle();
        if (error) return;
        setNewEvent((prev) => ({
          ...prev,
          image: data?.image || prev.image,
          eventColor: data?.event_color || prev.eventColor,
          eventIconKey: (data?.event_icon as string) || prev.eventIconKey,
        }));
      })();
    }
  };

  // インサイト用のユニーク閲覧数。詳細を開いたときに1回だけ数える（一覧では取らない）。
  // イベントIDごとに持つので、別のイベントを開いても前の値が混ざらない
  const [viewCountByEventId, setViewCountByEventId] = useState<Record<number, number>>({});
  useEffect(() => {
    const eventId = selectedEvent?.id;
    if (!eventId) return;
    let cancelled = false;
    queryEventViewCount(eventId)
      .then((count) => {
        if (!cancelled) setViewCountByEventId((prev) => ({ ...prev, [eventId]: count }));
      })
      .catch(() => { /* 未適用・権限なし等。インサイトは出さないだけ */ });
    return () => { cancelled = true; };
  }, [selectedEvent?.id]);
  const selectedEventViewCount = selectedEvent ? viewCountByEventId[selectedEvent.id] ?? null : null;

  const selectedEventShareUrl = useMemo(() => {
    if (!selectedEvent?.shareToken || typeof window === 'undefined') return null;
    return `${window.location.origin}/event/${selectedEvent.shareToken}`;
  }, [selectedEvent]);
  const handleShareEventLink = async () => {
    if (!selectedEventShareUrl || !selectedEvent) return;
    const shareTitle = getEventText(selectedEvent, 'title', language === 'ja' ? 'ja' : 'en')
      || (language === 'ja' ? 'イベント共有' : 'Event share');
    try {
      if (navigator.share) {
        await navigator.share({
          title: shareTitle,
          text: language === 'ja' ? 'イベントリンクを共有します' : 'Sharing event link',
          url: selectedEventShareUrl,
        });
        return;
      }
      await navigator.clipboard.writeText(selectedEventShareUrl);
      toast.success(language === 'ja' ? '共有リンクをコピーしました' : 'Copied share link');
    } catch {
      // no-op (share dialog canceled etc.)
    }
  };

  const handleCloseForm = () => {
    setShowNewEventForm(false);
    setSelectedEvent(null);
    setEditMode(false);
    setNewEvent(getEmptyEventForm());
    setInitialEventSnapshot('');
    clearEventDraft();
  };

  const handleSaveEvent = () => {
    if (isSavingEvent || imageEditor.isProcessing) return;
    setConfirmType('create');
    setShowSaveConfirm(true);
  };

  const handleEditEvent = () => {
    if (!selectedEvent) return;
    setEditMode(true);
    const nextEvent = eventToFormValues(selectedEvent);
    setNewEvent(nextEvent);
    setInitialEventSnapshot(JSON.stringify(nextEvent));
  };

  const handleSaveEditedEvent = () => {
    if (isSavingEvent || imageEditor.isProcessing) return;
    setConfirmType('update');
    setShowSaveConfirm(true);
  };

  const handleDeleteEvent = () => {
    setShowDeleteConfirm(true);
  };

  const handleConfirmSave = async () => {
    if (isSavingEvent || imageEditor.isProcessing || saveInFlightRef.current) return;
    saveInFlightRef.current = true;
    setIsSavingEvent(true);
    try {
      if (confirmType === 'create') {
        await onCreateEvent(toCreatePayload(newEvent));
        toast.success(language === 'ja' ? 'イベントを作成しました' : 'Event created successfully');
      } else {
        if (selectedEvent) {
          await onUpdateEvent(selectedEvent.id, toUpdatePayload(newEvent));
        }
        toast.success(language === 'ja' ? 'イベントを更新しました' : 'Event updated successfully');
        setEditMode(false);
      }
      setShowSaveConfirm(false);
      handleCloseForm();
    } finally {
      saveInFlightRef.current = false;
      setIsSavingEvent(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!selectedEvent || isDeletingEvent) return;
    setIsDeletingEvent(true);
    try {
      console.log('Deleting event:', selectedEvent.id);
      await onDeleteEvent(selectedEvent.id);
      toast.success(language === 'ja' ? 'イベントを削除しました' : 'Event deleted successfully');
      setShowDeleteConfirm(false);
      handleCloseForm();
    } catch (error) {
      console.error('Delete event failed:', error);
      toast.error(language === 'ja' ? 'イベント削除に失敗しました。時間をおいて再試行してください。' : 'Failed to delete event. Please try again.');
    } finally {
      setIsDeletingEvent(false);
    }
  };

  const hasUnsavedChanges = useMemo(() => {
    if (!initialEventSnapshot) return false;
    return JSON.stringify(newEvent) !== initialEventSnapshot;
  }, [newEvent, initialEventSnapshot]);

  useEventDraft({
    language,
    values: newEvent,
    isFormOpen: showNewEventForm || (Boolean(selectedEvent) && editMode),
    editingEvent: selectedEvent,
    isEditMode: editMode,
    selectedDate,
    events: propsEvents,
    onRestore: ({ formData, date, target }) => {
      if (target) {
        setSelectedEvent(target);
        setEditMode(true);
        setShowNewEventForm(false);
        // 未保存かどうかは「保存済みの内容」との比較で判定するため、下書きではなく元のイベントを基準にする
        setInitialEventSnapshot(JSON.stringify(eventToFormValues(target)));
      } else {
        setSelectedDate(date);
        setShowNewEventForm(true);
        setSelectedEvent(null);
        setEditMode(false);
        setInitialEventSnapshot(JSON.stringify(getEmptyEventForm(date || '')));
      }
      setNewEvent(formData);
    },
  });

  // ブラウザタブを閉じる・再読み込みする場合にも未保存の変更を警告する
  useEffect(() => {
    if (!hasUnsavedChanges) return;
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  return (
    <div className="space-y-6">
      <EventCalendar
        language={language}
        calendar={calendar}
        onAddEvent={handleAddEvent}
        onEventClick={handleEventClick}
        onDropEvent={(source, day) => void handleCreateImportedEventToDate(source, day)}
      />

      {/* 新規イベント作成フォーム */}
      {showNewEventForm && (
        <EventFormModal
          mode="create"
          language={language}
          t={t}
          values={newEvent}
          onChange={setNewEvent}
          onOpenImageEditor={(source) => imageEditor.open(source, 'preview')}
          onSelectImageFile={imageEditor.handleFileSelect}
          onClose={handleCloseForm}
          onSave={handleSaveEvent}
        />
      )}

      {selectedEvent && !editMode && (
        <EventDetailModal
          language={language}
          t={t}
          event={selectedEvent}
          participants={participants}
          viewCount={selectedEventViewCount}
          shareUrl={selectedEventShareUrl}
          onShare={() => void handleShareEventLink()}
          onEdit={handleEditEvent}
          onClose={handleCloseForm}
          onSendEmail={() => {
            if (participants.selectedIds.size === 0) {
              toast.error(language === 'ja' ? 'メール送信先を選択してください' : 'Please select recipients');
              return;
            }
            setShowEmailModal(true);
          }}
        />
      )}

      {/* イベント編集フォーム */}
      {selectedEvent && editMode && (
        <EventFormModal
          mode="edit"
          language={language}
          t={t}
          values={newEvent}
          onChange={setNewEvent}
          onOpenImageEditor={(source) => imageEditor.open(source, 'preview')}
          onSelectImageFile={imageEditor.handleFileSelect}
          onClose={handleCloseForm}
          onSave={handleSaveEditedEvent}
          onDelete={handleDeleteEvent}
          saveDisabled={!hasUnsavedChanges || isSavingEvent || imageEditor.isProcessing}
        />
      )}

      {/* メール送信モダル */}
      {showEmailModal && selectedEvent && (
        <BulkEmailModal
          isOpen={showEmailModal}
          onClose={() => {
            setShowEmailModal(false);
            participants.clearSelection(); // 閉じたら選択をクリア
          }}
          language={language}
          recipientCount={participants.selectedIds.size}
          onSend={(subjectJa, subjectEn, messageJa, messageEn, sendInApp, sendEmail) => {
            const selectedUserIds = Array.from(participants.selectedIds);
            if (onSendBulkEmail && selectedUserIds.length > 0) {
              // イベント参加者への案内なので、受信設定は「イベント」で絞る
              onSendBulkEmail(selectedUserIds, subjectJa, subjectEn, messageJa, messageEn, sendInApp, sendEmail, 'event');
            }
            participants.clearSelection(); // 送信後も選択をクリア
          }}
        />
      )}

      <ImageEditorModal language={language} editor={imageEditor} />

      {showSaveConfirm && (
        <ConfirmDialog
          title={confirmType === 'create' ? t.confirmCreate : t.confirmUpdate}
          description={confirmType === 'create' ? t.confirmCreateMessage : t.confirmUpdateMessage}
          onClose={() => {
            if (isSavingEvent) return; // 保存中は閉じない（背景クリックを含む）
            setShowSaveConfirm(false);
          }}
        >
          <div className="flex gap-2">
            <Button
              disabled={isSavingEvent || imageEditor.isProcessing}
              onClick={() => void handleConfirmSave()}
              className="flex-1 bg-[#00A63E] hover:bg-[#008C35] text-[#F5F1E8] h-9 flex items-center justify-center gap-2"
            >
              <Save className="w-4 h-4" />
              <span className="font-medium text-sm tracking-[-0.1504px]">{t.save}</span>
            </Button>
            <Button
              disabled={isSavingEvent}
              onClick={() => setShowSaveConfirm(false)}
              className="flex-1 bg-[#D4183D] hover:bg-[#B01432] text-white h-9 flex items-center justify-center gap-2"
            >
              <X className="w-4 h-4" />
              <span className="font-medium text-sm tracking-[-0.1504px]">{t.cancel}</span>
            </Button>
          </div>
        </ConfirmDialog>
      )}

      {showDeleteConfirm && (
        <ConfirmDialog
          title={t.confirmDelete}
          description={t.confirmDeleteMessage}
          onClose={() => {
            if (isDeletingEvent) return;
            setShowDeleteConfirm(false);
          }}
          dismissOnBackdrop
        >
          <div className="flex justify-end">
            <Button
              disabled={isDeletingEvent}
              onClick={handleConfirmDelete}
              className="min-w-28 bg-[#D4183D] hover:bg-[#B01535] text-white h-9 flex items-center justify-center gap-2"
            >
              <FontAwesomeIcon icon={faTrashCan} className="w-4 h-4" />
              <span className="font-medium text-sm tracking-[-0.1504px]">{t.delete}</span>
            </Button>
          </div>
        </ConfirmDialog>
      )}
    </div>
  );
}
