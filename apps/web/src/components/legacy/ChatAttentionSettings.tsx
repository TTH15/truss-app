import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSliders } from '@fortawesome/free-solid-svg-icons';
import { Popover, PopoverTrigger, PopoverContent } from '../ui/popover';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Switch } from '../ui/switch';
import { toast } from 'sonner';
import { savePushSubscriptionRow, type AdminChatAttentionPreferences, type Language } from '@truss/core';
import { isPushSupported, isStandaloneDisplay, subscribeToPush } from '../../lib/web-push';

type Props = { language: Language; adminId?: string; preferences: AdminChatAttentionPreferences; ready: boolean; busy: boolean; save: (p: AdminChatAttentionPreferences) => Promise<void>; restore: () => Promise<void> };
export function ChatAttentionSettings({ language, adminId, preferences, ready, busy, save, restore }: Props) {
  const ja = language === 'ja';
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(preferences);
  const [subscribing, setSubscribing] = useState(false);
  const disabled = !ready || busy || subscribing;
  const failed = () => toast.error(ja ? '設定を保存できませんでした' : 'Could not save settings');
  const enableReminder = async (enabled: boolean) => {
    if (!enabled) { setDraft({ ...draft, reminderEnabled: false }); return; }
    if (!adminId || !isPushSupported()) { toast.error(ja ? 'この端末はプッシュ通知に対応していません' : 'Push notifications are not supported on this device'); return; }
    if (/iPad|iPhone|iPod/.test(navigator.userAgent) && !isStandaloneDisplay()) { toast.error(ja ? 'ホーム画面に追加したアプリから設定してください' : 'Open the installed app from your Home Screen'); return; }
    setSubscribing(true);
    try {
      const result = await subscribeToPush();
      if (!result.ok || !result.subscription) {
        toast.error(result.reason === 'denied'
          ? (ja ? '通知を有効にできませんでした。端末の通知許可を確認してください' : 'Could not enable notifications. Check your device permissions.')
          : (ja ? '現在、通知を有効にできません。時間をおいて再試行してください' : 'Notifications are unavailable. Please try again later.'));
        return;
      }
      const { error } = await savePushSubscriptionRow(adminId, { ...result.subscription, userAgent: navigator.userAgent });
      if (error) throw error;
      setDraft((prev) => ({ ...prev, reminderEnabled: true }));
    } catch { toast.error(ja ? '通知を保存できませんでした。再試行してください' : 'Could not save notifications. Please try again.'); }
    finally { setSubscribing(false); }
  };
  return <Popover open={open} onOpenChange={(value) => { if (busy || subscribing) return; if (value) setDraft(preferences); setOpen(value); }}>
    <PopoverTrigger asChild><Button size="icon" variant="ghost" className="ml-auto shrink-0 size-8" aria-label={ja ? '自分の未返信設定' : 'My reply reminders'}><FontAwesomeIcon icon={faSliders} className="size-4" /></Button></PopoverTrigger>
    <PopoverContent align="end" className="w-[min(320px,calc(100vw-24px))] max-h-[80dvh] overflow-y-auto space-y-5">
      <h4 className="font-medium">{ja ? '自分の未返信設定' : 'My reply reminders'}</h4>
      <label className="flex items-center justify-between gap-3 text-sm">{ja ? '未返信の印' : 'Show reply marks'}<Switch checked={draft.showReplyMarks} disabled={disabled} onCheckedChange={(v) => setDraft({ ...draft, showReplyMarks: v })} /></label>
      <label className="block space-y-2 text-sm"><span>{ja ? '印を出すまでの日数（0＝すぐ）' : 'Days before showing marks (0 = immediately)'}</span><Input type="number" min={0} max={30} step={1} disabled={disabled || !draft.showReplyMarks} value={Number.isFinite(draft.highlightAfterDays) ? draft.highlightAfterDays : ''} onChange={(e) => setDraft({ ...draft, highlightAfterDays: e.target.value === '' ? NaN : Number(e.target.value) })} /></label>
      <div className="space-y-3 border-t pt-4">
        <label className="flex items-center justify-between gap-3 text-sm">{ja ? '返信忘れのプッシュ通知' : 'Push reminders'}<Switch checked={draft.reminderEnabled} disabled={disabled} onCheckedChange={(v) => void enableReminder(v)} /></label>
        <label className="block space-y-2 text-sm"><span>{ja ? '通知までの日数' : 'Days before reminding'}</span><Input type="number" min={1} max={30} step={1} disabled={disabled || !draft.reminderEnabled} value={Number.isFinite(draft.remindAfterDays) ? draft.remindAfterDays : ''} onChange={(e) => setDraft({ ...draft, remindAfterDays: e.target.value === '' ? NaN : Number(e.target.value) })} /></label>
        <p className="text-xs text-gray-500">{ja ? '毎日10時台（日本時間）に確認。消した印は通知の対象外です。' : 'Checked daily around 10 am Japan time. Dismissed marks are excluded.'}</p>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button size="sm" variant="ghost" disabled={disabled} onClick={async () => { try { await restore(); toast.success(ja ? '消した印を戻しました' : 'Dismissed marks restored'); } catch { failed(); } }}>{ja ? '消した印を戻す' : 'Restore dismissed marks'}</Button>
        <Button size="sm" disabled={disabled || !Number.isInteger(draft.highlightAfterDays) || draft.highlightAfterDays < 0 || draft.highlightAfterDays > 30 || !Number.isInteger(draft.remindAfterDays) || draft.remindAfterDays < 1 || draft.remindAfterDays > 30} onClick={async () => { try { await save(draft); setOpen(false); toast.success(ja ? '設定を保存しました' : 'Settings saved'); } catch { failed(); } }}>{ja ? '保存' : 'Save'}</Button>
      </div>
    </PopoverContent>
  </Popover>;
}
