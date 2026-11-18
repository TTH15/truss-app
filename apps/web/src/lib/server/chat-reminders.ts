import type { SupabaseClient } from '@supabase/supabase-js';

type Claim = { admin_user_id: string; thread_user_id: string; message_id: number; claim_token: string };
type Subscription = { endpoint: string; keys: { p256dh: string; auth: string } };
/** One digest per operator; only successful deliveries are marked sent. No chat messages are created. */
export async function runChatReminders(client: SupabaseClient, send: (subscription: Subscription, payload: string) => Promise<unknown>) {
  const { data, error } = await client.rpc('claim_admin_chat_reminders', { batch_size: 1000 });
  if (error) throw error;
  const groups = new Map<string, Claim[]>();
  for (const claim of (data ?? []) as Claim[]) groups.set(claim.admin_user_id, [...(groups.get(claim.admin_user_id) ?? []), claim]);
  let sent = 0;
  let failed = 0;
  let removed = 0;
  // Bound concurrency so a large queue does not exhaust the function's execution time.
  const entries = [...groups.entries()];
  for (let offset = 0; offset < entries.length; offset += 10) {
    await Promise.all(entries.slice(offset, offset + 10).map(async ([adminId, claims]) => {
      const { data: subscriptions, error: subError } = await client.from('push_subscriptions').select('endpoint,p256dh,auth').eq('user_id', adminId);
      if (subError) throw subError;
      const payload = JSON.stringify({ title: '返信を忘れていませんか？', body: `${claims.length}件のチャットが未返信です。`, url: '/admin-z8x4m2q9r7?tab=chat', tag: 'truss-chat-reply-reminder' });
      let delivered = false;
      await Promise.all((subscriptions ?? []).map(async (subscription) => {
        try {
          await send({ endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth } }, payload);
          delivered = true;
          sent++;
        } catch (error) {
          const status = (error as { statusCode?: number }).statusCode;
          if (status === 404 || status === 410) {
            const result = await client.from('push_subscriptions').delete().eq('endpoint', subscription.endpoint).eq('user_id', adminId);
            if (result.error) throw result.error;
            removed++;
          } else { failed++; }
        }
      }));
      if (delivered) {
        for (let start = 0; start < claims.length; start += 100) {
          const result = await client.from('admin_chat_reminder_deliveries').update({ delivered_at: new Date().toISOString() }).eq('admin_user_id', adminId).in('claim_token', claims.slice(start, start + 100).map((c) => c.claim_token));
          if (result.error) throw result.error;
        }
      }
    }));
  }
  return { claimed: (data ?? []).length, sent, failed, removed };
}
