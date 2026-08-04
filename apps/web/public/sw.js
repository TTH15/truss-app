/*
 * Truss Service Worker
 *
 * 役割は2つ。
 * 1) PWA としてインストール可能にする（fetch ハンドラを持つこと自体が条件）
 * 2) Web Push の受信（push / notificationclick は Service Worker でしか扱えない）
 *
 * キャッシュ方針は「ネットワーク優先」。Next.js はビルドごとに JS のファイル名が変わるため、
 * HTML を積極的にキャッシュすると、デプロイ後に存在しないチャンクを参照する画面を
 * 掴ませてしまう。ここではオフライン時の最後の砦としてのみ使う。
 */

const CACHE_NAME = 'truss-shell-v1';

self.addEventListener('install', () => {
  // 新しい SW をすぐ有効化する（古い版が残り続けないように）
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)));
      await self.clients.claim();
    })()
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  // 画面遷移だけを対象にする。API や画像はブラウザの通常処理に任せる
  if (request.method !== 'GET' || request.mode !== 'navigate') return;

  event.respondWith(
    (async () => {
      try {
        const response = await fetch(request);
        const cache = await caches.open(CACHE_NAME);
        cache.put(request, response.clone());
        return response;
      } catch {
        const cached = await caches.match(request);
        if (cached) return cached;
        const fallback = await caches.match('/');
        if (fallback) return fallback;
        return new Response('オフラインです。接続を確認してください。', {
          status: 503,
          headers: { 'Content-Type': 'text/plain; charset=utf-8' },
        });
      }
    })()
  );
});

self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload = {};
  try {
    payload = event.data.json();
  } catch {
    payload = { title: 'Truss', body: event.data.text() };
  }

  const title = payload.title || 'Truss';
  const options = {
    body: payload.body || '',
    icon: '/icons/truss-192.png',
    badge: '/icons/truss-192.png',
    tag: payload.tag || 'truss-notification',
    data: { url: payload.url || '/dashboard' },
    // 同じ tag の通知が来たら黙って差し替えず、都度知らせる
    renotify: Boolean(payload.tag),
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/dashboard';

  event.waitUntil(
    (async () => {
      const allClients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      // 既に開いているタブがあればそれを使う（同じアプリを何枚も開かせない）
      for (const client of allClients) {
        if (client.url.includes(self.location.origin)) {
          await client.focus();
          if ('navigate' in client) await client.navigate(targetUrl);
          return;
        }
      }
      await self.clients.openWindow(targetUrl);
    })()
  );
});
