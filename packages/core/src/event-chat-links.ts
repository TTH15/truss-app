export type EventChatService = 'line' | 'instagram';
export type EventChatLink = { service: EventChatService; url: string };
type EventChats = { lineGroupLink?: string; lineGroupUrl?: string; instagramGroupLink?: string };

export function parseEventChatLink(raw: string | null | undefined): EventChatLink | null {
  if (!raw?.trim()) return null;
  const value = raw.trim();
  try {
    const url = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`);
    if (url.protocol !== 'https:' || url.username || url.password || url.port) return null;
    const host = url.hostname.toLowerCase();
    const service = ['line.me', 'www.line.me', 'lin.ee', 'line.naver.jp'].includes(host) ? 'line'
      : ['instagram.com', 'www.instagram.com', 'ig.me', 'www.ig.me'].includes(host) ? 'instagram' : null;
    return service ? { service, url: url.href } : null;
  } catch {
    return null;
  }
}

export function getEventChatLinks(event: EventChats): EventChatLink[] {
  const links: EventChatLink[] = [];
  // 以前のLINE欄へInstagramの招待リンクを保存していたイベントも扱う。
  const legacy = parseEventChatLink(event.lineGroupLink || event.lineGroupUrl);
  const instagram = parseEventChatLink(event.instagramGroupLink);
  if (legacy?.service === 'line') links.push(legacy);
  if (instagram?.service === 'instagram') links.push(instagram);
  else if (legacy?.service === 'instagram') links.push(legacy);
  return links;
}

export function normalizeEventChatLink(raw: string | null | undefined, service: EventChatService): string {
  if (!raw?.trim()) return '';
  const link = parseEventChatLink(raw);
  if (!link || link.service !== service) throw new Error(`${service === 'line' ? 'LINE' : 'Instagram'}: invalid invitation URL`);
  return link.url;
}
