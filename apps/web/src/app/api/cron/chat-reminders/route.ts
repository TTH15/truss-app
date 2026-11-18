import { createClient } from '@supabase/supabase-js';
import webpush from 'web-push';
import { runChatReminders } from '../../../../lib/server/chat-reminders';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  // Preview deployments must never send reminders to real users.
  if (process.env.VERCEL_ENV && process.env.VERCEL_ENV !== 'production') return Response.json({ skipped: 'non-production' });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!url || !key || !publicKey || !privateKey) return Response.json({ error: 'Push configuration missing' }, { status: 503 });
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || 'mailto:truss.kobe@gmail.com', publicKey, privateKey);
  const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  try {
    const result = await runChatReminders(client, (subscription, payload) => webpush.sendNotification(subscription, payload, { TTL: 3600, timeout: 5000 }));
    return Response.json(result, { status: result.failed > 0 ? 503 : 200 });
  } catch (error) {
    console.error('Chat reminder job failed', error);
    return Response.json({ error: 'Reminder job failed' }, { status: 500 });
  }
}
