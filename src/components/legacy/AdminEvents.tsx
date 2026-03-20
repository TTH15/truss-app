import { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Checkbox } from '../ui/checkbox';
import { Plus, X, Upload, Calendar as CalendarIcon, Clock, MapPin, Users, Mail, Edit2, Languages, Save, Trash2, Heart } from 'lucide-react';
import { toast } from 'sonner';
import type { Language } from '../../domain/types/app';
import imgEventSample from '@/assets/c4e8899bf782af1b6b9889d032b63d8a0c141f8b.png';
import { BulkEmailModal } from './BulkEmailModal';
import { translateText } from '../../utils/translate';

type AdminEvent = any;
type AdminEventParticipant = any;

interface AdminEventsProps {
  language: Language;
  events?: AdminEvent[];
  eventParticipants?: { [eventId: number]: AdminEventParticipant[] };
  onCreateEvent?: (eventData: any) => void;
  onUpdateEvent?: (eventId: number, eventData: any) => void;
  onDeleteEvent?: (eventId: number) => void;
  onSendBulkEmail?: (userIds: string[], subjectJa: string, subjectEn: string, messageJa: string, messageEn: string, sendInApp: boolean, sendEmail: boolean) => void;
}

const translations = {
  ja: {
    title: 'イベント管理',
    eventManagement: 'イベント管理',
    albumAdd: 'アルバム追加',
    month: '月',
    newEvent: '新規イベント作成',
    editEvent: 'イベント編集',
    eventName: 'イベント名',
    eventNamePlaceholderJa: '日本語',
    eventNamePlaceholderEn: 'English',
    description: '説明',
    descriptionPlaceholderJa: '日本語',
    descriptionPlaceholderEn: 'English',
    lineGroupLink: 'LINEグループ招待リンク',
    lineGroupPlaceholder: 'https://line.me/ti/g/...',
    lineGroupNote: '参加者がイベント登録後にLINEグループに参加できるリンクを入力してください',
    eventImage: 'イベント画像',
    upload: 'アップロード',
    imageNote: 'PNG, JPG, GIF（最大10MB）',
    date: '日付',
    time: '時間',
    locationName: '場所名',
    locationNamePlaceholderJa: '日本語の場所名',
    locationNamePlaceholderEn: '英語の場所名',
    googleMapUrl: 'Google Map URL',
    googleMapUrlPlaceholder: 'https://maps.google.com/...',
    maxParticipants: '最大参加者数',
    save: '保存',
    cancel: 'キャンセル',
    deleteEvent: 'イベント削除',
    delete: '削除',
    autoTranslate: '自動翻訳',
    participants: '参加者',
    participantsList: '参加者一覧',
    nameFilter: '名前で検索',
    attended: '出席',
    paid: '支払い済み',
    sendBulkEmail: 'メールを一斉送信',
    selectForEmail: 'メール送信先として選択',
    edit: '編集',
    confirmCreate: 'イベントを作成しますか？',
    confirmCreateMessage: '新しいイベントが作成されます。',
    confirmUpdate: 'イベントを更新しますか？',
    confirmUpdateMessage: 'イベント情報が更新されます。',
    confirmDelete: '本当にこのイベントを削除しますか？',
    confirmDeleteMessage: 'この操作は取り消せません。',
    close: '閉じる',
  },
  en: {
    title: 'Event Management',
    eventManagement: 'Event Management',
    albumAdd: 'Add Album',
    month: 'Month',
    newEvent: 'Create New Event',
    editEvent: 'Edit Event',
    eventName: 'Event Name',
    eventNamePlaceholderJa: 'Japanese',
    eventNamePlaceholderEn: 'English',
    description: 'Description',
    descriptionPlaceholderJa: 'Japanese',
    descriptionPlaceholderEn: 'English',
    lineGroupLink: 'LINE Group Invitation Link',
    lineGroupPlaceholder: 'https://line.me/ti/g/...',
    lineGroupNote: 'Enter the LINE group link that participants can join after registering',
    eventImage: 'Event Image',
    upload: 'Upload',
    imageNote: 'PNG, JPG, GIF (max 10MB)',
    date: 'Date',
    time: 'Time',
    locationName: 'Location Name',
    locationNamePlaceholderJa: 'Location Name in Japanese',
    locationNamePlaceholderEn: 'Location Name in English',
    googleMapUrl: 'Google Map URL',
    googleMapUrlPlaceholder: 'https://maps.google.com/...',
    maxParticipants: 'Max Participants',
    save: 'Save',
    cancel: 'Cancel',
    deleteEvent: 'Delete Event',
    delete: 'Delete',
    autoTranslate: 'Auto Translate',
    participants: 'Participants',
    participantsList: 'Participants List',
    nameFilter: 'Filter by name',
    attended: 'Attended',
    paid: 'Paid',
    sendBulkEmail: 'Send Bulk Email',
    selectForEmail: 'Select for email',
    edit: 'Edit',
    confirmCreate: 'Create this event?',
    confirmCreateMessage: 'A new event will be created.',
    confirmUpdate: 'Update this event?',
    confirmUpdateMessage: 'Event information will be updated.',
    confirmDelete: 'Are you sure you want to delete this event?',
    confirmDeleteMessage: 'This action cannot be undone.',
    close: 'Close',
  }
};

