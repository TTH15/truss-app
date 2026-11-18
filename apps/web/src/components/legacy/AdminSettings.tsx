"use client";

import { useRef, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBell, faChevronRight, faCompass, faFileLines, faShieldHalved } from '@fortawesome/free-solid-svg-icons';
import type { Language, User } from '@truss/core';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { PushNotificationSetting } from './PushNotificationSetting';
import { AdminSiteDocuments } from './AdminSiteDocuments';
import { AdminUserTourAnnouncement } from './AdminUserTourAnnouncement';
import type { SiteDocumentId } from '../../lib/site-documents';

type SettingId = 'notifications' | 'guide' | SiteDocumentId;
interface AdminSettingsProps {
  language: Language;
  user: User;
  onAnnounce?: (docId: SiteDocumentId) => Promise<void>;
}

export function AdminSettings({ language, user, onAnnounce }: AdminSettingsProps) {
  const [active, setActive] = useState<SettingId>('notifications');
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement | null>(null);
  const ja = language === 'ja';
  const labels: Record<SettingId, string> = {
    notifications: ja ? 'プッシュ通知' : 'Push notifications',
    guide: ja ? 'ガイドツアーの案内' : 'Welcome guide announcement',
    'terms-of-service': ja ? '利用規約' : 'Terms of service',
    'privacy-policy': ja ? 'プライバシーポリシー' : 'Privacy policy',
  };
  const groups = [
    { title: ja ? '自分の設定' : 'Personal settings', items: [{ id: 'notifications' as const, icon: faBell }] },
    { title: ja ? 'メンバー向けの設定' : 'Member-facing settings', items: [
      { id: 'guide' as const, icon: faCompass },
      { id: 'terms-of-service' as const, icon: faFileLines },
      { id: 'privacy-policy' as const, icon: faShieldHalved },
    ] },
  ];

  return <div className="max-w-3xl space-y-7">
    <h1 className="text-xl font-semibold text-[#3D3D4E]">{ja ? '設定' : 'Settings'}</h1>
    {groups.map((group) => <section key={group.title} className="space-y-3">
      <h2 className="text-sm font-medium text-[#6B6B7A]">{group.title}</h2>
      <div className="divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-200 bg-white">
        {group.items.map(({ id, icon }) => <button key={id} type="button" onClick={(event) => { trigger.current = event.currentTarget; setActive(id); setOpen(true); }}
          className="flex min-h-16 w-full items-center gap-4 px-5 py-4 text-left text-[#3D3D4E] transition-colors hover:bg-gray-50 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#49B1E4]"
          aria-haspopup="dialog">
          <FontAwesomeIcon icon={icon} className="size-4 shrink-0 text-[#6B6B7A]" />
          <span className="min-w-0 flex-1 text-sm font-medium">{labels[id]}</span>
          <FontAwesomeIcon icon={faChevronRight} className="size-3 shrink-0 text-[#6B6B7A]" />
        </button>)}
      </div>
    </section>)}
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent aria-describedby={undefined} onCloseAutoFocus={(event) => { event.preventDefault(); trigger.current?.focus(); }} className={`flex max-h-[calc(100dvh-2rem)] flex-col gap-0 overflow-hidden p-0 ${active === 'notifications' ? 'sm:max-w-lg' : 'sm:max-w-4xl'}`}>
        <DialogHeader className="border-b border-gray-200 px-5 py-5 pr-14 text-left">
          <DialogTitle>{labels[active]}</DialogTitle>
        </DialogHeader>
        <div className="min-h-0 overflow-y-auto overscroll-contain p-4 sm:p-6">
          {active === 'notifications' && <PushNotificationSetting user={user} language={language} variant="admin" embedded />}
          {active === 'guide' && <AdminUserTourAnnouncement language={language} embedded />}
          {(active === 'terms-of-service' || active === 'privacy-policy') && <AdminSiteDocuments key={active} documentId={active} language={language} user={user} onAnnounce={onAnnounce} embedded />}
        </div>
      </DialogContent>
    </Dialog>
  </div>;
}
