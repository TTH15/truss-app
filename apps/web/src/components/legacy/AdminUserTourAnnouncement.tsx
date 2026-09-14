"use client";

import { useEffect, useState, type FormEvent } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFloppyDisk } from '@fortawesome/free-solid-svg-icons';
import { toast } from 'sonner';
import {
  DEFAULT_USER_TOUR_ANNOUNCEMENT,
  USER_TOUR_ANNOUNCEMENT_LIMITS,
  normalizeUserTourAnnouncement,
  queryUserTourAnnouncement,
  upsertUserTourAnnouncementRow,
  validateUserTourAnnouncement,
  type Language,
  type UserTourAnnouncement,
} from '@truss/core';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';

const translations = {
  ja: {
    help: '初回ガイドの最後に表示する案内です。保存後、次にガイドを開いたときから反映されます。',
    title: 'タイトル',
    description: '本文',
    linkLabel: 'ボタンの文言',
    linkUrl: '参加リンク（日本語・英語共通）',
    linkHint: 'https:// から始まる招待リンクを入力してください。',
    loading: '読み込み中...',
    loadError: '案内を読み込めませんでした。時間をおいて再試行してください。',
    retry: '再読み込み',
    preview: 'プレビュー',
    save: '保存する',
    saving: '保存中...',
    saved: '保存しました。次にガイドを開いたときから反映されます。',
    saveError: '保存に失敗しました。入力内容は残っています。時間をおいて再試行してください。',
    required: '日本語・英語のすべての項目と参加リンクを入力してください。',
    'too-long': '入力内容が文字数の上限を超えています。',
    'invalid-url': '参加リンクには、ユーザー名やパスワードを含まない https:// の URL を入力してください。',
  },
  en: {
    help: 'This announcement appears at the end of the welcome guide. Changes apply the next time the guide is opened.',
    title: 'Title',
    description: 'Description',
    linkLabel: 'Button label',
    linkUrl: 'Invitation link (shared by Japanese and English)',
    linkHint: 'Enter an invitation link starting with https://.',
    loading: 'Loading...',
    loadError: 'Could not load the announcement. Please try again later.',
    retry: 'Reload',
    preview: 'Preview',
    save: 'Save',
    saving: 'Saving...',
    saved: 'Saved. Changes apply the next time the guide is opened.',
    saveError: 'Could not save. Your edits are still here. Please try again later.',
    required: 'Complete all Japanese and English fields and the invitation link.',
    'too-long': 'The content exceeds the character limit.',
    'invalid-url': 'Enter a valid https:// invitation URL without a username or password.',
  },
};

export function AdminUserTourAnnouncement({ language }: { language: Language }) {
  const [draft, setDraft] = useState<UserTourAnnouncement | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [saving, setSaving] = useState(false);
  const t = translations[language];

  useEffect(() => {
    let cancelled = false;
    void queryUserTourAnnouncement(AbortSignal.timeout(10000))
      .then((announcement) => {
        if (!cancelled) setDraft(announcement ?? DEFAULT_USER_TOUR_ANNOUNCEMENT);
      })
      .catch((error) => {
        if (cancelled) return;
        console.error('Failed to load user tour announcement:', error);
        setLoadError(true);
      });
    return () => { cancelled = true; };
  }, [loadAttempt]);

  const updateLocalized = (field: 'title' | 'description' | 'linkLabel', locale: Language, value: string) => {
    setDraft((current) => current && ({ ...current, [field]: { ...current[field], [locale]: value } }));
  };

  const handleSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!draft || saving) return;
    const announcement = normalizeUserTourAnnouncement(draft);
    const validationError = validateUserTourAnnouncement(announcement);
    if (validationError) {
      toast.error(t[validationError]);
      return;
    }
    setSaving(true);
    try {
      const { error } = await upsertUserTourAnnouncementRow(announcement);
      if (error) throw error;
      setDraft(announcement);
      toast.success(t.saved);
    } catch (error) {
      console.error('Failed to save user tour announcement:', error);
      toast.error(t.saveError);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6 space-y-4">
      <p className="text-sm text-[#6B6B7A] leading-relaxed">{t.help}</p>
      {loadError ? (
        <div role="alert" className="space-y-3">
          <p className="text-sm text-red-600">{t.loadError}</p>
          <Button variant="outline" onClick={() => {
            setLoadError(false);
            setLoadAttempt((attempt) => attempt + 1);
          }}>{t.retry}</Button>
        </div>
      ) : !draft ? (
        <p role="status" className="py-6 text-sm text-[#6B6B7A]">{t.loading}</p>
      ) : (
        <form onSubmit={handleSave} className="space-y-5">
          <fieldset disabled={saving} className="space-y-5">
            <div className="grid gap-6 sm:grid-cols-2">
              {(['ja', 'en'] as const).map((locale) => (
                <fieldset key={locale} className="min-w-0 space-y-3">
                  <legend className="mb-3 font-semibold text-[#3D3D4E]">{locale === 'ja' ? '日本語' : 'English'}</legend>
                  <div className="space-y-2">
                    <Label htmlFor={`tour-title-${locale}`}>{t.title}</Label>
                    <Input id={`tour-title-${locale}`} lang={locale} required maxLength={USER_TOUR_ANNOUNCEMENT_LIMITS.title}
                      value={draft.title[locale]} onChange={(event) => updateLocalized('title', locale, event.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`tour-description-${locale}`}>{t.description}</Label>
                    <Textarea id={`tour-description-${locale}`} lang={locale} required rows={5} maxLength={USER_TOUR_ANNOUNCEMENT_LIMITS.description}
                      value={draft.description[locale]} onChange={(event) => updateLocalized('description', locale, event.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`tour-link-label-${locale}`}>{t.linkLabel}</Label>
                    <Input id={`tour-link-label-${locale}`} lang={locale} required maxLength={USER_TOUR_ANNOUNCEMENT_LIMITS.linkLabel}
                      value={draft.linkLabel[locale]} onChange={(event) => updateLocalized('linkLabel', locale, event.target.value)} />
                  </div>
                  <details className="text-sm">
                    <summary className="cursor-pointer text-[#6B6B7A]">{t.preview}</summary>
                    <div lang={locale} className="mt-3 space-y-3 rounded-xl border border-gray-200 p-4 break-words">
                      <p className="font-bold text-[#3D3D4E] whitespace-pre-wrap">{draft.title[locale]}</p>
                      <p className="text-[#4A5565] leading-relaxed whitespace-pre-wrap">{draft.description[locale]}</p>
                      <span className="block rounded-lg bg-[#06C755] px-3 py-2 text-center font-semibold text-white">
                        {draft.linkLabel[locale]}
                      </span>
                    </div>
                  </details>
                </fieldset>
              ))}
            </div>
            <div className="space-y-2">
              <Label htmlFor="tour-link-url">{t.linkUrl}</Label>
              <Input id="tour-link-url" type="url" required maxLength={USER_TOUR_ANNOUNCEMENT_LIMITS.linkUrl}
                aria-describedby="tour-link-hint" value={draft.linkUrl}
                onChange={(event) => setDraft({ ...draft, linkUrl: event.target.value })} />
              <p id="tour-link-hint" className="text-xs text-[#6B6B7A]">{t.linkHint}</p>
            </div>
            <Button type="submit" className="bg-[#3D3D4E] hover:bg-[#2D2D3D] text-white">
              <FontAwesomeIcon icon={faFloppyDisk} className="mr-2" />
              {saving ? t.saving : t.save}
            </Button>
          </fieldset>
        </form>
      )}
    </div>
  );
}
