import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheck, faClock, faLocationDot, faTicket, faArrowUpRightFromSquare } from '@fortawesome/free-solid-svg-icons';
import { googleMapsHrefForEvent, type Event, type EventParticipant, type Language, type User } from '@truss/core';
import { formatHomeDate } from './home-content';
import { MemberQrCard } from './MemberQrCard';

export function ParticipationTicket({ event, user, participant, language }: {
  event: Event; user: User; participant?: EventParticipant; language: Language;
}) {
  const ja = language === 'ja';
  const maps = googleMapsHrefForEvent(event, language);
  return <section className="participation-ticket" aria-label={ja ? '参加チケット' : 'Participation ticket'}>
    <div className="participation-ticket-top"><span><FontAwesomeIcon icon={faTicket} />{ja ? '参加チケット' : 'Participation ticket'}</span><span className="participation-ticket-status"><FontAwesomeIcon icon={faCheck} />{participant?.attended ? (ja ? '受付済み' : 'Checked in') : (ja ? '申し込み済み' : 'Registered')}</span></div>
    <h3>{ja ? event.title : event.titleEn || event.title}</h3>
    <div className="participation-ticket-meta">
      <strong>{formatHomeDate(event.date, language, true)}</strong>
      {event.time && <span><FontAwesomeIcon icon={faClock} />{event.time}</span>}
      <span><FontAwesomeIcon icon={faLocationDot} />{ja ? event.location : event.locationEn || event.location}</span>
      {maps && <a href={maps} target="_blank" rel="noopener noreferrer">{ja ? '地図' : 'Map'}<FontAwesomeIcon icon={faArrowUpRightFromSquare} /></a>}
    </div>
    <div className="participation-ticket-stub"><div><strong>{user.name}</strong>{participant?.photoRefusal && <span>{ja ? '顔写真の掲載不可' : 'No face photos'}</span>}</div><MemberQrCard user={user} language={language} /></div>
  </section>;
}
