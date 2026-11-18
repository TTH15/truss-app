import test from 'node:test';
import assert from 'node:assert/strict';
import { runChatReminders } from '../src/lib/server/chat-reminders.ts';

function fixture(options = {}) {
  const updates = [];
  const deletes = [];
  const client = {
    rpc: async () => ({ data: options.claims ?? [{ admin_user_id: 'staff-a', thread_user_id: 'member-a', message_id: 1, claim_token: 'lease-a' }], error: options.claimError ? new Error('fixture rpc failure') : null }),
    from: (table) => ({
      select: () => ({ eq: async () => ({ data: (options.endpoints ?? ['https://example.invalid/ok']).map((endpoint) => ({ endpoint, p256dh: 'test', auth: 'test' })), error: null }) }),
      delete: () => ({ eq: (_field, endpoint) => ({ eq: async (_ownerField, owner) => { deletes.push([endpoint, owner]); return { error: null }; } }) }),
      update: (values) => ({ eq: (_field, owner) => ({ in: async (_tokens, tokens) => { updates.push([table, owner, values, tokens]); return { error: null }; } }) }),
    }),
  };
  return { client, updates, deletes };
}

test('reminder digest is separate from incoming chat; successful sends record only the claimed operator and tokens', async () => {
  const f = fixture({ claims: [
    { admin_user_id: 'staff-a', thread_user_id: 'member-a', message_id: 1, claim_token: 'lease-a' },
    { admin_user_id: 'staff-a', thread_user_id: 'member-b', message_id: 2, claim_token: 'lease-b' },
  ], endpoints: ['https://example.invalid/ok', 'https://example.invalid/expired'] });
  const payloads = [];
  const result = await runChatReminders(f.client, async (subscription, payload) => {
    if (subscription.endpoint.endsWith('expired')) throw { statusCode: 410 };
    payloads.push(JSON.parse(payload));
  });
  assert.deepEqual(result, { claimed: 2, sent: 1, failed: 0, removed: 1 });
  assert.equal(payloads[0].title, '返信を忘れていませんか？');
  assert.equal(payloads[0].body, '2件のチャットが未返信です。');
  assert.equal(payloads[0].url, '/admin-z8x4m2q9r7?tab=chat');
  assert.deepEqual(f.deletes, [['https://example.invalid/expired', 'staff-a']]);
  assert.equal(f.updates.length, 1);
  assert.equal(f.updates[0][0], 'admin_chat_reminder_deliveries');
  assert.deepEqual(f.updates[0][3], ['lease-a', 'lease-b']);
});

test('transient failure and no subscription do not mark reminders delivered, permitting a later retry', async () => {
  for (const endpoints of [[], ['https://example.invalid/failing']]) {
    const f = fixture({ endpoints });
    const result = await runChatReminders(f.client, async () => { throw { statusCode: 503 }; });
    assert.equal(result.failed, endpoints.length);
    assert.equal(f.updates.length, 0);
  }
});

test('candidate query failure stops delivery', async () => {
  const f = fixture({ claimError: true });
  let sends = 0;
  await assert.rejects(runChatReminders(f.client, async () => { sends++; }), /fixture rpc failure/);
  assert.equal(sends, 0);
});
