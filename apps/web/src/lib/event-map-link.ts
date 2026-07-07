import type { Language } from "../domain/types/app";

/** Google Map 用に不適切な URL（誤って LINE 招待などが入っている場合） */
export function isLikelyLineInviteUrl(url: string): boolean {
  const s = url.trim().toLowerCase();
  if (!s) return false;
  try {
    const host = new URL(s).hostname;
    return host.includes("line.me") || host.includes("lin.ee");
  } catch {
    return /line\.(me|jp)/i.test(s) || /lin\.ee/i.test(s);
  }
}

/**
 * イベント詳細の「Google Map で開く」用 href。
 * google_map_url が LINE 等のときは無視し、会場名から検索 URL を生成する。
 */
export function googleMapsHrefForEvent(
  event: { googleMapUrl?: string; location: string; locationEn?: string },
  language: Language
): string | null {
  const raw = event.googleMapUrl?.trim();
  if (raw && !isLikelyLineInviteUrl(raw)) return raw;
  const q = (language === "ja" ? event.location : (event.locationEn || event.location))?.trim();
  if (!q) return null;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
}
