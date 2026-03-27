import { useState, useEffect, useRef, useMemo } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Checkbox } from '../ui/checkbox';
import { X, Calendar as CalendarIcon, Clock, MapPin, Users, Mail, Edit2, Languages, Save, Trash2, Heart, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrashCan, faUpload, faEye, faWandMagicSparkles, faFloppyDisk, faRotateLeft } from '@fortawesome/free-solid-svg-icons';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import type { Language } from '../../domain/types/app';
import imgEventSample from '@/assets/c4e8899bf782af1b6b9889d032b63d8a0c141f8b.png';
import { BulkEmailModal } from './BulkEmailModal';
import { translateText } from '../../utils/translate';
import { uploadEventImage } from '../../lib/supabase';
import { supabase } from '../../lib/supabase';
import { Calendar } from '../ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';

type AdminEvent = any;
type AdminEventParticipant = any;

interface AdminEventsProps {
  language: Language;
  events?: AdminEvent[];
  eventParticipants?: { [eventId: number]: AdminEventParticipant[] };
  onCreateEvent?: (eventData: any) => Promise<void>;
  onUpdateEvent?: (eventId: number, eventData: any) => Promise<void>;
  onDeleteEvent?: (eventId: number) => Promise<void>;
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
    deleteEvent: '削除',
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
  onCreateEvent = async () => { },
  onUpdateEvent = async () => { },
  onDeleteEvent = async () => { },
  onSendBulkEmail,
}: AdminEventsProps) {
  const t = translations[language];
  const [currentMonth, setCurrentMonth] = useState(() => new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(() => new Date().getFullYear());
  const [monthYearDisplayYear, setMonthYearDisplayYear] = useState(() => new Date().getFullYear());
  const currentMonthRef = useRef(currentMonth);
  const currentYearRef = useRef(currentYear);
  const lastMonthSwitchAtRef = useRef<number>(0);
  const calendarContainerRef = useRef<HTMLDivElement | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<AdminEvent | null>(null);
  const [showNewEventForm, setShowNewEventForm] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [imageEditorOpen, setImageEditorOpen] = useState(false);
  const [imageEditorMode, setImageEditorMode] = useState<'preview' | 'mosaic'>('preview');
  const [imageEditorSource, setImageEditorSource] = useState<string | null>(null);
  const [mosaicBrushSize, setMosaicBrushSize] = useState(20);
  const [isSavingEvent, setIsSavingEvent] = useState(false);
  const [isDeletingEvent, setIsDeletingEvent] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isImageProcessing, setIsImageProcessing] = useState(false);
  const imageCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef(false);
  const imageHistoryRef = useRef<ImageData[]>([]);
  const [canUndoImageEdit, setCanUndoImageEdit] = useState(false);
  const [draggingEvent, setDraggingEvent] = useState<AdminEvent | null>(null);
  const draggingEventRef = useRef<AdminEvent | null>(null);
  const [dragOverDateStr, setDragOverDateStr] = useState<string | null>(null);
  const [isImportingEvent, setIsImportingEvent] = useState(false);
  const saveInFlightRef = useRef(false);
  const [confirmType, setConfirmType] = useState<'create' | 'update'>('create');
  const [selectedParticipants, setSelectedParticipants] = useState<Set<string>>(new Set());
  const [initialEventSnapshot, setInitialEventSnapshot] = useState('');

  const [edgeZone, setEdgeZone] = useState<'left' | 'right' | null>(null);
  const [monthSwitching, setMonthSwitching] = useState(false);
  const edgeSwitchTimeoutRef = useRef<number | null>(null);
  const pendingEdgeZoneRef = useRef<'left' | 'right' | null>(null);

  const getEventText = (event: AdminEvent, key: 'title' | 'description' | 'location', locale: 'ja' | 'en') => {
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
  };

  const parseEventTime = (event: AdminEvent) => {
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
  };

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
    eventColor: '#49B1E4',
  });

  const eventColors = ['#49B1E4', '#4285F4', '#34A853', '#FBBC04', '#EA4335', '#A142F4'];

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
    const nextEvent = { ...newEvent, date: dateStr };
    setNewEvent(nextEvent);
    setInitialEventSnapshot(JSON.stringify(nextEvent));
    setShowNewEventForm(true);
    setSelectedEvent(null);
  };

  const handleImportEventToDate = (sourceEvent: AdminEvent, day: number | null) => {
    if (!day) return;
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    setSelectedDate(dateStr);
    const { startTime, endTime } = parseEventTime(sourceEvent);
    const nextEvent = {
      titleJa: getEventText(sourceEvent, 'title', 'ja'),
      titleEn: getEventText(sourceEvent, 'title', 'en'),
      descriptionJa: getEventText(sourceEvent, 'description', 'ja'),
      descriptionEn: getEventText(sourceEvent, 'description', 'en'),
      date: dateStr,
      startTime,
      endTime,
      location: getEventText(sourceEvent, 'location', 'ja'),
      locationEn: getEventText(sourceEvent, 'location', 'en'),
      googleMapUrl: sourceEvent?.googleMapUrl || '',
      maxParticipants: String(sourceEvent?.maxParticipants || ''),
      lineGroupUrl: '',
      image: sourceEvent?.image || null,
      eventColor: sourceEvent?.eventColor || '#49B1E4',
    };
    setNewEvent(nextEvent);
    setInitialEventSnapshot(JSON.stringify(nextEvent));
    setShowNewEventForm(true);
    setSelectedEvent(null);
  };

  // ドロップした日に、モーダル無しで即時作成する（LINEグループ招待リンク以外を流用）
  const handleCreateImportedEventToDate = async (sourceEvent: AdminEvent, day: number | null) => {
    if (!day) return;
    if (!onCreateEvent) return;
    try {
      setIsImportingEvent(true);
      const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const { startTime, endTime } = parseEventTime(sourceEvent);

      const eventData = {
        title: getEventText(sourceEvent, 'title', 'ja'),
        titleEn: getEventText(sourceEvent, 'title', 'en') || undefined,
        description: getEventText(sourceEvent, 'description', 'ja'),
        descriptionEn: getEventText(sourceEvent, 'description', 'en') || undefined,
        date: dateStr,
        time: `${startTime}〜${endTime}`,
        location: getEventText(sourceEvent, 'location', 'ja'),
        locationEn: getEventText(sourceEvent, 'location', 'en') || undefined,
        googleMapUrl: sourceEvent?.googleMapUrl || undefined,
        maxParticipants: parseInt(String(sourceEvent?.maxParticipants ?? ''), 10) || 30,
        image: sourceEvent?.image || undefined,
        eventColor: sourceEvent?.eventColor || '#49B1E4',
        tags: { friendsCanMeet: false, photoContest: false },
        status: 'upcoming' as const,
        // LINEグループ招待リンクは除外（空で作成）
        lineGroupLink: undefined,
      };

      await onCreateEvent(eventData);
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
    const { startTime, endTime } = parseEventTime(event);
    const nextEvent = {
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
      maxParticipants: String(event?.maxParticipants || ''),
      lineGroupUrl: event?.lineGroupLink || event?.lineGroupUrl || '',
      image: event?.image || null,
      eventColor: event?.eventColor || '#49B1E4',
    };
    setNewEvent(nextEvent);
    setInitialEventSnapshot(JSON.stringify(nextEvent));
    setEditMode(true);
    setSelectedParticipants(new Set());
    setShowNewEventForm(false);
    if (!event?.image) {
      void (async () => {
        const { data, error } = await supabase
          .from('events')
          .select('image,event_color')
          .eq('id', event.id)
          .maybeSingle();
        if (error) return;
        setNewEvent((prev) => ({ ...prev, image: data?.image || prev.image, eventColor: data?.event_color || prev.eventColor }));
      })();
    }
  };

  const handleCloseForm = () => {
    setShowNewEventForm(false);
    setSelectedEvent(null);
    setEditMode(false);
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
      eventColor: '#49B1E4',
    });
    setInitialEventSnapshot('');
  };

  const handleSaveEvent = () => {
    if (isSavingEvent || isUploadingImage) return;
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
    const { startTime, endTime } = parseEventTime(selectedEvent);
    setEditMode(true);
    const nextEvent = {
      titleJa: getEventText(selectedEvent, 'title', 'ja'),
      titleEn: getEventText(selectedEvent, 'title', 'en'),
      descriptionJa: getEventText(selectedEvent, 'description', 'ja'),
      descriptionEn: getEventText(selectedEvent, 'description', 'en'),
      date: selectedEvent.date || '',
      startTime,
      endTime,
      location: getEventText(selectedEvent, 'location', 'ja'),
      locationEn: getEventText(selectedEvent, 'location', 'en'),
      googleMapUrl: selectedEvent.googleMapUrl || '',
      maxParticipants: String(selectedEvent.maxParticipants || ''),
      lineGroupUrl: selectedEvent.lineGroupLink || selectedEvent.lineGroupUrl || '',
      image: selectedEvent.image || null,
      eventColor: selectedEvent.eventColor || '#49B1E4',
    };
    setNewEvent(nextEvent);
    setInitialEventSnapshot(JSON.stringify(nextEvent));
  };

  const handleSaveEditedEvent = () => {
    if (isSavingEvent || isUploadingImage) return;
    setConfirmType('update');
    setShowSaveConfirm(true);
  };

  const handleDeleteEvent = () => {
    setShowDeleteConfirm(true);
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

  const openImageEditor = (source: string, mode: 'preview' | 'mosaic' = 'preview') => {
    setImageEditorSource(source);
    setImageEditorMode(mode);
    setImageEditorOpen(true);
  };

  const closeImageEditor = () => {
    setImageEditorOpen(false);
    setImageEditorSource(null);
    setImageEditorMode('preview');
    imageHistoryRef.current = [];
    setCanUndoImageEdit(false);
  };

  const pushImageHistory = () => {
    const canvas = imageCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const snapshot = ctx.getImageData(0, 0, canvas.width, canvas.height);
    imageHistoryRef.current.push(snapshot);
    if (imageHistoryRef.current.length > 40) imageHistoryRef.current.shift();
    setCanUndoImageEdit(true);
  };

  const undoImageEdit = () => {
    const canvas = imageCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const snapshot = imageHistoryRef.current.pop();
    if (!snapshot) return;
    ctx.putImageData(snapshot, 0, 0);
    setCanUndoImageEdit(imageHistoryRef.current.length > 0);
  };

  const applyMosaicAtPoint = (canvas: HTMLCanvasElement, centerX: number, centerY: number, brushSize: number) => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const blockSize = Math.max(2, Math.floor(brushSize / 6));
    const half = Math.floor(brushSize / 2);
    const startX = Math.max(0, Math.floor(centerX - half));
    const startY = Math.max(0, Math.floor(centerY - half));
    const width = Math.min(canvas.width - startX, brushSize);
    const height = Math.min(canvas.height - startY, brushSize);
    if (width <= 0 || height <= 0) return;
    const imageData = ctx.getImageData(startX, startY, width, height);
    const { data } = imageData;
    for (let y = 0; y < height; y += blockSize) {
      for (let x = 0; x < width; x += blockSize) {
        const px = (y * width + x) * 4;
        const r = data[px];
        const g = data[px + 1];
        const b = data[px + 2];
        const a = data[px + 3];
        for (let by = 0; by < blockSize && y + by < height; by++) {
          for (let bx = 0; bx < blockSize && x + bx < width; bx++) {
            const i = ((y + by) * width + (x + bx)) * 4;
            data[i] = r;
            data[i + 1] = g;
            data[i + 2] = b;
            data[i + 3] = a;
          }
        }
      }
    }
    ctx.putImageData(imageData, startX, startY);
  };

  const handleCanvasPointer = (clientX: number, clientY: number) => {
    if (imageEditorMode !== 'mosaic') return;
    const canvas = imageCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (clientX - rect.left) * scaleX;
    const y = (clientY - rect.top) * scaleY;
    applyMosaicAtPoint(canvas, x, y, mosaicBrushSize);
  };

  const saveEditedImage = async () => {
    const canvas = imageCanvasRef.current;
    if (!canvas) return;
    setIsImageProcessing(true);
    try {
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.9));
      if (!blob) {
        toast.error(language === 'ja' ? '画像変換に失敗しました' : 'Failed to process image');
        return;
      }
      const file = new File([blob], `event-${selectedEvent?.id ?? Date.now()}.jpg`, { type: 'image/jpeg' });
      const uploadKey = selectedEvent?.id ?? Date.now();
      const { url, error } = await uploadEventImage(uploadKey, file);
      if (error || !url) {
        toast.error(language === 'ja' ? '画像アップロードに失敗しました' : 'Failed to upload image');
        return;
      }
      setNewEvent((prev) => ({ ...prev, image: url }));
      toast.success(language === 'ja' ? '画像を更新しました' : 'Image updated');
      closeImageEditor();
    } finally {
      setIsImageProcessing(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result;
      if (typeof result === 'string') {
        openImageEditor(result, 'mosaic');
      }
      e.currentTarget.value = '';
    };
    reader.readAsDataURL(file);
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

  useEffect(() => {
    currentMonthRef.current = currentMonth;
  }, [currentMonth]);

  useEffect(() => {
    currentYearRef.current = currentYear;
  }, [currentYear]);

  useEffect(() => {
    setMonthYearDisplayYear(currentYear);
  }, [currentYear]);

  useEffect(() => {
    draggingEventRef.current = draggingEvent;
  }, [draggingEvent]);

  const handleCalendarDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    if (!draggingEventRef.current) return;
    e.preventDefault();

    const el = calendarContainerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const threshold = 70; // 左右何px寄せたら判定するか

    const zone: 'left' | 'right' | null =
      e.clientX < rect.left + threshold ? 'left' :
      e.clientX > rect.right - threshold ? 'right' :
      null;

    setEdgeZone(zone);

    if (!zone) {
      if (edgeSwitchTimeoutRef.current) window.clearTimeout(edgeSwitchTimeoutRef.current);
      edgeSwitchTimeoutRef.current = null;
      pendingEdgeZoneRef.current = null;
      return;
    }

    const now = Date.now();
    if (now - lastMonthSwitchAtRef.current < 550) return;

    // 寄せた瞬間は色だけ変えて、少し遅らせてから切り替える
    pendingEdgeZoneRef.current = zone;
    if (edgeSwitchTimeoutRef.current) window.clearTimeout(edgeSwitchTimeoutRef.current);
    edgeSwitchTimeoutRef.current = window.setTimeout(() => {
      if (!draggingEventRef.current) return;
      if (pendingEdgeZoneRef.current !== zone) return;

      setMonthSwitching(true);
      lastMonthSwitchAtRef.current = Date.now();

      const cm = currentMonthRef.current;
      const cy = currentYearRef.current;
      if (zone === 'left') {
        if (cm === 0) {
          setCurrentMonth(11);
          setCurrentYear(cy - 1);
        } else {
          setCurrentMonth(cm - 1);
        }
      } else {
        if (cm === 11) {
          setCurrentMonth(0);
          setCurrentYear(cy + 1);
        } else {
          setCurrentMonth(cm + 1);
        }
      }

      window.setTimeout(() => setMonthSwitching(false), 260);
    }, 260);
  };

  const selectedDateValue = useMemo(() => {
    if (!newEvent.date) return undefined;
    const parsed = new Date(`${newEvent.date}T00:00:00`);
    return Number.isNaN(parsed.getTime()) ? undefined : parsed;
  }, [newEvent.date]);

  const hasUnsavedChanges = useMemo(() => {
    if (!initialEventSnapshot) return false;
    return JSON.stringify(newEvent) !== initialEventSnapshot;
  }, [newEvent, initialEventSnapshot]);

  useEffect(() => {
    if (!imageEditorOpen || !imageEditorSource) return;
    const canvas = imageCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => {
      const maxWidth = 1200;
      const maxHeight = 700;
      const scale = Math.min(maxWidth / image.width, maxHeight / image.height, 1);
      canvas.width = Math.max(1, Math.floor(image.width * scale));
      canvas.height = Math.max(1, Math.floor(image.height * scale));
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
      imageHistoryRef.current = [];
      setCanUndoImageEdit(false);
    };
    image.src = imageEditorSource;
  }, [imageEditorOpen, imageEditorSource]);

  useEffect(() => {
    if (!imageEditorOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      const isUndo = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'z' && !event.shiftKey;
      if (!isUndo) return;
      event.preventDefault();
      undoImageEdit();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [imageEditorOpen]);

  const renderEventImageField = () => (
    <div>
      <label className="text-[#3D3D4E] text-sm font-medium tracking-[-0.1504px] block mb-2">
        {t.eventImage}
      </label>
      <div className="bg-[#F5F1E8] border border-[rgba(61,61,78,0.15)] rounded-[8px] h-[126px] flex items-center justify-center relative overflow-hidden group">
        {newEvent.image ? (
          <button type="button" className="w-full h-full" onClick={() => openImageEditor(newEvent.image!, 'preview')}>
            <img src={newEvent.image} alt="Event" className="w-full h-full object-cover" />
          </button>
        ) : (
          <label className="cursor-pointer flex flex-col items-center">
            <FontAwesomeIcon icon={faUpload} className="w-4 h-4 text-[#3D3D4E] mb-1" />
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
  );

  return (
    <div className="space-y-6">
      {/* カレンダー */}
      <div className="bg-white rounded-[14px] border border-[rgba(61,61,78,0.15)] p-6 pb-8">
        {/* 月表示とナビゲーション */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex-1">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full justify-start bg-[#EEEBE3] border-0 text-left font-normal text-[#3D3D4E] h-9"
                >
                  <CalendarIcon className="w-4 h-4 mr-2 text-[#6B6B7A]" />
                  {currentYear}年 {monthNames[currentMonth]}
                </Button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-[320px] p-4 bg-white shadow-xl border border-[#E5E7EB] z-80">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => setMonthYearDisplayYear(monthYearDisplayYear - 1)}
                      className="h-8 w-8"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <div className="text-sm font-semibold">{monthYearDisplayYear}年</div>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => setMonthYearDisplayYear(monthYearDisplayYear + 1)}
                      className="h-8 w-8"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    {monthNames.map((monthName, idx) => {
                      const monthNumber = idx; // 0-indexed
                      const isSelected = currentYear === monthYearDisplayYear && currentMonth === monthNumber;
                      return (
                        <Button
                          key={monthName}
                          type="button"
                          variant={isSelected ? 'default' : 'outline'}
                          className={`h-12 text-sm ${isSelected ? '' : 'bg-white'}`}
                          onClick={() => {
                            setCurrentYear(monthYearDisplayYear);
                            setCurrentMonth(monthNumber);
                          }}
                        >
                          {monthName}
                        </Button>
                      );
                    })}
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* カレンダーグリッド */}
        <div
          className={`overflow-hidden relative transition-all duration-200 ${monthSwitching ? 'opacity-70 blur-[1px]' : 'opacity-100 blur-0'}`}
          ref={calendarContainerRef}
          onDragOver={handleCalendarDragOver}
        >
          {draggingEvent && edgeZone === 'left' && (
            <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-20 bg-red-200/35 transition-colors duration-150" />
          )}
          {draggingEvent && edgeZone === 'right' && (
            <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-20 bg-blue-200/35 transition-colors duration-150" />
          )}
          <div className="grid grid-cols-7 gap-px bg-[#E5E7EB] border border-[#E5E7EB] overflow-hidden">
            {/* 曜日ヘッダー */}
            {dayNames.map((day, index) => (
              <div
                key={`day-${index}`}
                className={`p-2 text-center ${index === 0 ? 'bg-red-50' : index === 6 ? 'bg-blue-50' : 'bg-[#F9FAFB]'
                  }`}
              >
                <span className={`text-xs font-bold ${index === 0 ? 'text-red-600' : index === 6 ? 'text-blue-600' : 'text-[#6B6B7A]'}`}>{day}</span>
              </div>
            ))}

            {/* 日付セル */}
            {calendarDays.map((day, index) => {
              const dayEvents = getEventsForDate(day);
              const column = index % 7;
              const isSunday = column === 0;
              const isSaturday = column === 6;
              const cellDateStr = day
                ? `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                : null;
              return (
                <div
                  key={`cell-${index}`}
                  className={`p-2 flex flex-col relative overflow-hidden h-[120px] ${isSunday ? 'bg-red-50/35' : isSaturday ? 'bg-blue-50/35' : 'bg-white'
                    } ${day ? 'cursor-pointer hover:bg-[#F5F8FC]' : ''} ${
                      day && dragOverDateStr === cellDateStr ? 'bg-[#49B1E4]/25 ring-2 ring-[#49B1E4] rounded-[10px]' : ''
                    }`}
                  onClick={() => {
                    if (draggingEventRef.current) return;
                    handleAddEvent(day);
                  }}
                  onDragOver={(e) => {
                    if (draggingEventRef.current && day && cellDateStr) {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = 'copy';
                      setDragOverDateStr(cellDateStr);
                    }
                  }}
                  onDragLeave={() => {
                    if (draggingEventRef.current && dragOverDateStr === cellDateStr) {
                      setDragOverDateStr(null);
                    }
                  }}
                  onDrop={(e) => {
                    if (draggingEventRef.current && day && cellDateStr) {
                      e.preventDefault();
                      void handleCreateImportedEventToDate(draggingEventRef.current, day);
                      setDraggingEvent(null);
                      setDragOverDateStr(null);
                      setEdgeZone(null);
                      pendingEdgeZoneRef.current = null;
                      if (edgeSwitchTimeoutRef.current) window.clearTimeout(edgeSwitchTimeoutRef.current);
                      edgeSwitchTimeoutRef.current = null;
                    }
                  }}
                >
                  {day && (
                    <>
                      {/* 日付番号 */}
                      <div className={`text-center text-sm font-bold mb-2 ${isSunday ? 'text-red-600' : isSaturday ? 'text-blue-600' : 'text-[#3D3D4E]'}`}>{day}</div>

                      {/* イベント表示 */}
                      <div className="space-y-1">
                        {dayEvents.map((event) => (
                          <button
                            key={event.id}
                            draggable
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEventClick(event);
                            }}
                            onDragStart={(e) => {
                              setDraggingEvent(event);
                              setDragOverDateStr(null);
                              e.dataTransfer.effectAllowed = 'copy';
                            }}
                            onDragEnd={() => {
                              setDraggingEvent(null);
                              setDragOverDateStr(null);
                              setEdgeZone(null);
                              setMonthSwitching(false);
                              pendingEdgeZoneRef.current = null;
                              if (edgeSwitchTimeoutRef.current) window.clearTimeout(edgeSwitchTimeoutRef.current);
                              edgeSwitchTimeoutRef.current = null;
                            }}
                            className="flex items-center gap-1 text-left w-full px-1 py-0.5 rounded hover:bg-black/5 transition-colors"
                          >
                            <span
                              className="w-2 h-2 rounded-full shrink-0"
                              style={{ backgroundColor: event.eventColor || '#49B1E4' }}
                            />
                            <span className="truncate text-[10px] text-[#3D3D4E] font-medium">
                              {language === 'ja' ? event.title : (event.titleEn || event.title)}
                            </span>
                          </button>
                        ))}
                      </div>
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
        <div className="fixed inset-0 z-50 bg-black/45 flex items-center justify-center p-4" onClick={handleCloseForm}>
          <div className="bg-white rounded-[14px] border border-[rgba(61,61,78,0.15)] p-6 relative w-full max-w-[1100px] max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
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
                {renderEventImageField()}

                <div>
                  <label className="text-[#3D3D4E] text-sm font-medium tracking-[-0.1504px] block mb-2">
                    {language === 'ja' ? 'イベントカラー' : 'Event Color'}
                  </label>
                  <div className="flex items-center gap-2">
                    {eventColors.map((color) => (
                      <button
                        key={color}
                        type="button"
                        aria-label={`event-color-${color}`}
                        onClick={() => setNewEvent({ ...newEvent, eventColor: color })}
                        className={`w-6 h-6 rounded-full border-2 transition-transform hover:scale-105 ${newEvent.eventColor === color ? 'border-[#3D3D4E]' : 'border-transparent'}`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>

                {/* 日付・時間 */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[#3D3D4E] text-sm font-medium tracking-[-0.1504px] block mb-2">
                      {t.date}
                    </label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button type="button" variant="outline" className="w-full justify-start bg-[#EEEBE3] border-0 text-left font-normal text-[#3D3D4E]">
                          <CalendarIcon className="w-4 h-4 mr-2 text-[#6B6B7A]" />
                          {selectedDateValue ? format(selectedDateValue, language === 'ja' ? 'yyyy年MM月dd日' : 'MMM dd, yyyy', { locale: language === 'ja' ? ja : undefined }) : (language === 'ja' ? '日付を選択' : 'Select date')}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 bg-white opacity-100 shadow-xl border border-[#E5E7EB] z-80" align="start">
                        <Calendar
                          mode="single"
                          selected={selectedDateValue}
                          onSelect={(date) => {
                            if (!date) return;
                            setNewEvent({ ...newEvent, date: format(date, 'yyyy-MM-dd') });
                          }}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
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
        </div>
      )}

      {/* イベント詳細表示 */}
      {selectedEvent && !editMode && (
        <div className={`bg-white rounded-[14px] p-6 relative ${selectedEvent.currentParticipants >= selectedEvent.maxParticipants
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
                  <span className={`font-semibold ${selectedEvent.currentParticipants >= selectedEvent.maxParticipants
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
        <div className="fixed inset-0 z-50 bg-black/45 flex items-center justify-center p-4" onClick={handleCloseForm}>
          <div className="bg-white rounded-[14px] border border-[rgba(61,61,78,0.15)] p-6 relative w-full max-w-[1100px] max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            {/* 閉じるボタン */}
            <button
              onClick={handleCloseForm}
              className="absolute top-4 right-4 text-[#3D3D4E] hover:text-[#1a1a24] transition-colors opacity-70"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-start justify-between gap-3 mb-6 pr-6">
              <div>
                <h3 className="text-[#3D3D4E] text-lg font-semibold tracking-[-0.4395px]">{t.editEvent}</h3>
                <p className="text-[#6B6B7A] text-sm mt-1">
                  {newEvent.titleJa || newEvent.titleEn || (language === 'ja' ? '無題のイベント' : 'Untitled event')}
                </p>
              </div>
            </div>

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
                {renderEventImageField()}

                <div>
                  <label className="text-[#3D3D4E] text-sm font-medium tracking-[-0.1504px] block mb-2">
                    {language === 'ja' ? 'イベントカラー' : 'Event Color'}
                  </label>
                  <div className="flex items-center gap-2">
                    {eventColors.map((color) => (
                      <button
                        key={color}
                        type="button"
                        aria-label={`event-color-${color}`}
                        onClick={() => setNewEvent({ ...newEvent, eventColor: color })}
                        className={`w-6 h-6 rounded-full border-2 transition-transform hover:scale-105 ${newEvent.eventColor === color ? 'border-[#3D3D4E]' : 'border-transparent'}`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>

                {/* 日付・時間 */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[#3D3D4E] text-sm font-medium tracking-[-0.1504px] block mb-2">
                      {t.date}
                    </label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button type="button" variant="outline" className="w-full justify-start bg-[#EEEBE3] border-0 text-left font-normal text-[#3D3D4E]">
                          <CalendarIcon className="w-4 h-4 mr-2 text-[#6B6B7A]" />
                          {selectedDateValue ? format(selectedDateValue, language === 'ja' ? 'yyyy年MM月dd日' : 'MMM dd, yyyy', { locale: language === 'ja' ? ja : undefined }) : (language === 'ja' ? '日付を選択' : 'Select date')}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 bg-white opacity-100 shadow-xl border border-[#E5E7EB] z-80" align="start">
                        <Calendar
                          mode="single"
                          selected={selectedDateValue}
                          onSelect={(date) => {
                            if (!date) return;
                            setNewEvent({ ...newEvent, date: format(date, 'yyyy-MM-dd') });
                          }}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
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
            <div className="flex gap-2 mt-6 justify-end">
              <Button
                onClick={handleDeleteEvent}
                className="min-w-28 bg-[#D4183D] hover:bg-[#B01535] text-white"
              >
                {t.deleteEvent}
              </Button>
              <Button
                onClick={handleSaveEditedEvent}
                disabled={!hasUnsavedChanges || isSavingEvent || isUploadingImage}
                className="min-w-28 bg-[#00A63E] hover:bg-[#008C35] text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {t.save}
              </Button>
            </div>
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

      {imageEditorOpen && imageEditorSource && (
        <div
          className="fixed inset-0 z-90 bg-black/70 flex items-center justify-center p-4"
          onClick={closeImageEditor}
        >
          <div className="relative w-full max-w-[95vw] max-h-[95vh] bg-[#111827] rounded-xl border border-white/10 p-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3 gap-3">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  title={language === 'ja' ? '1つ戻す (Cmd/Ctrl+Z)' : 'Undo (Cmd/Ctrl+Z)'}
                  className="text-lg text-white/60 hover:text-white transition-colors disabled:opacity-30 disabled:hover:text-white/60"
                  onClick={undoImageEdit}
                  disabled={!canUndoImageEdit}
                >
                  <FontAwesomeIcon icon={faRotateLeft} />
                </button>
                <button
                  type="button"
                  title={language === 'ja' ? 'プレビュー' : 'Preview'}
                  className={`text-lg transition-colors ${imageEditorMode === 'preview' ? 'text-white' : 'text-white/60 hover:text-white'}`}
                  onClick={() => setImageEditorMode('preview')}
                >
                  <FontAwesomeIcon icon={faEye} />
                </button>
                <button
                  type="button"
                  title={language === 'ja' ? 'モザイクブラシ' : 'Mosaic Brush'}
                  className={`text-lg transition-colors ${imageEditorMode === 'mosaic' ? 'text-white' : 'text-white/60 hover:text-white'}`}
                  onClick={() => setImageEditorMode('mosaic')}
                >
                  <FontAwesomeIcon icon={faWandMagicSparkles} />
                </button>
                {imageEditorMode === 'mosaic' && (
                  <div className="flex items-center gap-2 text-white text-xs">
                    <span>{language === 'ja' ? 'ブラシ' : 'Brush'}</span>
                    <input
                      type="range"
                      min={6}
                      max={48}
                      value={mosaicBrushSize}
                      onChange={(e) => setMosaicBrushSize(Number(e.target.value))}
                    />
                  </div>
                )}
              </div>
              <div className="flex items-center gap-3">
                <label className="cursor-pointer text-white/60 hover:text-white transition-colors text-lg">
                  <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                  <span title={language === 'ja' ? 'アップロード' : 'Upload'}>
                    <FontAwesomeIcon icon={faUpload} />
                  </span>
                </label>
                <button
                  type="button"
                  title={language === 'ja' ? '画像削除' : 'Remove Image'}
                  className="text-lg text-white/60 hover:text-red-400 transition-colors"
                  onClick={() => {
                    setNewEvent((prev) => ({ ...prev, image: null }));
                    closeImageEditor();
                  }}
                >
                  <FontAwesomeIcon icon={faTrashCan} />
                </button>
                <button
                  type="button"
                  title={language === 'ja' ? '反映して保存' : 'Apply & Save'}
                  className="text-lg text-white/60 hover:text-[#49B1E4] transition-colors disabled:opacity-40 disabled:hover:text-white/60"
                  disabled={isImageProcessing}
                  onClick={() => {
                    void saveEditedImage();
                  }}
                >
                  <FontAwesomeIcon icon={faFloppyDisk} className={isImageProcessing ? 'animate-pulse' : ''} />
                </button>
              </div>
            </div>
            <div className="overflow-auto max-h-[78vh] rounded-lg bg-black/50 flex items-center justify-center">
              <canvas
                ref={imageCanvasRef}
                className={`max-w-full max-h-[78vh] ${imageEditorMode === 'mosaic' ? 'cursor-crosshair' : 'cursor-default'}`}
                onMouseDown={(e) => {
                  if (imageEditorMode !== 'mosaic') return;
                  pushImageHistory();
                  isDrawingRef.current = true;
                  handleCanvasPointer(e.clientX, e.clientY);
                }}
                onMouseMove={(e) => {
                  if (!isDrawingRef.current) return;
                  handleCanvasPointer(e.clientX, e.clientY);
                }}
                onMouseUp={() => {
                  isDrawingRef.current = false;
                }}
                onMouseLeave={() => {
                  isDrawingRef.current = false;
                }}
              />
            </div>
            <button
              type="button"
              onClick={closeImageEditor}
              className="absolute -top-10 right-0 text-white hover:text-gray-200"
              aria-label="close-image-preview"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>
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
                  disabled={isSavingEvent || isUploadingImage}
                  onClick={async () => {
                    if (isSavingEvent || isUploadingImage || saveInFlightRef.current) return;
                    saveInFlightRef.current = true;
                    setIsSavingEvent(true);
                    try {
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
                          eventColor: newEvent.eventColor || '#49B1E4',
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
                            eventColor: newEvent.eventColor || '#49B1E4',
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
                    } finally {
                      saveInFlightRef.current = false;
                      setIsSavingEvent(false);
                    }
                  }}
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
            </div>
          </div>
        </div>
      )}

      {/* 削除確認ダイアログ */}
      {showDeleteConfirm && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => {
            if (isDeletingEvent) return;
            setShowDeleteConfirm(false);
          }}
        >
          <div
            className="bg-[#F5F1E8] rounded-[10px] w-full max-w-[400px] shadow-xl border border-[rgba(61,61,78,0.15)] relative max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
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
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
