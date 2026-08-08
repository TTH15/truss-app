import { Calendar as CalendarIcon, Clock, MapPin, Users, Edit2, Heart, Share2, Eye } from 'lucide-react';
import type { Language } from '@truss/core';
import { Button } from '../../ui/button';
import { linkifyText } from '../../../lib/linkify';
import { getEventText, parseEventTime } from './event-form';
import { ParticipantList } from './ParticipantList';
import type { AdminEventsCopy } from './translations';
import type { AdminEvent } from './types';
import type { EventParticipants } from './useEventParticipants';

interface EventDetailModalProps {
  language: Language;
  t: AdminEventsCopy;
  event: AdminEvent;
  participants: EventParticipants;
  /** インサイト用のユニーク閲覧数。読み込み中・未適用は null（インサイト行を出さない） */
  viewCount: number | null;
  /** 共有リンク。発行前（shareToken 無し）は null */
  shareUrl: string | null;
  onShare: () => void;
  onEdit: () => void;
  onClose: () => void;
  onSendEmail: () => void;
}

export function EventDetailModal({
  language,
  t,
  event,
  participants,
  viewCount,
  shareUrl,
  onShare,
  onEdit,
  onClose,
  onSendEmail,
}: EventDetailModalProps) {
  const locale = language === 'ja' ? 'ja' : 'en';
  const title = getEventText(event, 'title', locale);
  const description = getEventText(event, 'description', locale);
  const location = getEventText(event, 'location', locale);
  const { startTime, endTime } = parseEventTime(event);
  const participationFee = Number(event?.participationFee ?? 0);
  const isFull = participants.count >= event.maxParticipants;

  return (
    <div className="fixed inset-0 z-50 bg-black/45 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className={`bg-white rounded-[14px] p-6 relative w-full max-w-[1100px] max-h-[90vh] overflow-y-auto border-2 ${
          isFull ? 'border-[#00A63E]' : 'border-[#49B1E4]'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 左側：イベント情報 */}
          <div className="space-y-4">
            <div className="flex items-start justify-between">
              <h3 className="text-[#3D3D4E] text-lg font-semibold tracking-[-0.4395px]">
                {title || (language === 'ja' ? '無題のイベント' : 'Untitled event')}
              </h3>
              <Button variant="ghost" size="sm" className="text-[#3D3D4E] h-8" onClick={onEdit}>
                <Edit2 className="w-4 h-4" />
              </Button>
            </div>

            {event.image && (
              <div className="rounded-[10px] overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={event.image} alt={title} className="w-full h-[126px] object-cover" />
              </div>
            )}

            <div className="bg-[#F9FAFB] rounded-lg p-4">
              <h4 className="text-[#3D3D4E] text-sm font-semibold mb-2">
                {language === 'ja' ? 'イベント説明' : 'Event Description'}
              </h4>
              <p className="text-[#3D3D4E] text-sm leading-relaxed whitespace-pre-wrap">
                {description ? linkifyText(description) : (language === 'ja' ? '説明文がありません' : 'No description')}
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-[#3D3D4E] text-sm">
                <CalendarIcon className="w-4 h-4" />
                <span>{event.date}</span>
              </div>
              <div className="flex items-center gap-2 text-[#3D3D4E] text-sm">
                <Clock className="w-4 h-4" />
                <span>
                  {startTime || endTime ? `${startTime || '--:--'} 〜 ${endTime || '--:--'}` : '--:--'}
                </span>
              </div>
              <div className="flex items-center gap-2 text-[#3D3D4E] text-sm">
                <MapPin className="w-4 h-4" />
                <span>{location}</span>
              </div>
              {event.googleMapUrl && (
                <div className="flex items-center gap-2 text-[#3D3D4E] text-sm">
                  <a
                    href={event.googleMapUrl}
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
                <span className={`font-semibold ${isFull ? 'text-[#00A63E]' : 'text-[#49B1E4]'}`}>
                  {participants.count} / {event.maxParticipants}
                </span>
                <span>{language === 'ja' ? '参加者' : 'Participants'}</span>
              </div>
              <div className="flex items-center gap-2 text-[#3D3D4E] text-sm">
                <span className="font-semibold">¥{participationFee.toLocaleString()}</span>
                <span>{language === 'ja' ? '参加費' : 'Participation fee'}</span>
              </div>
              <div className="flex items-center gap-2 text-[#3D3D4E] text-sm">
                <Heart className="w-4 h-4 text-red-500" />
                <span className="font-semibold text-red-500">{event.likes || 0}</span>
                <span>{language === 'ja' ? 'いいね' : 'Likes'}</span>
              </div>
              {/* インサイト: 閲覧 → 参加（クリック率）→ 出席。閲覧の記録が無い環境では行ごと出さない */}
              {viewCount !== null && (
                <div className="flex items-center gap-2 text-[#3D3D4E] text-sm">
                  <Eye className="w-4 h-4" />
                  <span className="font-semibold">{viewCount}</span>
                  <span>{language === 'ja' ? '閲覧' : 'Views'}</span>
                  {viewCount > 0 && (
                    <span className="text-[#6B6B7A]">
                      → {language === 'ja' ? '参加' : 'joined'} {Math.round((participants.count / viewCount) * 100)}%
                    </span>
                  )}
                  {participants.attendedCount > 0 && participants.count > 0 && (
                    <span className="text-[#6B6B7A]">
                      / {language === 'ja' ? '出席' : 'attended'} {Math.round((participants.attendedCount / participants.count) * 100)}%
                    </span>
                  )}
                </div>
              )}
              {shareUrl && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onShare}
                  className="w-fit text-[#49B1E4] border-[#49B1E4] hover:bg-[#EAF6FD]"
                >
                  <Share2 className="w-4 h-4 mr-1" />
                  {language === 'ja' ? '共有リンク' : 'Share link'}
                </Button>
              )}
            </div>
          </div>

          {/* 右側：参加者一覧 */}
          <ParticipantList
            language={language}
            t={t}
            participants={participants}
            participationFee={participationFee}
            onSendEmail={onSendEmail}
          />
        </div>
      </div>
    </div>
  );
}
