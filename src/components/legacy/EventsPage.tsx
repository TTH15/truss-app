import { useState, useRef, useEffect } from 'react';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Heart, Users, Calendar, Camera, MapPin, Clock, MessageCircle, ExternalLink, Info } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Checkbox } from '../ui/checkbox';
import type { Language, Event, User } from '../../domain/types/app';

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
  ja: { title: 'イベント', viewPhotos: '写真を見る', attend: '参加する', registered: '申し込み済み', likes: 'いいね', participants: '参加者', registrationComplete: '参加登録完了', registrationCompleteMessage: 'イベントへの参加登録が完了しました！', lineGroupDescription: '以下のボタンからイベント用のLINEグループに参加できます。', photoRefusal: '顔が写っている写真のアップロードを拒否する。', openLine: 'LINEで開く', close: '閉じる', noLineGroup: 'このイベントにはLINEグループはありません。', confirmRegistration: '参加登録', confirmRegistrationMessage: '以下の内容を確認して、参加登録してください。', registerButton: '参加する', eventDetails: 'イベント詳細', description: '説明', noDescription: '説明はありません' },
  en: { title: 'Events', viewPhotos: 'View Photos', attend: 'Attend', registered: 'Registered', likes: 'Likes', participants: 'Participants', registrationComplete: 'Registration Complete', registrationCompleteMessage: 'Your event registration is complete!', lineGroupDescription: 'You can join the event LINE group using the button below.', photoRefusal: 'I refuse to have photos of my face uploaded.', openLine: 'Open in LINE', close: 'Close', noLineGroup: 'This event does not have a LINE group.', confirmRegistration: 'Event Registration', confirmRegistrationMessage: 'Please confirm the following and register.', registerButton: 'Register', eventDetails: 'Event Details', description: 'Description', noDescription: 'No description available' }
};

