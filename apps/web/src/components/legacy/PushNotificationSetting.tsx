import { useState } from 'react';
import { Bell, BellOff } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { toast } from 'sonner';
import { savePushSubscriptionRow, deletePushSubscriptionRow } from '@truss/core';
import type { Language, User } from '@truss/core';
import {
  isPushSupported,
  isStandaloneDisplay,
  subscribeToPush,
  unsubscribeFromPush,
} from '../../lib/web-push';

const translations = {
  ja: {
    title: 'プッシュ通知',
    description: 'イベントの案内や運営からの連絡を、アプリを開いていないときも受け取れます。',
    enable: '通知をオンにする',
    disable: '通知をオフにする',
    working: '設定中...',
    enabled: 'この端末で通知を受け取ります',
    disabled: '通知をオフにしました',
    iosNeedsInstall:
      'iPhone / iPad では、ホーム画面に追加したアプリから開いた場合のみ通知を受け取れます。先にホーム画面へ追加してください。',
    unsupported: 'このブラウザは通知に対応していません。',
    denied: 'ブラウザで通知がブロックされています。設定から許可してください。',
    failed: '通知の設定に失敗しました',
    notConfigured: '通知はまだ準備中です（サーバー側の設定待ち）。',
  },
  en: {
    title: 'Push notifications',
    description: 'Get event news and messages from the staff even when the app is closed.',
    enable: 'Turn on notifications',
    disable: 'Turn off notifications',
    working: 'Working...',
    enabled: 'This device will receive notifications',
    disabled: 'Notifications turned off',
    iosNeedsInstall:
      'On iPhone / iPad, notifications only work when the app is opened from the home screen. Please add it to your home screen first.',
    unsupported: 'This browser does not support notifications.',
    denied: 'Notifications are blocked in your browser settings.',
    failed: 'Could not change the notification setting',
    notConfigured: 'Notifications are not available yet (server setup pending).',
  },
};

/**
 * この端末でプッシュ通知を受け取るかどうかの設定。
 * 購読は端末ごとなので「アカウントの設定」ではなく「この端末の設定」として見せる。
 */
export function PushNotificationSetting({ user, language }: { user: User; language: Language }) {
  const t = translations[language];
  const [busy, setBusy] = useState(false);
  const [enabled, setEnabled] = useState(false);

  if (!isPushSupported()) return null;

  const handleEnable = async () => {
    // iOS はホーム画面に追加していないと購読自体ができない
    if (!isStandaloneDisplay() && /iPad|iPhone|iPod/.test(navigator.userAgent)) {
      toast.error(t.iosNeedsInstall, { duration: 8000 });
      return;
    }
    setBusy(true);
    try {
      const result = await subscribeToPush();
      if (!result.ok || !result.subscription) {
        if (result.reason === 'denied') toast.error(t.denied, { duration: 8000 });
        else if (result.reason === 'missing-vapid-key') toast.error(t.notConfigured);
        else if (result.reason === 'unsupported') toast.error(t.unsupported);
        else toast.error(t.failed);
        return;
      }
      const { error } = await savePushSubscriptionRow(user.id, {
        ...result.subscription,
        userAgent: navigator.userAgent,
      });
      if (error) throw error;
      setEnabled(true);
      toast.success(t.enabled);
    } catch {
      toast.error(t.failed);
    } finally {
      setBusy(false);
    }
  };

  const handleDisable = async () => {
    setBusy(true);
    try {
      const endpoint = await unsubscribeFromPush();
      if (endpoint) await deletePushSubscriptionRow(endpoint);
      setEnabled(false);
      toast.success(t.disabled);
    } catch {
      toast.error(t.failed);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t.title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-[#6B6B7A]">{t.description}</p>
        {enabled ? (
          <Button variant="outline" onClick={handleDisable} disabled={busy}>
            <BellOff className="w-4 h-4 mr-2" />
            {busy ? t.working : t.disable}
          </Button>
        ) : (
          <Button className="bg-[#49B1E4] hover:bg-[#3A9FD3]" onClick={handleEnable} disabled={busy}>
            <Bell className="w-4 h-4 mr-2" />
            {busy ? t.working : t.enable}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
