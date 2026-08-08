/**
 * Service Worker の登録と Web Push の購読。
 *
 * 前提と制約:
 * - iOS は 16.4 以降で Web Push に対応するが、**ホーム画面に追加した状態（standalone）でしか動かない**。
 *   Safari のタブで開いているだけでは購読できないため、PWA インストールの導線とセットで意味を持つ。
 * - 通知の許可要求はユーザー操作（クリック等）の中から呼ぶこと。ページ読み込み時に自動で出すと
 *   ブラウザに無視されるうえ、拒否されると次から出せなくなる。
 */

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

export function isPushSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

/** iOS はホーム画面に追加していないと購読できない */
export function isStandaloneDisplay(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return null;
  try {
    return await navigator.serviceWorker.register('/sw.js', { scope: '/' });
  } catch (error) {
    console.error('Service worker registration failed:', error);
    return null;
  }
}

/** VAPID の公開鍵は base64url。PushManager には Uint8Array で渡す */
function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(base64);
  const bytes = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i += 1) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

export type PushSubscriptionPayload = {
  endpoint: string;
  p256dh: string;
  auth: string;
};

function toPayload(subscription: PushSubscription): PushSubscriptionPayload | null {
  const json = subscription.toJSON();
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) return null;
  return { endpoint: json.endpoint, p256dh: json.keys.p256dh, auth: json.keys.auth };
}

/**
 * 通知の許可を求め、購読を作って返す。
 * 呼び出し側で DB に保存する（保存は @truss/core の savePushSubscriptionRow）。
 */
export type SubscribeFailureReason =
  | 'unsupported'
  | 'missing-vapid-key'
  | 'denied'
  | 'no-service-worker'
  | 'invalid-subscription'
  | 'subscribe-failed';

/**
 * このプロジェクトは tsconfig の `strict: false`（= strictNullChecks なし）のため、
 * 判別可能ユニオンの絞り込みが効かない。単一の形にして呼び出し側で個別に判定する。
 */
export type SubscribeResult = {
  ok: boolean;
  reason?: SubscribeFailureReason;
  subscription?: PushSubscriptionPayload;
};

export async function subscribeToPush(): Promise<SubscribeResult> {
  if (!isPushSupported()) return { ok: false, reason: 'unsupported' };
  if (!VAPID_PUBLIC_KEY) return { ok: false, reason: 'missing-vapid-key' };

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return { ok: false, reason: 'denied' };

  const registration = (await navigator.serviceWorker.getRegistration()) ?? (await registerServiceWorker());
  if (!registration) return { ok: false, reason: 'no-service-worker' };
  await navigator.serviceWorker.ready;

  try {
    const existing = await registration.pushManager.getSubscription();
    const subscription =
      existing ??
      (await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      }));
    const payload = toPayload(subscription);
    if (!payload) return { ok: false, reason: 'invalid-subscription' };
    return { ok: true, subscription: payload };
  } catch (error) {
    console.error('Push subscription failed:', error);
    return { ok: false, reason: 'subscribe-failed' };
  }
}

/**
 * 運営から指定ユーザーへ Web Push を送る（実際の送信はサーバー側 /api/push/send）。
 * 呼び出しには本人のアクセストークンが要る（サーバー側で is_admin を検証するため）。
 */
/**
 * 運営向けの通知を発生させる（会員の操作が起点。宛先・タイトルはサーバー側で決まる）。
 * 通知の失敗を元の操作の失敗にしないため、例外は投げず null を返す。
 */
export async function notifyAdminsByPush(
  accessToken: string,
  input: { kind: 'new_application' | 'member_message'; detail?: string }
): Promise<{ sent: number; failed: number; removed: number } | null> {
  try {
    const response = await fetch('/api/push/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ toAdmins: input }),
    });
    if (!response.ok) {
      console.error('Admin push send failed:', response.status, await response.text());
      return null;
    }
    return await response.json();
  } catch (error) {
    console.error('Admin push send failed:', error);
    return null;
  }
}

export async function sendPushNotification(
  accessToken: string,
  input: {
    userIds: string[];
    title: string;
    body?: string;
    url?: string;
    tag?: string;
    /** 会員ごとの受信設定（users.notify_*）で絞り込む種類 */
    category?: 'message' | 'event' | 'announcement';
  }
): Promise<{ sent: number; failed: number; removed: number } | null> {
  try {
    const response = await fetch('/api/push/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(input),
    });
    if (!response.ok) {
      console.error('Push send failed:', response.status, await response.text());
      return null;
    }
    return await response.json();
  } catch (error) {
    console.error('Push send failed:', error);
    return null;
  }
}

/** 端末側の購読を解除して endpoint を返す（DB からの削除は呼び出し側で行う） */
export async function unsubscribeFromPush(): Promise<string | null> {
  if (!isPushSupported()) return null;
  const registration = await navigator.serviceWorker.getRegistration();
  const subscription = await registration?.pushManager.getSubscription();
  if (!subscription) return null;
  const endpoint = subscription.endpoint;
  await subscription.unsubscribe();
  return endpoint;
}
