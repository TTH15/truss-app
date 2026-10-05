import test from 'node:test';
import assert from 'node:assert/strict';
import { buildMemberCheckinPayload, parseMemberCheckinPayload } from '../src/member-checkin.ts';

const id = 'a8d33f08-7da5-4d31-b772-97eddb48afc0';

test('会員QRには識別子だけを含め、UUIDの大文字小文字を正規化する', () => {
  assert.equal(buildMemberCheckinPayload(id.toUpperCase()), `truss-member:v1:${id}`);
  assert.deepEqual(parseMemberCheckinPayload(`truss-member:v1:${id.toUpperCase()}`), { userId: id });
});

test('外部QR・イベントQR・未対応版・余分な値・不正な会員IDを受け付けない', () => {
  for (const raw of [
    `https://example.com/${id}`, `truss-checkin:v1:12:${id}`, `truss-member:v2:${id}`,
    `truss-member:v1:${id}:extra`, ` truss-member:v1:${id}`, `truss-member:v1:${id}\n`,
    'truss-member:v1:', 'truss-member:v1:member@example.com', 'truss-member:v1:../users',
  ]) assert.equal(parseMemberCheckinPayload(raw), null, raw);
  assert.throws(() => buildMemberCheckinPayload('member@example.com'));
});