// サンプルイベントデータ（モック）
const sampleEvents: AdminEvent[] = [
  {
    id: 1,
    titleJa: '国際料理大会',
    titleEn: 'International Cooking Contest',
    descriptionJa: '世界各国の料理を作って楽しみましょう！',
    descriptionEn: "Let's cook and enjoy dishes from around the world!",
    date: '2026-04-01',
    startTime: '13:00',
    endTime: '16:00',
    location: 'https://maps.google.com/?q=university+hall',
    maxParticipants: 50,
    currentParticipants: 35,
    lineGroupUrl: 'https://line.me/ti/g/cooking',
    participants: [],
  },
  {
    id: 2,
    titleJa: 'スポーツ大会',
    titleEn: 'Sports Day',
    descriptionJa: 'みんなでスポーツを楽しもう！',
    descriptionEn: "Let's enjoy sports together!",
    date: '2026-04-01',
    startTime: '10:00',
    endTime: '14:00',
    location: 'https://maps.google.com/?q=sports+field',
    maxParticipants: 60,
    currentParticipants: 45,
    participants: [],
  },
  {
    id: 3,
    titleJa: 'お花見大会',
    titleEn: 'Cherry Blossom Party',
    descriptionJa: '上野公園で花見を楽しみましょう！お花見団子やその他和食を準備しています！友達を誘ってお越しください！',
    descriptionEn: "Let's enjoy cherry blossoms at Ueno Park! We'll have dango and other Japanese food! Feel free to bring friends!",
    date: '2026-04-15',
    startTime: '13:00',
    endTime: '17:00',
    location: 'https://maps.google.com/?q=上野公園',
    maxParticipants: 50,
    currentParticipants: 50,
    image: imgEventSample,
    lineGroupUrl: 'https://line.me/ti/g/hanami',
    participants: [
      { id: '1', name: '田中太郎', email: 'Taro@gmail.com', attended: true, paid: true },
      { id: '2', name: '支払い済み', email: 'Taro@gmail.com', attended: false, paid: true },
      { id: '3', name: '田中次郎', email: 'Jiro@gmail.com', attended: true, paid: false },
      { id: '4', name: '佐藤花子', email: 'Hanako@koku-ac.jp', attended: true, paid: true },
    ],
  },
  {
    id: 4,
    titleJa: '言語交換カフェ',
    titleEn: 'Language Exchange Cafe',
    descriptionJa: 'カフェで言語交換を楽しもう！',
    descriptionEn: 'Enjoy language exchange at a cafe!',
    date: '2026-04-22',
    startTime: '15:00',
    endTime: '17:00',
    location: 'https://maps.google.com/?q=student+cafe',
    maxParticipants: 30,
    currentParticipants: 20,
    participants: [],
  },
  {
    id: 5,
    titleJa: 'ゲーム大会',
    titleEn: 'Game Tournament',
    descriptionJa: 'ボードゲームやビデオゲームで盛り上がろう！',
    descriptionEn: "Let's have fun with board games and video games!",
    date: '2026-04-29',
    startTime: '14:00',
    endTime: '18:00',
    location: 'https://maps.google.com/?q=student+lounge',
    maxParticipants: 40,
    currentParticipants: 25,
    participants: [],
  },
];

