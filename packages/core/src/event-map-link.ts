import { isLikelyLineInviteUrl } from "@platform/utils";
import type { Language } from "./types/app";

// isLikelyLineInviteUrl の実体は @platform/utils へ昇格(ADR-0002)。既存 import 互換のための再エクスポート。
export { isLikelyLineInviteUrl } from "@platform/utils";

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
