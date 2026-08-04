import { useState } from 'react';
import { Bell, X } from 'lucide-react';
import { Button } from '../ui/button';
import { toast } from 'sonner';
import { savePushSubscriptionRow } from '@truss/core';
import type { Language, User } from '@truss/core';
import { isPushSupported, isStandaloneDisplay, subscribeToPush } from '../../lib/web-push';
import { useLocalStorageDismissal } from '../../lib/use-local-storage-dismissal';

const DISMISSED_KEY = 'truss-push-prompt-dismissed-v1';

const translations = {
  ja: {
    title: 'お知らせを受け取りますか？',
    body: 'イベントの案内や運営からのメッセージを、アプリを開いていないときもお知らせします。',
    enable: '通知をオンにする',
    later: 'あとで',
    enabled: '通知をオンにしました',
    denied: 'ブラウザで通知がブロックされています。設定から許可してください。',
    notConfigured: '通知はまだ準備中です。',
    failed: '通知の設定に失敗しました',
  },
  en: {
    title: 'Turn on notifications?',
    body: 'Get event news and messages from the staff even when the app is closed.',
    enable: 'Turn on',
    later: 'Later',
    enabled: 'Notifications are on',
    denied: 'Notifications are blocked in your browser settings.',
    notConfigured: 'Notifications are not available yet.',
    failed: 'Could not turn on notifications',
  },
};

/**
 * 通知の許可を求める案内。
 *
 * ブラウザ標準の許可ダイアログは**一度断られると二度と出せない**（多くのブラウザで
 * 恒久的にブロックされる）。そのため、いきなり標準ダイアログを出さず、
 * まず理由を説明してから、押してもらったときに標準ダイアログを開く。
 * 「あとで」は記録するだけなので、次の機会に改めて出せる。
 */
export function PushPermissionPrompt({ user, language }: { user: User; language: Language }) {
  const t = translations[language];
  const [dismissed, dismiss] = useLocalStorageDismissal(DISMISSED_KEY);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  if (dismissed || done || !isPushSupported()) return null;
  // 既に許可/拒否が決まっている端末では出さない（標準ダイアログが出ないため意味がない）
  if (typeof Notification !== 'undefined' && Notification.permission !== 'default') return null;
  // iOS はホーム画面に追加していないと購読できないので、PWA の案内が先
  if (!isStandaloneDisplay() && /iPad|iPhone|iPod/.test(navigator.userAgent)) return null;

  const handleEnable = async () => {
    setBusy(true);
    try {
      const result = await subscribeToPush();
      if (!result.ok || !result.subscription) {
        if (result.reason === 'denied') toast.error(t.denied, { duration: 8000 });
        else if (result.reason === 'missing-vapid-key') toast.error(t.notConfigured);
        else toast.error(t.failed);
        dismiss();
        return;
      }
      const { error } = await savePushSubscriptionRow(user.id, {
        ...result.subscription,
        userAgent: navigator.userAgent,
      });
      if (error) throw error;
      toast.success(t.enabled);
      setDone(true);
    } catch {
      toast.error(t.failed);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative bg-white border border-[#49B1E4]/40 p-4 rounded-xl mb-4 shadow-sm">
      <button
        onClick={dismiss}
        className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors"
        aria-label={t.later}
      >
        <X className="w-4 h-4 text-gray-500" />
      </button>
      <div className="flex items-start gap-3 pr-6">
        <div className="w-10 h-10 bg-[#E0F3FB] rounded-full flex items-center justify-center shrink-0">
          <Bell className="w-5 h-5 text-[#49B1E4]" />
        </div>
        <div className="flex-1">
          <h4 className="font-bold text-[#3D3D4E]">{t.title}</h4>
          <p className="text-sm text-[#4A5565] mt-1">{t.body}</p>
          <div className="flex gap-2 mt-3">
            <Button size="sm" className="bg-[#49B1E4] hover:bg-[#3A9FD3]" onClick={handleEnable} disabled={busy}>
              {t.enable}
            </Button>
            <Button size="sm" variant="ghost" onClick={dismiss} disabled={busy}>
              {t.later}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
