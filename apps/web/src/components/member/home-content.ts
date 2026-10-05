import { isExpiredBoardPost, toLocalDateKey, type BoardPost, type Event, type GalleryPhoto } from '@truss/core';

export function selectNextEvent(events: Event[], now = new Date()) {
  const today = toLocalDateKey(now);
  return events
    .filter((event) => event.status === 'upcoming' && event.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date) || (a.startTime || a.time).localeCompare(b.startTime || b.time))[0];
}

export function selectRecentMemories(photos: GalleryPhoto[]) {
  const seen = new Set<number>();
  return photos
    .filter((photo) => photo.approved)
    .sort((a, b) => b.eventDate.localeCompare(a.eventDate) || b.uploadedAt.localeCompare(a.uploadedAt))
    .filter((photo) => {
      if (seen.has(photo.eventId)) return false;
      seen.add(photo.eventId);
      return true;
    })
    .slice(0, 3);
}

export function selectHomeBoardPosts(posts: BoardPost[], now = new Date()) {
  return posts
    .filter((post) => post.displayType === 'board' && !post.isHidden && !post.isDeleted && !isExpiredBoardPost(post, now))
    .sort((a, b) => {
      const pinned = Number(Boolean(b.isPinned)) - Number(Boolean(a.isPinned));
      if (pinned) return pinned;
      if (a.isPinned && b.isPinned) return (a.pinOrder ?? Number.MAX_SAFE_INTEGER) - (b.pinOrder ?? Number.MAX_SAFE_INTEGER);
      const announcement = Number(b.tag === 'event' && b.peopleNeeded === 0) - Number(a.tag === 'event' && a.peopleNeeded === 0);
      return announcement || (Date.parse(b.time) || 0) - (Date.parse(a.time) || 0);
    })
    .slice(0, 2);
}

export function formatHomeDate(date: string, language: 'ja' | 'en', weekday = false) {
  const parsed = new Date(`${date}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleDateString(language === 'ja' ? 'ja-JP' : 'en-US', {
    month: 'short', day: 'numeric', ...(weekday ? { weekday: 'short' as const } : {}),
  });
}