export function EventsPage({ language, events, attendingEvents, likedEvents, onToggleAttending, onToggleLike, highlightEventId, onAddEventParticipant, user }: EventsPageProps) {
  const t = translations[language];
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [lineGroupDialogOpen, setLineGroupDialogOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [detailEvent, setDetailEvent] = useState<Event | null>(null);
  const eventRefs = useRef<{ [key: number]: HTMLDivElement | null }>({});
  const [photoRefusal, setPhotoRefusal] = useState(false);
  const [registrationStep, setRegistrationStep] = useState<'confirm' | 'complete'>('confirm');

  useEffect(() => {
    if (!highlightEventId || !eventRefs.current[highlightEventId]) return;
    setTimeout(() => eventRefs.current[highlightEventId]?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);
  }, [highlightEventId]);

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

  const renderEventCard = (event: Event) => {
    const isLiked = likedEvents.has(event.id);
    const isAttending = attendingEvents.has(event.id);
    const displayTitle = language === 'ja' ? event.title : (event.titleEn || event.title);
    const displayLocation = language === 'ja' ? event.location : (event.locationEn || event.location);
    const isHighlighted = highlightEventId === event.id;
    return (
      <div key={event.id} ref={(el) => { eventRefs.current[event.id] = el; }}>
        <Card className={`overflow-hidden hover:shadow-lg transition-all duration-500 ${isHighlighted ? 'ring-4 ring-[#49B1E4] shadow-2xl' : ''}`}>
          <button onClick={() => { setDetailEvent(event); setDetailModalOpen(true); }} className="w-full h-48 sm:h-72 bg-linear-to-br from-blue-100 to-purple-100 relative cursor-pointer group">
            <img src={event.image} alt={displayTitle} loading="lazy" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center"><div className="opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 rounded-full p-2"><Info className="w-6 h-6 text-[#49B1E4]" /></div></div>
          </button>
          <CardContent className="pt-3 pb-3 px-3 sm:px-6">
            <h3 className="text-[#3D3D4E] mb-2 text-sm sm:text-base font-semibold">{displayTitle}</h3>
            {(event.description || event.descriptionJa) && <p className="text-xs sm:text-sm text-[#6B6B7A] mb-3 line-clamp-3">{language === 'ja' ? (event.descriptionJa || event.description) : (event.descriptionEn || event.descriptionJa || event.description)}</p>}
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs sm:text-sm text-[#6B6B7A] mb-2"><div className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4" /><span>{event.date}</span></div><div className="flex items-center gap-1"><Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4" /><span>{event.time}</span></div></div>
            <div className="flex items-start gap-2 text-xs sm:text-sm text-[#6B6B7A] mb-3"><MapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 mt-0.5" />{event.googleMapUrl ? <a href={event.googleMapUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-[#49B1E4] transition-colors underline break-all"><span>{displayLocation}</span><ExternalLink className="w-3 h-3 shrink-0" /></a> : <span className="break-all">{displayLocation}</span>}</div>
            <div className="flex items-center gap-3 sm:gap-4 mb-3"><button onClick={() => onToggleLike(event.id)} className="flex items-center gap-1 text-pink-600 hover:text-pink-700 transition-colors"><Heart className={`w-4 h-4 sm:w-5 sm:h-5 ${isLiked ? 'fill-current' : ''}`} /><span className="text-xs sm:text-sm">{event.likes} {t.likes}</span></button><div className="flex items-center gap-1 text-blue-600"><Users className="w-4 h-4 sm:w-5 sm:h-5" /><span className="text-xs sm:text-sm">{event.currentParticipants}/{event.maxParticipants} {t.participants}</span></div></div>
            {event.status === 'upcoming' && <Button className={`w-full ${isAttending ? 'bg-gray-400' : 'bg-[#49B1E4] hover:bg-[#3A9FD3]'}`} onClick={() => handleAttendClick(event)}>{isAttending ? t.registered : t.attend}</Button>}
            {event.status === 'past' && event.photos && <Button variant="outline" className="w-full"><Camera className="w-4 h-4 mr-2" />{t.viewPhotos} ({event.photos})</Button>}
          </CardContent>
        </Card>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <h1 className="text-gray-900">{t.title}</h1>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">{events.map(renderEventCard)}</div>
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
      <Dialog open={detailModalOpen} onOpenChange={setDetailModalOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          {detailEvent && (
            <>
              <DialogHeader><DialogTitle className="flex items-center gap-2 text-[#3D3D4E]"><Calendar className="w-5 h-5 text-[#49B1E4]" />{t.eventDetails}</DialogTitle></DialogHeader>
              <div className="space-y-4">
                {detailEvent.image && <div className="rounded-lg overflow-hidden"><img src={detailEvent.image} alt={language === 'ja' ? detailEvent.title : (detailEvent.titleEn || detailEvent.title)} className="w-full h-48 object-cover" /></div>}
                <h3 className="text-xl font-bold text-[#3D3D4E]">{language === 'ja' ? detailEvent.title : (detailEvent.titleEn || detailEvent.title)}</h3>
                <div className="bg-[#F5F1E8] rounded-lg p-4 space-y-3">
                  <div className="flex items-center gap-3 text-[#3D3D4E]"><Calendar className="w-5 h-5 text-[#49B1E4]" /><span>{detailEvent.date}</span></div>
                  <div className="flex items-center gap-3 text-[#3D3D4E]"><Clock className="w-5 h-5 text-[#49B1E4]" /><span>{detailEvent.time}</span></div>
                  <div className="flex items-start gap-3 text-[#3D3D4E]"><MapPin className="w-5 h-5 text-[#49B1E4] shrink-0 mt-0.5" /><div><span>{language === 'ja' ? detailEvent.location : (detailEvent.locationEn || detailEvent.location)}</span>{detailEvent.googleMapUrl && <a href={detailEvent.googleMapUrl} target="_blank" rel="noopener noreferrer" className="block text-sm text-[#49B1E4] hover:underline mt-1"><ExternalLink className="w-3 h-3 inline mr-1" />{language === 'ja' ? 'Google Mapで開く' : 'Open in Google Maps'}</a>}</div></div>
                </div>
                <div className="flex items-center gap-6"><button onClick={() => onToggleLike(detailEvent.id)} className="flex items-center gap-2 text-pink-600 hover:text-pink-700 transition-colors"><Heart className={`w-6 h-6 ${likedEvents.has(detailEvent.id) ? 'fill-current' : ''}`} /><span className="text-lg font-semibold">{detailEvent.likes}</span><span className="text-sm">{t.likes}</span></button><div className="flex items-center gap-2 text-blue-600"><Users className="w-6 h-6" /><span className="text-lg font-semibold">{detailEvent.currentParticipants}/{detailEvent.maxParticipants}</span><span className="text-sm">{t.participants}</span></div></div>
                <div className="border-t pt-4"><h4 className="font-semibold text-[#3D3D4E] mb-2">{t.description}</h4><p className="text-[#6B6B7A] whitespace-pre-wrap leading-relaxed">{language === 'ja' ? (detailEvent.descriptionJa || detailEvent.description || t.noDescription) : (detailEvent.descriptionEn || detailEvent.descriptionJa || detailEvent.description || t.noDescription)}</p></div>
                <div className="flex gap-3 pt-4 border-t">{detailEvent.status === 'upcoming' && <Button className={`flex-1 ${attendingEvents.has(detailEvent.id) ? 'bg-gray-400' : 'bg-[#49B1E4] hover:bg-[#3A9FD3]'}`} onClick={() => { setDetailModalOpen(false); handleAttendClick(detailEvent); }}>{attendingEvents.has(detailEvent.id) ? t.registered : t.attend}</Button>}{detailEvent.status === 'past' && detailEvent.photos && <Button variant="outline" className="flex-1"><Camera className="w-4 h-4 mr-2" />{t.viewPhotos} ({detailEvent.photos})</Button>}<Button variant="outline" onClick={() => setDetailModalOpen(false)}>{t.close}</Button></div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
