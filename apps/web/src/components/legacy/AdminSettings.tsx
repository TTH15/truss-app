"use client";

import type { Language, User } from '@truss/core';
import { PushNotificationSetting } from './PushNotificationSetting';
import { AdminSiteDocuments } from './AdminSiteDocuments';
import type { SiteDocumentId } from '../../lib/site-documents';

interface AdminSettingsProps {
  language: Language;
  user: User;
  onAnnounce?: (docId: SiteDocumentId) => Promise<void>;
}

/** 運営画面の設定タブ。通知設定と規約・ポリシー管理をまとめる */
export function AdminSettings({ language, user, onAnnounce }: AdminSettingsProps) {
  return (
    <div className="max-w-3xl space-y-8">
      <section className="space-y-3">
        <h2 className="text-lg font-bold text-[#3D3D4E]">
          {language === 'ja' ? '通知設定' : 'Notification Settings'}
        </h2>
        <div className="max-w-sm">
          <PushNotificationSetting user={user} language={language} variant="admin" />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold text-[#3D3D4E]">
          {language === 'ja' ? '規約・ポリシーの管理' : 'Terms & Policy Documents'}
        </h2>
        <AdminSiteDocuments language={language} user={user} onAnnounce={onAnnounce} />
      </section>
    </div>
  );
}