export function AdminEvents({
  language,
  events: propsEvents = [],
  eventParticipants = {},
  onCreateEvent = () => {},
  onUpdateEvent = () => {},
  onDeleteEvent = () => {},
  onSendBulkEmail,
}: AdminEventsProps) {
  const t = translations[language];
  const [currentMonth, setCurrentMonth] = useState(3); // 4月 = 3 (0-indexed)
  const [currentYear, setCurrentYear] = useState(2026);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<AdminEvent | null>(null);
  const [showNewEventForm, setShowNewEventForm] = useState(false);
  const [calendarCompact, setCalendarCompact] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [confirmType, setConfirmType] = useState<'create' | 'update'>('create');
  const [selectedParticipants, setSelectedParticipants] = useState<Set<string>>(new Set());
  
  // 新規イントフォーム用の状態
  const [newEvent, setNewEvent] = useState({
    titleJa: '',
    titleEn: '',
    descriptionJa: '',
    descriptionEn: '',
    date: '',
    startTime: '',
    endTime: '',
    location: '',
    locationEn: '',
    googleMapUrl: '',
    maxParticipants: '',
    lineGroupUrl: '',
    image: null as string | null,
  });

  // カレンダーの日付を生成
  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month, 1).getDay();
  };

  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDay = getFirstDayOfMonth(currentYear, currentMonth);
  const totalCells = Math.ceil((daysInMonth + firstDay) / 7) * 7;

  const calendarDays = Array.from({ length: totalCells }, (_, i) => {
    const dayNumber = i - firstDay + 1;
    if (dayNumber > 0 && dayNumber <= daysInMonth) {
      return dayNumber;
    }
    return null;
  });

  // 日付のイベントを取得
  const getEventsForDate = (day: number | null) => {
    if (!day) return [];
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return propsEvents.filter(event => event.date === dateStr);
  };

  const handleAddEvent = (day: number | null) => {
    if (!day) return;
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    setSelectedDate(dateStr);
    setNewEvent({ ...newEvent, date: dateStr });
    setShowNewEventForm(true);
    setSelectedEvent(null);
    setCalendarCompact(true);
  };

  const handleEventClick = (event: AdminEvent) => {
    setSelectedEvent(event);
    setShowNewEventForm(false);
    setCalendarCompact(true);
  };

  const handleCloseForm = () => {
    setShowNewEventForm(false);
    setSelectedEvent(null);
    setEditMode(false);
    setCalendarCompact(false);
    setNewEvent({
      titleJa: '',
      titleEn: '',
      descriptionJa: '',
      descriptionEn: '',
      date: '',
      startTime: '',
      endTime: '',
      location: '',
      locationEn: '',
      googleMapUrl: '',
      maxParticipants: '',
      lineGroupUrl: '',
      image: null,
    });
  };

  const handleSaveEvent = () => {
    setConfirmType('create');
    setShowSaveConfirm(true);
  };

  // 翻訳ボタンのハンドラー
  const handleTranslate = async (field: 'title' | 'description') => {
    const sourceField = field === 'title' ? 'titleJa' : 'descriptionJa';
    const targetField = field === 'title' ? 'titleEn' : 'descriptionEn';
    const sourceText = newEvent[sourceField];
    
    if (!sourceText.trim()) {
      toast.error(language === 'ja' ? '翻訳する内容を入力してください' : 'Please enter text to translate');
      return;
    }

    toast.loading(language === 'ja' ? '翻訳中...' : 'Translating...');
    
    try {
      const translatedText = await translateText(sourceText, 'en');
      
      if (translatedText) {
        setNewEvent({
          ...newEvent,
          [targetField]: translatedText,
        });
        toast.dismiss();
        toast.success(language === 'ja' ? '翻訳が完了しました' : 'Translation completed');
      }
    } catch (error) {
      toast.dismiss();
      toast.error(language === 'ja' ? '翻訳に失敗しました' : 'Translation failed');
    }
  };

  const handleEditEvent = () => {
    if (!selectedEvent) return;
    setEditMode(true);
    setNewEvent({
      titleJa: selectedEvent.titleJa || '',
      titleEn: selectedEvent.titleEn || '',
      descriptionJa: selectedEvent.descriptionJa || '',
      descriptionEn: selectedEvent.descriptionEn || '',
      date: selectedEvent.date || '',
      startTime: selectedEvent.startTime || '',
      endTime: selectedEvent.endTime || '',
      location: selectedEvent.location || '',
      locationEn: selectedEvent.locationEn || '',
      googleMapUrl: selectedEvent.googleMapUrl || '',
      maxParticipants: String(selectedEvent.maxParticipants || ''),
      lineGroupUrl: selectedEvent.lineGroupUrl || '',
      image: selectedEvent.image || null,
    });
  };

  const handleSaveEditedEvent = () => {
    setConfirmType('update');
    setShowSaveConfirm(true);
  };

  const handleDeleteEvent = () => {
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = async () => {
    if (selectedEvent) {
      console.log('Deleting event:', selectedEvent.id);
      await onDeleteEvent(selectedEvent.id);
      toast.success(language === 'ja' ? 'イベントを削除しました' : 'Event deleted successfully');
    }
    setShowDeleteConfirm(false);
    handleCloseForm();
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewEvent({ ...newEvent, image: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const toggleAttended = (participantId: string) => {
    if (!selectedEvent) return;
    const updatedEvents = propsEvents.map(event => {
      if (event.id === selectedEvent.id) {
        return {
          ...event,
          participants: event.participants.map(p =>
            p.id === participantId ? { ...p, attended: !p.attended } : p
          )
        };
      }
      return event;
    });
    const updatedEvent = updatedEvents.find(e => e.id === selectedEvent.id);
    if (updatedEvent) setSelectedEvent(updatedEvent);
  };

  const togglePaid = (participantId: string) => {
    if (!selectedEvent) return;
    const updatedEvents = propsEvents.map(event => {
      if (event.id === selectedEvent.id) {
        return {
          ...event,
          participants: event.participants.map(p =>
            p.id === participantId ? { ...p, paid: !p.paid } : p
          )
        };
      }
      return event;
    });
    const updatedEvent = updatedEvents.find(e => e.id === selectedEvent.id);
    if (updatedEvent) setSelectedEvent(updatedEvent);
  };

  const monthNames = language === 'ja' 
    ? ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月']
    : ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  const dayNames = language === 'ja'
    ? ['日', '月', '火', '水', '木', '金', '土']
    : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // 前月・次月への移動
  const handlePreviousMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  return (
    <div className="space-y-6">
      {/* カレンダー */}
      <div className="bg-white rounded-[14px] border border-[rgba(61,61,78,0.15)] p-6 pb-8">
        {/* 月表示とナビゲーション */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={handlePreviousMonth}
            className="text-[#3D3D4E] hover:text-[#49B1E4] transition-colors p-1 hover:bg-[#F5F1E8] rounded"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          
          <h3 className="text-[#3D3D4E] text-base font-semibold">
            {currentYear}{language === 'ja' ? '年' : ''} {monthNames[currentMonth]}
          </h3>
          
          <button
            onClick={handleNextMonth}
            className="text-[#3D3D4E] hover:text-[#49B1E4] transition-colors p-1 hover:bg-[#F5F1E8] rounded"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* カレンダーグリッド */}
        <div className={`transition-all duration-300 overflow-hidden ${calendarCompact ? 'max-h-[240px]' : 'max-h-[680px]'}`}>
          <div className="grid grid-cols-7 gap-px bg-[#E5E7EB] border border-[#E5E7EB] overflow-hidden">
            {/* 曜日ヘッダー */}
            {dayNames.map((day, index) => (
              <div key={`day-${index}`} className="bg-[#F9FAFB] p-2 text-center">
                <span className="text-[#6B6B7A] text-xs font-medium">{day}</span>
              </div>
            ))}

            {/* 日付セル */}
            {calendarDays.map((day, index) => {
              const dayEvents = getEventsForDate(day);
              return (
                <div
                  key={`cell-${index}`}
                  className={`bg-white p-2 flex flex-col relative transition-all duration-300 overflow-hidden ${
                    calendarCompact ? 'h-[40px]' : 'h-[120px]'
                  }`}
                >
                  {day && (
                    <>
                      {/* 日付番号 */}
                      <div className={`text-[#3D3D4E] font-medium ${calendarCompact ? 'text-xs mb-0' : 'text-sm mb-2'}`}>{day}</div>
                      
                      {/* イベント表示 */}
                      {!calendarCompact && dayEvents.map((event) => {
                        // 定員に達したイベントは黄緑枠で表示
                        const isFull = event.currentParticipants >= event.maxParticipants;
                        
                        if (isFull) {
                          return (
                            <button
                              key={event.id}
                              onClick={() => handleEventClick(event)}
                              className="mb-0.5 text-left w-full"
                            >
                              <div className="bg-white text-[#00A63E] rounded border-2 border-[#00A63E] truncate hover:bg-[#f0fdf4] transition-colors font-medium leading-tight text-[9px] px-1.5 py-0">
                                {language === 'ja' ? event.title : (event.titleEn || event.title)}
                              </div>
                            </button>
                          );
                        }
                        // その他のイベントは青枠で表示
                        return (
                          <button
                            key={event.id}
                            onClick={() => handleEventClick(event)}
                            className="mb-0.5 text-left w-full"
                          >
                            <div className="bg-[#49B1E4] text-white rounded border-2 border-[#193CB8] truncate hover:bg-[#3A9FD3] transition-colors font-medium leading-tight text-[9px] px-1.5 py-0">
                              {language === 'ja' ? event.title : (event.titleEn || event.title)}
                            </div>
                          </button>
                        );
                      })}
                      
                      {/* コンパクト時のイベント表示 */}
                      {calendarCompact && dayEvents.length > 0 && (
                        <div className="flex gap-0.5 items-center mt-0.5">
                          {dayEvents.slice(0, 3).map((event) => {
                            const isFull = event.currentParticipants >= event.maxParticipants;
                            return (
                              <button
                                key={event.id}
                                onClick={() => handleEventClick(event)}
                                className="shrink-0"
                              >
                                <div className={`w-1.5 h-1.5 rounded-full ${
                                  isFull ? 'bg-[#00A63E]' : 'bg-[#49B1E4]'
                                }`} />
                              </button>
                            );
                          })}
                          {dayEvents.length > 3 && (
                            <span className="text-[8px] text-[#6B6B7A]">+{dayEvents.length - 3}</span>
                          )}
                        </div>
                      )}
                      
                      {/* プラスボタン（コンパクト時は非表示） */}
                      {!calendarCompact && (
                        <button
                          onClick={() => handleAddEvent(day)}
                          className="mt-auto mx-auto"
                        >
                          <Plus className="w-8 h-8 text-[#49B1E4] hover:text-[#3A9FD3] transition-colors" strokeWidth={3} />
                        </button>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 新規イベント作成フォーム */}
      {showNewEventForm && (
        <div className="bg-white rounded-[14px] border border-[rgba(61,61,78,0.15)] p-6 relative">
          {/* 閉じるボタン */}
          <button
            onClick={handleCloseForm}
            className="absolute top-4 right-4 text-[#3D3D4E] hover:text-[#1a1a24] transition-colors opacity-70"
          >
            <X className="w-4 h-4" />
          </button>

          <h3 className="text-[#3D3D4E] text-lg font-semibold tracking-[-0.4395px] mb-6">{t.newEvent}</h3>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 左側 */}
            <div className="space-y-4">
              {/* イベント名 */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[#3D3D4E] text-sm font-medium tracking-[-0.1504px]">
                    {t.eventName}
                  </label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleTranslate('title')}
                    disabled={!newEvent.titleJa?.trim()}
                    className="bg-[#F5F1E8] border-[rgba(61,61,78,0.15)] text-[#3D3D4E] hover:bg-[#E8E4DB] h-7 text-xs"
                  >
                    <Languages className="w-3 h-3 mr-1" />
                    {t.autoTranslate}
                  </Button>
                </div>
                <Input
                  value={newEvent.titleJa}
                  onChange={(e) => setNewEvent({ ...newEvent, titleJa: e.target.value })}
                  placeholder={t.eventNamePlaceholderJa}
                  className="bg-[#EEEBE3] border-0 mb-2"
                />
                <Input
                  value={newEvent.titleEn}
                  onChange={(e) => setNewEvent({ ...newEvent, titleEn: e.target.value })}
                  placeholder={t.eventNamePlaceholderEn}
                  className="bg-[#EEEBE3] border-0"
                />
              </div>

              {/* 説明 */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[#3D3D4E] text-sm font-medium tracking-[-0.1504px]">
                    {t.description}
                  </label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleTranslate('description')}
                    disabled={!newEvent.descriptionJa?.trim()}
                    className="bg-[#F5F1E8] border-[rgba(61,61,78,0.15)] text-[#3D3D4E] hover:bg-[#E8E4DB] h-7 text-xs"
                  >
                    <Languages className="w-3 h-3 mr-1" />
                    {t.autoTranslate}
                  </Button>
                </div>
                <Textarea
                  value={newEvent.descriptionJa}
                  onChange={(e) => setNewEvent({ ...newEvent, descriptionJa: e.target.value })}
                  placeholder={t.descriptionPlaceholderJa}
                  className="bg-[#EEEBE3] border-0 mb-2 min-h-[64px]"
                />
                <Textarea
                  value={newEvent.descriptionEn}
                  onChange={(e) => setNewEvent({ ...newEvent, descriptionEn: e.target.value })}
                  placeholder={t.descriptionPlaceholderEn}
                  className="bg-[#EEEBE3] border-0 min-h-[64px]"
                />
              </div>

              {/* LINEグループ招待リンク */}
              <div>
                <label className="text-[#3D3D4E] text-sm font-medium tracking-[-0.1504px] block mb-2">
                  {t.lineGroupLink}
                </label>
                <Input
                  value={newEvent.lineGroupUrl}
                  onChange={(e) => setNewEvent({ ...newEvent, lineGroupUrl: e.target.value })}
                  placeholder={t.lineGroupPlaceholder}
                  className="bg-[#EEEBE3] border-0"
                />
                <p className="text-[#6A7282] text-xs mt-2">{t.lineGroupNote}</p>
              </div>

              {/* 最大参加者数 */}
              <div>
                <label className="text-[#3D3D4E] text-sm font-medium tracking-[-0.1504px] block mb-2">
                  {t.maxParticipants}
                </label>
                <Input
                  type="number"
                  value={newEvent.maxParticipants}
                  onChange={(e) => setNewEvent({ ...newEvent, maxParticipants: e.target.value })}
                  className="bg-[#EEEBE3] border-0 w-24"
                />
              </div>
            </div>

            {/* 右側 */}
            <div className="space-y-4">
              {/* イベント画像 */}
              <div>
                <label className="text-[#3D3D4E] text-sm font-medium tracking-[-0.1504px] block mb-2">
                  {t.eventImage}
                </label>
                <div className="bg-[#F5F1E8] border border-[rgba(61,61,78,0.15)] rounded-[8px] h-[126px] flex items-center justify-center relative overflow-hidden group">
                  {newEvent.image ? (
                    <>
                      <img src={newEvent.image} alt="Event" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                        <label className="cursor-pointer flex flex-col items-center bg-white/90 hover:bg-white px-4 py-2 rounded-lg transition-colors">
                          <Upload className="w-4 h-4 text-[#3D3D4E] mb-1" />
                          <span className="text-[#3D3D4E] text-xs font-medium">{t.upload}</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleImageUpload}
                            className="hidden"
                          />
                        </label>
                        <button
                          type="button"
                          onClick={() => setNewEvent({ ...newEvent, image: '' })}
                          className="flex flex-col items-center bg-red-500/90 hover:bg-red-500 px-4 py-2 rounded-lg transition-colors"
                        >
                          <X className="w-4 h-4 text-white mb-1" />
                          <span className="text-white text-xs font-medium">
                            {language === 'ja' ? '削除' : 'Remove'}
                          </span>
                        </button>
                      </div>
                    </>
                  ) : (
                    <label className="cursor-pointer flex flex-col items-center">
                      <Upload className="w-4 h-4 text-[#3D3D4E] mb-1" />
                      <span className="text-[#3D3D4E] text-sm font-medium">{t.upload}</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
                <p className="text-[#6A7282] text-xs mt-2">{t.imageNote}</p>
              </div>

              {/* 日付・時間 */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[#3D3D4E] text-sm font-medium tracking-[-0.1504px] block mb-2">
                    {t.date}
                  </label>
                  <Input
                    type="date"
                    value={newEvent.date}
                    onChange={(e) => setNewEvent({ ...newEvent, date: e.target.value })}
                    className="bg-[#EEEBE3] border-0"
                  />
                </div>
                <div>
                  <label className="text-[#3D3D4E] text-sm font-medium tracking-[-0.1504px] block mb-2">
                    {t.time}
                  </label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="time"
                      value={newEvent.startTime}
                      onChange={(e) => setNewEvent({ ...newEvent, startTime: e.target.value })}
                      className="bg-[#EEEBE3] border-0 text-sm"
                    />
                    <span className="text-[#6B6B7A] text-sm">〜</span>
                    <Input
                      type="time"
                      value={newEvent.endTime}
                      onChange={(e) => setNewEvent({ ...newEvent, endTime: e.target.value })}
                      className="bg-[#EEEBE3] border-0 text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Google Map URL */}
              <div>
                <label className="text-[#3D3D4E] text-sm font-medium tracking-[-0.1504px] block mb-2">
                  {t.googleMapUrl}
                </label>
                <Input
                  value={newEvent.googleMapUrl}
                  onChange={(e) => setNewEvent({ ...newEvent, googleMapUrl: e.target.value })}
                  placeholder={t.googleMapUrlPlaceholder}
                  className="bg-[#EEEBE3] border-0"
                />
              </div>

              {/* 場所名 */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[#3D3D4E] text-sm font-medium tracking-[-0.1504px]">
                    {t.locationName}
                  </label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      if (!newEvent.location?.trim()) {
                        toast.error(language === 'ja' ? '翻訳する内容を入力してください' : 'Please enter text to translate');
                        return;
                      }
                      toast.loading(language === 'ja' ? '翻訳中...' : 'Translating...');
                      try {
                        const translatedText = await translateText(newEvent.location, 'en');
                        if (translatedText) {
                          setNewEvent({ ...newEvent, locationEn: translatedText });
                          toast.dismiss();
                          toast.success(language === 'ja' ? '翻訳が完了しました' : 'Translation completed');
                        }
                      } catch (error) {
                        toast.dismiss();
                        toast.error(language === 'ja' ? '翻訳に失敗しました' : 'Translation failed');
                      }
                    }}
                    disabled={!newEvent.location?.trim()}
                    className="bg-[#F5F1E8] border-[rgba(61,61,78,0.15)] text-[#3D3D4E] hover:bg-[#E8E4DB] h-7 text-xs"
                  >
                    <Languages className="w-3 h-3 mr-1" />
                    {t.autoTranslate}
                  </Button>
                </div>
                <Input
                  value={newEvent.location}
                  onChange={(e) => setNewEvent({ ...newEvent, location: e.target.value })}
                  placeholder={t.locationNamePlaceholderJa}
                  className="bg-[#EEEBE3] border-0 mb-2"
                />
                <Input
                  value={newEvent.locationEn}
                  onChange={(e) => setNewEvent({ ...newEvent, locationEn: e.target.value })}
                  placeholder={t.locationNamePlaceholderEn}
                  className="bg-[#EEEBE3] border-0"
                />
              </div>
            </div>
          </div>

          {/* ボタン */}
          <div className="flex gap-3 pt-4 justify-center">
            <Button
              onClick={editMode ? handleSaveEditedEvent : handleSaveEvent}
              className="w-32 bg-[#00A63E] hover:bg-[#008C35] text-white"
            >
              {editMode ? t.save : t.save}
            </Button>
          </div>
        </div>
      )}

      {/* イベント詳細表示 */}
      {selectedEvent && !editMode && (
        <div className={`bg-white rounded-[14px] p-6 relative ${
          selectedEvent.currentParticipants >= selectedEvent.maxParticipants
            ? 'border-2 border-[#00A63E]'
            : 'border-2 border-[#49B1E4]'
        }`}>
          {/* 閉じるボタン */}
          <button
            onClick={handleCloseForm}
            className="absolute top-4 right-4 text-[#3D3D4E] hover:text-[#1a1a24] transition-colors opacity-70"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 左側：イベント情報 */}
            <div className="space-y-4">
              {/* タイトルと編集ボタン */}
              <div className="flex items-start justify-between">
                <h3 className="text-[#3D3D4E] text-lg font-semibold tracking-[-0.4395px]">
                  {language === 'ja' ? selectedEvent.titleJa : selectedEvent.titleEn}
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-[#3D3D4E] h-8"
                  onClick={handleEditEvent}
                >
                  <Edit2 className="w-4 h-4" />
                </Button>
              </div>

              {/* イベント画像 */}
              {selectedEvent.image && (
                <div className="rounded-[10px] overflow-hidden">
                  <img src={selectedEvent.image} alt={selectedEvent.titleJa} className="w-full h-auto" />
                </div>
              )}

              {/* 説明 */}
              <div className="bg-[#F9FAFB] rounded-lg p-4">
                <h4 className="text-[#3D3D4E] text-sm font-semibold mb-2">
                  {language === 'ja' ? 'イベント説明' : 'Event Description'}
                </h4>
                <p className="text-[#3D3D4E] text-sm leading-relaxed whitespace-pre-wrap">
                  {language === 'ja' 
                    ? (selectedEvent.descriptionJa || '説明文がありません') 
                    : (selectedEvent.descriptionEn || selectedEvent.descriptionJa || 'No description')}
                </p>
              </div>

              {/* イベント情報 */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-[#3D3D4E] text-sm">
                  <CalendarIcon className="w-4 h-4" />
                  <span>{selectedEvent.date}</span>
                </div>
                <div className="flex items-center gap-2 text-[#3D3D4E] text-sm">
                  <Clock className="w-4 h-4" />
                  <span>{selectedEvent.startTime}</span>
                </div>
                <div className="flex items-center gap-2 text-[#3D3D4E] text-sm">
                  <MapPin className="w-4 h-4" />
                  <span>{language === 'ja' ? (selectedEvent.location || '') : (selectedEvent.locationEn || selectedEvent.location || '')}</span>
                </div>
                {selectedEvent.googleMapUrl && (
                  <div className="flex items-center gap-2 text-[#3D3D4E] text-sm">
                    <a 
                      href={selectedEvent.googleMapUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-[#49B1E4] hover:underline flex items-center gap-1"
                    >
                      <MapPin className="w-4 h-4" />
                      <span>{language === 'ja' ? 'Google Map で開く' : 'Open in Google Maps'}</span>
                    </a>
                  </div>
                )}
                <div className="flex items-center gap-2 text-[#3D3D4E] text-sm">
                  <Users className="w-4 h-4" />
                  <span className={`font-semibold ${
                    selectedEvent.currentParticipants >= selectedEvent.maxParticipants
                      ? 'text-[#00A63E]'
                      : 'text-[#49B1E4]'
                  }`}>
                    {selectedEvent.currentParticipants} / {selectedEvent.maxParticipants}
                  </span>
                  <span>{language === 'ja' ? '参加者' : 'Participants'}</span>
                </div>
                {/* いいね数 */}
                <div className="flex items-center gap-2 text-[#3D3D4E] text-sm">
                  <Heart className="w-4 h-4 text-red-500" />
                  <span className="font-semibold text-red-500">
                    {selectedEvent.likes || 0}
                  </span>
                  <span>{language === 'ja' ? 'いいね' : 'Likes'}</span>
                </div>
              </div>
            </div>

            {/* 右側：参加者リスト */}
            <div className="space-y-4">
              {/* タイトルとメール送信ボタン */}
              <div className="flex items-center justify-between gap-4">
                <h4 className="text-[#3D3D4E] text-base font-semibold">{t.participantsList}</h4>
                <Button
                  size="icon"
                  className="bg-[#49B1E4] hover:bg-[#3A9FD3] text-white h-9 w-9"
                  onClick={() => {
                    if (selectedParticipants.size === 0) {
                      toast.error(language === 'ja' ? 'メール送信先を選択してください' : 'Please select recipients');
                      return;
                    }
                    setShowEmailModal(true);
                  }}
                  title={t.sendBulkEmail}
                >
                  <Mail className="w-4 h-4" />
                </Button>
              </div>
              
              {/* フィルター */}
              <Input
                placeholder={t.nameFilter}
                className="bg-[#EEEBE3] border-0"
              />

              {/* 参加者リスト */}
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {(eventParticipants[selectedEvent.id] || []).map((participant) => (
                  <div
                    key={participant.userId}
                    className="flex items-center gap-3 p-3 bg-[#F9FAFB] rounded-[8px]"
                  >
                    {/* 左側：メール送信先選択チェックボックス */}
                    <div className="flex items-center">
                      <Checkbox
                        checked={selectedParticipants.has(participant.userId)}
                        onCheckedChange={(checked) => {
                          const newSelected = new Set(selectedParticipants);
                          if (checked) {
                            newSelected.add(participant.userId);
                          } else {
                            newSelected.delete(participant.userId);
                          }
                          setSelectedParticipants(newSelected);
                        }}
                        title={t.selectForEmail}
                        className="border-[#49B1E4] data-[state=checked]:bg-[#49B1E4] data-[state=checked]:border-[#49B1E4]"
                      />
                    </div>

                    {/* 中央：参加者情報 */}
                    <div className="flex-1">
                      <p className="text-[#101828] text-sm font-medium">{participant.userName}</p>
                      <p className="text-[#4A5565] text-xs">{participant.userNickname}</p>
                      <p className="text-[#6B6B7A] text-xs">
                        {language === 'ja' ? '登録日時:' : 'Registered:'} {new Date(participant.registeredAt).toLocaleString(language === 'ja' ? 'ja-JP' : 'en-US')}
                      </p>
                      {participant.photoRefusal && (
                        <p className="text-[#D4183D] text-xs font-medium">
                          {language === 'ja' ? '写真撮影NG' : 'No photos please'}
                        </p>
                      )}
                    </div>

                    {/* 右側：出席・支払い済みチェックボックス */}
                    <div className="flex flex-col gap-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <Checkbox
                          checked={participant.attended || false}
                          onCheckedChange={() => {
                            // TODO: 出席状態を更新する処理を実装
                          }}
                          className="border-[#49B1E4] data-[state=checked]:bg-[#49B1E4] data-[state=checked]:border-[#49B1E4]"
                        />
                        <span className="text-[#3D3D4E] text-xs">{t.attended}</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <Checkbox
                          checked={participant.paid || false}
                          onCheckedChange={() => {
                            // TODO: 支払い状態を更新する処理を実装
                          }}
                          className="border-[#49B1E4] data-[state=checked]:bg-[#49B1E4] data-[state=checked]:border-[#49B1E4]"
                        />
                        <span className="text-[#3D3D4E] text-xs">{t.paid}</span>
                      </label>
                    </div>
                  </div>
                ))}
                {(!eventParticipants[selectedEvent.id] || eventParticipants[selectedEvent.id].length === 0) && (
                  <p className="text-[#6B6B7A] text-sm text-center py-4">
                    {language === 'ja' ? 'まだ参加者がいません' : 'No participants yet'}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* イベント編集フォーム */}
      {selectedEvent && editMode && (
        <div className="bg-white rounded-[14px] border border-[rgba(61,61,78,0.15)] p-6 relative">
          {/* 閉じるボタン */}
          <button
            onClick={handleCloseForm}
            className="absolute top-4 right-4 text-[#3D3D4E] hover:text-[#1a1a24] transition-colors opacity-70"
          >
            <X className="w-4 h-4" />
          </button>

          <h3 className="text-[#3D3D4E] text-lg font-semibold tracking-[-0.4395px] mb-6">{t.editEvent}</h3>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 左側 */}
            <div className="space-y-4">
              {/* イベント名 */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[#3D3D4E] text-sm font-medium tracking-[-0.1504px]">
                    {t.eventName}
                  </label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleTranslate('title')}
                    disabled={!newEvent.titleJa?.trim()}
                    className="bg-[#F5F1E8] border-[rgba(61,61,78,0.15)] text-[#3D3D4E] hover:bg-[#E8E4DB] h-7 text-xs"
                  >
                    <Languages className="w-3 h-3 mr-1" />
                    {t.autoTranslate}
                  </Button>
                </div>
                <Input
                  value={newEvent.titleJa}
                  onChange={(e) => setNewEvent({ ...newEvent, titleJa: e.target.value })}
                  placeholder={t.eventNamePlaceholderJa}
                  className="bg-[#EEEBE3] border-0 mb-2"
                />
                <Input
                  value={newEvent.titleEn}
                  onChange={(e) => setNewEvent({ ...newEvent, titleEn: e.target.value })}
                  placeholder={t.eventNamePlaceholderEn}
                  className="bg-[#EEEBE3] border-0"
                />
              </div>

              {/* 説明 */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[#3D3D4E] text-sm font-medium tracking-[-0.1504px]">
                    {t.description}
                  </label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleTranslate('description')}
                    disabled={!newEvent.descriptionJa?.trim()}
                    className="bg-[#F5F1E8] border-[rgba(61,61,78,0.15)] text-[#3D3D4E] hover:bg-[#E8E4DB] h-7 text-xs"
                  >
                    <Languages className="w-3 h-3 mr-1" />
                    {t.autoTranslate}
                  </Button>
                </div>
                <Textarea
                  value={newEvent.descriptionJa}
                  onChange={(e) => setNewEvent({ ...newEvent, descriptionJa: e.target.value })}
                  placeholder={t.descriptionPlaceholderJa}
                  className="bg-[#EEEBE3] border-0 mb-2 min-h-[64px]"
                />
                <Textarea
                  value={newEvent.descriptionEn}
                  onChange={(e) => setNewEvent({ ...newEvent, descriptionEn: e.target.value })}
                  placeholder={t.descriptionPlaceholderEn}
                  className="bg-[#EEEBE3] border-0 min-h-[64px]"
                />
              </div>

              {/* LINEグループ招待リンク */}
              <div>
                <label className="text-[#3D3D4E] text-sm font-medium tracking-[-0.1504px] block mb-2">
                  {t.lineGroupLink}
                </label>
                <Input
                  value={newEvent.lineGroupUrl}
                  onChange={(e) => setNewEvent({ ...newEvent, lineGroupUrl: e.target.value })}
                  placeholder={t.lineGroupPlaceholder}
                  className="bg-[#EEEBE3] border-0"
                />
                <p className="text-[#6A7282] text-xs mt-2">{t.lineGroupNote}</p>
              </div>

              {/* 最大参加者数 */}
              <div>
                <label className="text-[#3D3D4E] text-sm font-medium tracking-[-0.1504px] block mb-2">
                  {t.maxParticipants}
                </label>
                <Input
                  type="number"
                  value={newEvent.maxParticipants}
                  onChange={(e) => setNewEvent({ ...newEvent, maxParticipants: e.target.value })}
                  className="bg-[#EEEBE3] border-0 w-24"
                />
              </div>
            </div>

            {/* 右側 */}
            <div className="space-y-4">
              {/* イベント画像 */}
              <div>
                <label className="text-[#3D3D4E] text-sm font-medium tracking-[-0.1504px] block mb-2">
                  {t.eventImage}
                </label>
                <div className="bg-[#F5F1E8] border border-[rgba(61,61,78,0.15)] rounded-[8px] h-[126px] flex items-center justify-center relative overflow-hidden group">
                  {newEvent.image ? (
                    <>
                      <img src={newEvent.image} alt="Event" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                        <label className="cursor-pointer flex flex-col items-center bg-white/90 hover:bg-white px-4 py-2 rounded-lg transition-colors">
                          <Upload className="w-4 h-4 text-[#3D3D4E] mb-1" />
                          <span className="text-[#3D3D4E] text-xs font-medium">{t.upload}</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleImageUpload}
                            className="hidden"
                          />
                        </label>
                        <button
                          type="button"
                          onClick={() => setNewEvent({ ...newEvent, image: '' })}
                          className="flex flex-col items-center bg-red-500/90 hover:bg-red-500 px-4 py-2 rounded-lg transition-colors"
                        >
                          <X className="w-4 h-4 text-white mb-1" />
                          <span className="text-white text-xs font-medium">
                            {language === 'ja' ? '削除' : 'Remove'}
                          </span>
                        </button>
                      </div>
                    </>
                  ) : (
                    <label className="cursor-pointer flex flex-col items-center">
                      <Upload className="w-4 h-4 text-[#3D3D4E] mb-1" />
                      <span className="text-[#3D3D4E] text-sm font-medium">{t.upload}</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
                <p className="text-[#6A7282] text-xs mt-2">{t.imageNote}</p>
              </div>

              {/* 日付・時間 */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[#3D3D4E] text-sm font-medium tracking-[-0.1504px] block mb-2">
                    {t.date}
                  </label>
                  <Input
                    type="date"
                    value={newEvent.date}
                    onChange={(e) => setNewEvent({ ...newEvent, date: e.target.value })}
                    className="bg-[#EEEBE3] border-0"
                  />
                </div>
                <div>
                  <label className="text-[#3D3D4E] text-sm font-medium tracking-[-0.1504px] block mb-2">
                    {t.time}
                  </label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="time"
                      value={newEvent.startTime}
                      onChange={(e) => setNewEvent({ ...newEvent, startTime: e.target.value })}
                      className="bg-[#EEEBE3] border-0 text-sm"
                    />
                    <span className="text-[#6B6B7A] text-sm">〜</span>
                    <Input
                      type="time"
                      value={newEvent.endTime}
                      onChange={(e) => setNewEvent({ ...newEvent, endTime: e.target.value })}
                      className="bg-[#EEEBE3] border-0 text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Google Map URL */}
              <div>
                <label className="text-[#3D3D4E] text-sm font-medium tracking-[-0.1504px] block mb-2">
                  {t.googleMapUrl}
                </label>
                <Input
                  value={newEvent.googleMapUrl}
                  onChange={(e) => setNewEvent({ ...newEvent, googleMapUrl: e.target.value })}
                  placeholder={t.googleMapUrlPlaceholder}
                  className="bg-[#EEEBE3] border-0"
                />
              </div>

              {/* 場所名 */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[#3D3D4E] text-sm font-medium tracking-[-0.1504px]">
                    {t.locationName}
                  </label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      if (!newEvent.location?.trim()) {
                        toast.error(language === 'ja' ? '翻訳する内容を入力してください' : 'Please enter text to translate');
                        return;
                      }
                      toast.loading(language === 'ja' ? '翻訳中...' : 'Translating...');
                      try {
                        const translatedText = await translateText(newEvent.location, 'en');
                        if (translatedText) {
                          setNewEvent({ ...newEvent, locationEn: translatedText });
                          toast.dismiss();
                          toast.success(language === 'ja' ? '翻訳が完了しました' : 'Translation completed');
                        }
                      } catch (error) {
                        toast.dismiss();
                        toast.error(language === 'ja' ? '翻訳に失敗しました' : 'Translation failed');
                      }
                    }}
                    disabled={!newEvent.location?.trim()}
                    className="bg-[#F5F1E8] border-[rgba(61,61,78,0.15)] text-[#3D3D4E] hover:bg-[#E8E4DB] h-7 text-xs"
                  >
                    <Languages className="w-3 h-3 mr-1" />
                    {t.autoTranslate}
                  </Button>
                </div>
                <Input
                  value={newEvent.location}
                  onChange={(e) => setNewEvent({ ...newEvent, location: e.target.value })}
                  placeholder={t.locationNamePlaceholderJa}
                  className="bg-[#EEEBE3] border-0 mb-2"
                />
                <Input
                  value={newEvent.locationEn}
                  onChange={(e) => setNewEvent({ ...newEvent, locationEn: e.target.value })}
                  placeholder={t.locationNamePlaceholderEn}
                  className="bg-[#EEEBE3] border-0"
                />
              </div>
            </div>
          </div>

          {/* ボタン */}
          <div className="flex gap-2 mt-6">
            <Button
              onClick={handleSaveEditedEvent}
              className="flex-1 bg-[#00A63E] hover:bg-[#008C35] text-white"
            >
              {t.save}
            </Button>
            <Button
              onClick={handleDeleteEvent}
              className="flex-1 bg-[#D4183D] hover:bg-[#B01535] text-white"
            >
              {t.deleteEvent}
            </Button>
          </div>
        </div>
      )}

      {/* メール送信モダル */}
      {showEmailModal && selectedEvent && (
        <BulkEmailModal
          isOpen={showEmailModal}
          onClose={() => {
            setShowEmailModal(false);
            setSelectedParticipants(new Set()); // 閉じたら選択をクリア
          }}
          language={language}
          recipientCount={selectedParticipants.size}
          onSend={(subjectJa, subjectEn, messageJa, messageEn, sendInApp, sendEmail) => {
            // 選択した参加者のUserIDを配列に変換
            const selectedUserIds = Array.from(selectedParticipants);
            if (onSendBulkEmail && selectedUserIds.length > 0) {
              onSendBulkEmail(selectedUserIds, subjectJa, subjectEn, messageJa, messageEn, sendInApp, sendEmail);
            }
            setSelectedParticipants(new Set()); // 送信後選択をクリア
          }}
        />
      )}

      {/* 保存確認ダイアログ */}
      {showSaveConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[#F5F1E8] rounded-[10px] w-full max-w-[400px] shadow-xl border border-[rgba(61,61,78,0.15)] relative max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-[rgba(61,61,78,0.15)]">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <h2 className="text-[#3D3D4E] text-lg font-semibold tracking-[-0.4395px]">
                    {confirmType === 'create' ? t.confirmCreate : t.confirmUpdate}
                  </h2>
                  <p className="text-[#6B6B7A] text-sm tracking-[-0.1504px]">
                    {confirmType === 'create' ? t.confirmCreateMessage : t.confirmUpdateMessage}
                  </p>
                </div>
                <button
                  onClick={() => setShowSaveConfirm(false)}
                  className="text-[#3D3D4E] hover:text-[#1a1a24] transition-colors opacity-70"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="p-6">
              <div className="flex gap-2">
                <Button
                  onClick={async () => {
                    if (confirmType === 'create') {
                      // Supabaseにイベントを作成
                      const eventData = {
                        title: newEvent.titleJa,
                        titleEn: newEvent.titleEn || undefined,
                        description: newEvent.descriptionJa,
                        descriptionEn: newEvent.descriptionEn || undefined,
                        date: newEvent.date,
                        time: `${newEvent.startTime}〜${newEvent.endTime}`,
                        location: newEvent.location,
                        locationEn: newEvent.locationEn || undefined,
                        googleMapUrl: newEvent.googleMapUrl || undefined,
                        maxParticipants: parseInt(newEvent.maxParticipants) || 30,
                        image: newEvent.image || undefined,
                        tags: { friendsCanMeet: false, photoContest: false },
                        status: 'upcoming' as const,
                        lineGroupLink: newEvent.lineGroupUrl || undefined,
                      };
                      console.log('Creating event with data:', eventData);
                      await onCreateEvent(eventData);
                      toast.success(language === 'ja' ? 'イベントを作成しました' : 'Event created successfully');
                    } else {
                      // Supabaseでイベントを更新
                      if (selectedEvent) {
                        const updateData = {
                          title: newEvent.titleJa,
                          titleEn: newEvent.titleEn || undefined,
                          description: newEvent.descriptionJa,
                          descriptionEn: newEvent.descriptionEn || undefined,
                          date: newEvent.date,
                          time: `${newEvent.startTime}〜${newEvent.endTime}`,
                          location: newEvent.location,
                          locationEn: newEvent.locationEn || undefined,
                          googleMapUrl: newEvent.googleMapUrl || undefined,
                          maxParticipants: parseInt(newEvent.maxParticipants) || 30,
                          image: newEvent.image || undefined,
                          lineGroupLink: newEvent.lineGroupUrl || undefined,
                        };
                        console.log('Updating event with data:', updateData);
                        await onUpdateEvent(selectedEvent.id, updateData);
                      }
                      toast.success(language === 'ja' ? 'イベントを更新しました' : 'Event updated successfully');
                      setEditMode(false);
                    }
                    setShowSaveConfirm(false);
                    handleCloseForm();
                  }}
                  className="flex-1 bg-[#00A63E] hover:bg-[#008C35] text-[#F5F1E8] h-9 flex items-center justify-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  <span className="font-medium text-sm tracking-[-0.1504px]">{t.save}</span>
                </Button>
                <Button
                  onClick={() => setShowSaveConfirm(false)}
                  className="flex-1 bg-[#D4183D] hover:bg-[#B01432] text-white h-9 flex items-center justify-center gap-2"
                >
                  <X className="w-4 h-4" />
                  <span className="font-medium text-sm tracking-[-0.1504px]">{t.cancel}</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 削除確認ダイアログ */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[#F5F1E8] rounded-[10px] w-full max-w-[400px] shadow-xl border border-[rgba(61,61,78,0.15)] relative max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-[rgba(61,61,78,0.15)]">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <h2 className="text-[#3D3D4E] text-lg font-semibold tracking-[-0.4395px]">
                    {t.confirmDelete}
                  </h2>
                  <p className="text-[#6B6B7A] text-sm tracking-[-0.1504px]">
                    {t.confirmDeleteMessage}
                  </p>
                </div>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="text-[#3D3D4E] hover:text-[#1a1a24] transition-colors opacity-70"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="p-6">
              <div className="flex gap-2">
                <Button
                  onClick={handleConfirmDelete}
                  className="flex-1 bg-[#D4183D] hover:bg-[#B01535] text-white h-9 flex items-center justify-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  <span className="font-medium text-sm tracking-[-0.1504px]">{t.delete}</span>
                </Button>
                <Button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 bg-[#00A63E] hover:bg-[#008C35] text-[#F5F1E8] h-9 flex items-center justify-center gap-2"
                >
                  <X className="w-4 h-4" />
                  <span className="font-medium text-sm tracking-[-0.1504px]">{t.cancel}</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
