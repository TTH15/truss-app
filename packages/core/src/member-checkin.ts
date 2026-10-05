/** 会員QRは受付で会員を特定するための識別子。出席確定や本人確認の権限は持たない。 */
const MEMBER_QR_PREFIX = 'truss-member:v1:';
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function buildMemberCheckinPayload(userId: string): string {
  if (!UUID_PATTERN.test(userId)) throw new Error('Invalid member id');
  return `${MEMBER_QR_PREFIX}${userId.toLowerCase()}`;
}

export function parseMemberCheckinPayload(raw: string): { userId: string } | null {
  if (!raw.startsWith(MEMBER_QR_PREFIX)) return null;
  const userId = raw.slice(MEMBER_QR_PREFIX.length);
  return UUID_PATTERN.test(userId) ? { userId: userId.toLowerCase() } : null;
}
