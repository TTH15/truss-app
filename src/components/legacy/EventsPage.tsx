import { useState, useRef, useEffect, useMemo } from 'react';
import { Button } from '../ui/button';
import { Heart, Users, Calendar, Camera, MapPin, Clock, MessageCircle, ExternalLink } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Checkbox } from '../ui/checkbox';
import type { Language, Event, User } from '../../domain/types/app';
import { supabase } from '../../lib/supabase';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { getEventIconDefinition, DEFAULT_EVENT_ICON_KEY } from '../../lib/event-icons';

interface EventsPageProps {
  language: Language;
  events: Event[];
  attendingEvents: Set<number>;
  likedEvents: Set<number>;
  onToggleAttending: (eventId: number) => void;
  onToggleLike: (eventId: number) => void;
  highlightEventId?: number;
  onAddEventParticipant: (eventId: number, photoRefusal: boolean) => void;
  user: User;
}

const translations = {
  ja: { title: 'イベント', viewPhotos: '写真を見る', attend: '参加する', registered: '申し込み済み', likes: 'いいね', participants: '参加者', registrationComplete: '参加登録完了', registrationCompleteMessage: 'イベントへの参加登録が完了しました！', lineGroupDescription: '以下のボタンからイベント用のLINEグループに参加できます。', photoRefusal: '顔が写っている写真のアップロードを拒否する。', openLine: 'LINEで開く', close: '閉じる', noLineGroup: 'このイベントにはLINEグループはありません。', confirmRegistration: '参加登録', confirmRegistrationMessage: '以下の内容を確認して、参加登録してください。', registerButton: '参加する', eventDetails: 'イベント詳細', description: '説明', noDescription: '説明はありません', tapIconHint: '日付のイベントアイコンをタップして詳細を表示できます。' },
  en: { title: 'Events', viewPhotos: 'View Photos', attend: 'Attend', registered: 'Registered', likes: 'Likes', participants: 'Participants', registrationComplete: 'Registration Complete', registrationCompleteMessage: 'Your event registration is complete!', lineGroupDescription: 'You can join the event LINE group using the button below.', photoRefusal: 'I refuse to have photos of my face uploaded.', openLine: 'Open in LINE', close: 'Close', noLineGroup: 'This event does not have a LINE group.', confirmRegistration: 'Event Registration', confirmRegistrationMessage: 'Please confirm the following and register.', registerButton: 'Register', eventDetails: 'Event Details', description: 'Description', noDescription: 'No description available', tapIconHint: 'Tap an event icon on the calendar to see details.' },
};

