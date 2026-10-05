import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronRight, faLocationDot } from '@fortawesome/free-solid-svg-icons';
import type { Event, Language } from '@truss/core';
import { formatHomeDate } from './home-content';

export function NextJourneyTicket({ event, language, registered, onOpen }: { event: Event; language: Language; registered: boolean; onOpen: () => void }) {
  const date = new Date(`${event.date}T12:00:00`);
  const month = date.toLocaleDateString(language === 'ja' ? 'ja-JP' : 'en-US', { month: 'short' });
  const title = language === 'ja' ? event.title : (event.titleEn || event.title);
  return (
    <button type="button" className="journey-ticket" onClick={onOpen} aria-label={`${title} ${language === 'ja' ? '詳細を見る' : 'View details'}`}>
      <span className="journey-ticket-date" aria-hidden="true"><span>{month}</span><strong>{date.getDate()}</strong><span>{date.toLocaleDateString(language === 'ja' ? 'ja-JP' : 'en-US', { weekday: 'short' })}</span></span>
      <span className="journey-ticket-body">
        <span className="journey-ticket-title">{title}</span>
        <span className="journey-ticket-time">{formatHomeDate(event.date, language, true)}{event.time && <span>{event.time}</span>}</span>
        {event.location && <span className="journey-ticket-location"><FontAwesomeIcon icon={faLocationDot} />{language === 'ja' ? event.location : (event.locationEn || event.location)}</span>}
        <span className="journey-ticket-footer">
          {registered && <span className="journey-registered">{language === 'ja' ? '申し込み済み' : 'Registered'}</span>}
          <span className="journey-ticket-action">{language === 'ja' ? '詳細を見る' : 'View details'}<FontAwesomeIcon icon={faChevronRight} /></span>
        </span>
      </span>
    </button>
  );
}
