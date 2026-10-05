import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronRight } from '@fortawesome/free-solid-svg-icons';
import type { BoardPost, GalleryPhoto, Language } from '@truss/core';
import { formatHomeDate } from './home-content';

export function HomeSectionHeading({ title, action, onClick }: { title: string; action: string; onClick: () => void }) {
  return <div className="home-section-heading"><h2>{title}</h2><button type="button" onClick={onClick}>{action}<FontAwesomeIcon icon={faChevronRight} /></button></div>;
}

export function MemoryPreview({ photos, language, onOpen }: { photos: GalleryPhoto[]; language: Language; onOpen: (id: number) => void }) {
  return <div className="home-memory-grid">{photos.map((photo) => <button type="button" key={photo.id} className="home-memory" onClick={() => onOpen(photo.id)}>
    <span className="home-memory-photo"><img src={typeof photo.image === 'string' ? photo.image : photo.image.src} alt="" loading="lazy" decoding="async" /></span>
    <span className="home-memory-name">{photo.eventName}</span><span className="home-memory-date">{formatHomeDate(photo.eventDate, language)}</span>
  </button>)}</div>;
}

export function BoardPreview({ posts, language, onOpen }: { posts: BoardPost[]; language: Language; onOpen: (id: number) => void }) {
  return <div className="home-board-preview">{posts.map((post) => <button type="button" className="home-board-row" key={post.id} onClick={() => onOpen(post.id)}>
    <span className="home-board-copy"><span className="home-board-title">{post.title}</span><span className="home-board-meta">{post.tag === 'event' && post.peopleNeeded === 0 ? (language === 'ja' ? '運営から' : 'From staff') : post.author}<span>{formatHomeDate(post.time.slice(0, 10), language)}</span></span></span><FontAwesomeIcon icon={faChevronRight} />
  </button>)}</div>;
}

export function HomeSectionState({ loading, error, emptyText, retry, language }: { loading?: boolean; error?: boolean; emptyText: string; retry?: () => void; language: Language }) {
  if (loading) return <div className="home-section-skeleton" role="status" aria-label={language === 'ja' ? '読み込み中' : 'Loading'}><span /><span /></div>;
  return <div className="home-section-empty">{error ? <><span>{language === 'ja' ? '読み込めませんでした' : 'Could not load this section'}</span><button type="button" onClick={retry}>{language === 'ja' ? '再試行' : 'Retry'}</button></> : emptyText}</div>;
}