export function EventsPage({ language, events, attendingEvents, likedEvents, onToggleAttending, onToggleLike, highlightEventId, onAddEventParticipant, user }: EventsPageProps) {
  const t = translations[language];
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [lineGroupDialogOpen, setLineGroupDialogOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [detailEvent, setDetailEvent] = useState<Event | null>(null);
  const eventRefs = useRef<{ [key: number]: HTMLElement | null }>({});
  const [photoRefusal, setPhotoRefusal] = useState(false);
  const [registrationStep, setRegistrationStep] = useState<'confirm' | 'complete'>('confirm');
  const [eventImages, setEventImages] = useState<Record<number, string | null>>({});

  const [calendarMonth, setCalendarMonth] = useState(() => new Date().getMonth());
  const [calendarYear, setCalendarYear] = useState(() => new Date().getFullYear());

  const monthNames = language === 'ja'
    ? ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月']
    : ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  const dayNames = language === 'ja'
    ? ['日', '月', '火', '水', '木', '金', '土']
    : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const daysInMonth = getDaysInMonth(calendarYear, calendarMonth);
  const firstDay = getFirstDayOfMonth(calendarYear, calendarMonth);
  const totalCells = Math.ceil((daysInMonth + firstDay) / 7) * 7;

  const calendarDays = useMemo(() => {
    return Array.from({ length: totalCells }, (_, i) => {
      const dayNumber = i - firstDay + 1;
      if (dayNumber > 0 && dayNumber <= daysInMonth) return dayNumber;
      return null;
    });
  }, [totalCells, firstDay, daysInMonth]);

  const getEventsForDate = (day: number | null) => {
    if (!day) return [];
    const dateStr = `${calendarYear}-${String(calendarMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return events.filter((event) => event.date === dateStr);
  };

  useEffect(() => {
    if (!highlightEventId) return;
    const ev = events.find((e) => e.id === highlightEventId);
    if (!ev?.date) return;
    const parsed = new Date(`${ev.date}T12:00:00`);
    if (Number.isNaN(parsed.getTime())) return;
    setCalendarMonth(parsed.getMonth());
    setCalendarYear(parsed.getFullYear());
  }, [highlightEventId, events]);

  useEffect(() => {
    if (!highlightEventId || !eventRefs.current[highlightEventId]) return;
    setTimeout(() => eventRefs.current[highlightEventId]?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);
  }, [highlightEventId, calendarMonth, calendarYear]);

  useEffect(() => {
    const eventIds = events.map((event) => event.id).filter((id): id is number => typeof id === 'number');
    if (eventIds.length === 0) {
      setEventImages({});
      return;
    }

    let cancelled = false;
    void (async () => {
      const { data, error } = await supabase
        .from('events')
        .select('id,image')
        .in('id', eventIds);
      if (cancelled || error) return;
      const nextMap: Record<number, string | null> = {};
      for (const row of data ?? []) {
        nextMap[row.id] = row.image ?? null;
      }
      setEventImages(nextMap);
    })();

    return () => {
      cancelled = true;
    };
  }, [events]);

  const handlePreviousMonth = () => {
    if (calendarMonth === 0) {
      setCalendarMonth(11);
      setCalendarYear((y) => y - 1);
    } else {
      setCalendarMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (calendarMonth === 11) {
      setCalendarMonth(0);
      setCalendarYear((y) => y + 1);
    } else {
      setCalendarMonth((m) => m + 1);
    }
  };

  const handleAttendClick = (event: Event) => {
    const isAttending = attendingEvents.has(event.id);
    if (isAttending) return onToggleAttending(event.id);
    if (!user.approved) return alert(language === 'ja' ? '運営による承認をお待ちください' : 'Please wait for admin approval');
    const isLimited = !user.profileCompleted || (user.category === 'japanese' && !user.feePaid);
    if (isLimited && attendingEvents.size >= 1) {
      const msg = language === 'ja'
        ? (!user.profileCompleted ? 'プロフィール登録が完了するまで、1つのイベントにのみ参加できます' : '年会費のお支払いが完了するまで、1つのイベントにのみ参加できます')
        : (!user.profileCompleted ? 'You can only register for one event until you complete your profile' : 'You can only register for one event until you pay the annual fee');
      return alert(msg);
    }
    setSelectedEvent(event);
    setLineGroupDialogOpen(true);
  };

  const handleRegister = () => {
    if (!selectedEvent) return;
    onAddEventParticipant(selectedEvent.id, photoRefusal);
    onToggleAttending(selectedEvent.id);
    setRegistrationStep('complete');
  };
  const handleLineDialogClose = () => {
    setLineGroupDialogOpen(false);
    setSelectedEvent(null);
    setPhotoRefusal(false);
    setRegistrationStep('confirm');
  };
  const handleOpenLineGroup = () => {
    if (selectedEvent?.lineGroupLink) window.open(selectedEvent.lineGroupLink, '_blank');
    handleLineDialogClose();
  };

  const handleCalendarEventClick = (event: Event) => {
    setDetailEvent(event);
    setDetailModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-gray-900">{t.title}</h1>
      <p className="text-sm text-[#6B6B7A]">{t.tapIconHint}</p>

      <div className="bg-white rounded-[14px] border border-[rgba(61,61,78,0.15)] p-6 pb-8">
        <div className="flex items-center justify-between mb-4">
          <button
            type="button"
            onClick={handlePreviousMonth}
            className="text-[#3D3D4E] hover:text-[#49B1E4] transition-colors p-1 hover:bg-[#F5F1E8] rounded"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h2 className="text-[#3D3D4E] text-base font-semibold">
            {calendarYear}{language === 'ja' ? '年' : ''} {monthNames[calendarMonth]}
          </h2>
          <button
            type="button"
            onClick={handleNextMonth}
            className="text-[#3D3D4E] hover:text-[#49B1E4] transition-colors p-1 hover:bg-[#F5F1E8] rounded"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        <div className="overflow-hidden">
          <div className="grid grid-cols-7 gap-px bg-[#E5E7EB] border border-[#E5E7EB] overflow-hidden rounded-lg">
            {dayNames.map((day, index) => (
              <div
                key={`day-${index}`}
                className={`p-2 text-center ${index === 0 ? 'bg-red-50' : index === 6 ? 'bg-blue-50' : 'bg-[#F9FAFB]'}`}
              >
                <span className={`text-xs font-bold ${index === 0 ? 'text-red-600' : index === 6 ? 'text-blue-600' : 'text-[#6B6B7A]'}`}>{day}</span>
              </div>
            ))}

            {calendarDays.map((day, index) => {
              const dayEvents = getEventsForDate(day);
              const column = index % 7;
              const isSunday = column === 0;
              const isSaturday = column === 6;
              return (
                <div
                  key={`cell-${index}`}
                  className={`p-2 flex flex-col relative overflow-hidden min-h-[120px] ${isSunday ? 'bg-red-50/35' : isSaturday ? 'bg-blue-50/35' : 'bg-white'}`}
                >
                  {day && (
                    <>
                      <div className={`text-center text-sm font-bold mb-2 ${isSunday ? 'text-red-600' : isSaturday ? 'text-blue-600' : 'text-[#3D3D4E]'}`}>{day}</div>
                      <div className="space-y-1">
                        {dayEvents.map((event) => (
                          <button
                            key={event.id}
                            type="button"
                            ref={(el) => {
                              eventRefs.current[event.id] = el;
                            }}
                            onClick={() => handleCalendarEventClick(event)}
                            className={`flex items-center gap-1 text-left w-full px-1 py-0.5 rounded hover:bg-black/5 transition-colors ${highlightEventId === event.id ? 'ring-2 ring-[#49B1E4] bg-[#49B1E4]/10' : ''}`}
                          >
                            <FontAwesomeIcon
                              icon={getEventIconDefinition(event.eventIconKey || DEFAULT_EVENT_ICON_KEY)}
                              className="shrink-0 text-[11px]"
                              style={{ color: event.eventColor || '#49B1E4' }}
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

      {/* 詳細モーダル内でカード相当の内容を表示 */}
      <Dialog open={detailModalOpen} onOpenChange={setDetailModalOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto p-0 gap-0">
          {detailEvent && (
            <div className="p-6 space-y-4">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-[#3D3D4E]"><Calendar className="w-5 h-5 text-[#49B1E4]" />{t.eventDetails}</DialogTitle>
              </DialogHeader>
              <div className="rounded-lg overflow-hidden bg-linear-to-br from-blue-100 to-purple-100">
                {(eventImages[detailEvent.id] ?? detailEvent.image) ? (
                  <img src={(eventImages[detailEvent.id] ?? detailEvent.image) as string} alt={language === 'ja' ? detailEvent.title : (detailEvent.titleEn || detailEvent.title)} className="w-full h-48 object-cover" />
                ) : (
                  <div className="w-full h-48 flex items-center justify-center">
                    <FontAwesomeIcon icon={getEventIconDefinition(detailEvent.eventIconKey)} className="text-6xl text-[#49B1E4]/90" />
                  </div>
                )}
              </div>
              <h3 className="text-xl font-bold text-[#3D3D4E]">{language === 'ja' ? detailEvent.title : (detailEvent.titleEn || detailEvent.title)}</h3>
              <div className="bg-[#F5F1E8] rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-3 text-[#3D3D4E]"><Calendar className="w-5 h-5 text-[#49B1E4]" /><span>{detailEvent.date}</span></div>
                <div className="flex items-center gap-3 text-[#3D3D4E]"><Clock className="w-5 h-5 text-[#49B1E4]" /><span>{detailEvent.time}</span></div>
                <div className="flex items-start gap-3 text-[#3D3D4E]"><MapPin className="w-5 h-5 text-[#49B1E4] shrink-0 mt-0.5" /><div><span>{language === 'ja' ? detailEvent.location : (detailEvent.locationEn || detailEvent.location)}</span>{detailEvent.googleMapUrl && <a href={detailEvent.googleMapUrl} target="_blank" rel="noopener noreferrer" className="block text-sm text-[#49B1E4] hover:underline mt-1"><ExternalLink className="w-3 h-3 inline mr-1" />{language === 'ja' ? 'Google Mapで開く' : 'Open in Google Maps'}</a>}</div></div>
              </div>
              <div className="flex items-center gap-6"><button type="button" onClick={() => onToggleLike(detailEvent.id)} className="flex items-center gap-2 text-pink-600 hover:text-pink-700 transition-colors"><Heart className={`w-6 h-6 ${likedEvents.has(detailEvent.id) ? 'fill-current' : ''}`} /><span className="text-lg font-semibold">{detailEvent.likes}</span><span className="text-sm">{t.likes}</span></button><div className="flex items-center gap-2 text-blue-600"><Users className="w-6 h-6" /><span className="text-lg font-semibold">{detailEvent.currentParticipants}/{detailEvent.maxParticipants}</span><span className="text-sm">{t.participants}</span></div></div>
              <div className="border-t pt-4"><h4 className="font-semibold text-[#3D3D4E] mb-2">{t.description}</h4><p className="text-[#6B6B7A] whitespace-pre-wrap leading-relaxed">{language === 'ja' ? (detailEvent.descriptionJa || detailEvent.description || t.noDescription) : (detailEvent.descriptionEn || detailEvent.descriptionJa || detailEvent.description || t.noDescription)}</p></div>
              <div className="flex gap-3 pt-4 border-t">
                {detailEvent.status === 'upcoming' && <Button className={`flex-1 ${attendingEvents.has(detailEvent.id) ? 'bg-gray-400' : 'bg-[#49B1E4] hover:bg-[#3A9FD3]'}`} onClick={() => { setDetailModalOpen(false); handleAttendClick(detailEvent); }}>{attendingEvents.has(detailEvent.id) ? t.registered : t.attend}</Button>}
                {detailEvent.status === 'past' && detailEvent.photos && <Button variant="outline" className="flex-1"><Camera className="w-4 h-4 mr-2" />{t.viewPhotos} ({detailEvent.photos})</Button>}
                <Button variant="outline" onClick={() => setDetailModalOpen(false)}>{t.close}</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={lineGroupDialogOpen} onOpenChange={setLineGroupDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          {registrationStep === 'confirm' ? (
            <>
              <DialogHeader><DialogTitle className="flex items-center gap-2"><Calendar className="w-5 h-5 text-[#49B1E4]" />{t.confirmRegistration}</DialogTitle><DialogDescription>{t.confirmRegistrationMessage}</DialogDescription></DialogHeader>
              <div className="space-y-4 py-2">
                {selectedEvent && <div className="bg-[#F5F1E8] p-4 rounded-lg"><h3 className="font-medium text-[#3D3D4E] mb-1">{language === 'ja' ? selectedEvent.title : (selectedEvent.titleEn || selectedEvent.title)}</h3><p className="text-sm text-[#6B6B7A]">{selectedEvent.date} {selectedEvent.time}</p></div>}
                <div className="flex items-start space-x-3 bg-yellow-50 p-3 rounded-lg border border-yellow-200"><Checkbox id="photoRefusal" checked={photoRefusal} onCheckedChange={(checked) => setPhotoRefusal(checked === true)} className="mt-0.5" /><label htmlFor="photoRefusal" className="text-sm text-[#3D3D4E] leading-relaxed cursor-pointer">{t.photoRefusal}</label></div>
                <Button className="w-full bg-[#49B1E4] hover:bg-[#3A9BD4] text-white" onClick={handleRegister}>{t.registerButton}</Button>
                <Button variant="ghost" className="w-full text-[#6B6B7A]" onClick={handleLineDialogClose}>{t.close}</Button>
              </div>
            </>
          ) : (
            <>
              <DialogHeader><DialogTitle className="flex items-center gap-2"><MessageCircle className="w-5 h-5 text-[#49B1E4]" />{t.registrationComplete}</DialogTitle><DialogDescription>{t.registrationCompleteMessage}</DialogDescription></DialogHeader>
              <div className="space-y-4 py-2">
                {selectedEvent?.lineGroupLink ? <><div className="bg-[#F5F1E8] p-4 rounded-lg"><p className="text-sm text-[#3D3D4E] text-center">{t.lineGroupDescription}</p></div><Button className="w-full bg-[#06C755] hover:bg-[#05B04E] text-white" onClick={handleOpenLineGroup}><MessageCircle className="w-4 h-4 mr-2" />{t.openLine}</Button></> : <div className="bg-gray-50 p-4 rounded-lg"><p className="text-sm text-[#6B6B7A] text-center">{t.noLineGroup}</p></div>}
                <Button variant="outline" className="w-full" onClick={handleLineDialogClose}>{t.close}</Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
