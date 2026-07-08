/**
 * イベント参加チェックイン用QRペイロードの組み立て・解析。
 * 署名は付与しない: `event_participants.attended` の更新はRLSで管理者のみに制限済み
 * （supabase/migrations/015_truss_event_participants_attendance_paid.sql）のため、
 * QR自体は「eventIdとuserIdを運営端末に伝える手段」でしかなく、実際の確定権限は
 * DB側のRLSが担保する。対面でのスキャンという運用上、なりすまし対策としては十分。
 */
const QR_PREFIX = "truss-checkin";
const QR_VERSION = "v1";

export function buildEventCheckinPayload(eventId: number, userId: string): string {
  return `${QR_PREFIX}:${QR_VERSION}:${eventId}:${userId}`;
}

export function parseEventCheckinPayload(
  raw: string
): { eventId: number; userId: string } | null {
  const parts = raw.split(":");
  if (parts.length !== 4 || parts[0] !== QR_PREFIX || parts[1] !== QR_VERSION) return null;
  const eventId = Number(parts[2]);
  const userId = parts[3];
  if (!Number.isFinite(eventId) || !userId) return null;
  return { eventId, userId };
}
