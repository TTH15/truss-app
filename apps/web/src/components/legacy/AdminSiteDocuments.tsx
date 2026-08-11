"use client";

import { useEffect, useState } from 'react';
import { Eye, Pencil, ExternalLink, History, Lock, RotateCcw, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Checkbox } from '../ui/checkbox';
import {
  querySiteDocument,
  querySiteDocumentRevisions,
  upsertSiteDocumentRow,
  isSeniorRole,
} from '@truss/core';
import type { Language, User, SiteDocumentRevision } from '@truss/core';
import { PolicyArticles } from '../policy/PolicyDocument';
import {
  DEFAULT_SITE_DOCUMENTS,
  SITE_DOCUMENT_TITLES,
  splitSiteDocument,
  joinSiteDocument,
  type SiteDocumentId,
  type SplitDocument,
} from '../../lib/site-documents';

const DOCUMENT_IDS: SiteDocumentId[] = ['terms-of-service', 'privacy-policy'];

type ViewMode = 'edit' | 'preview' | 'history';

interface DocumentState {
  draft: SplitDocument;
  protected: boolean;
  updatedAt: string | null;
}

interface AdminSiteDocumentsProps {
  language: Language;
  user: User;
  /** 「会員に告知する」チェック時に呼ばれる（既存の一斉通知経路に接続） */
  onAnnounce?: (docId: SiteDocumentId) => Promise<void>;
}

/**
 * 利用規約・プライバシーポリシーの閲覧・改定（運営画面の設定タブに組み込むインラインパネル）。
 * - 条文（第N条 / N.）ごとに入力を分けて編集する。保存時に1つの文書に結合して site_documents へ
 * - 公開ページは ISR のため最大5分で反映される
 * - 保護文書は上位役職（代表・副代表・顧問・SE）のみ編集可（RLS でも強制。UI は閲覧のみに）
 * - 保存のたびに旧内容が改定履歴へ自動退避され、履歴からドラフトに復元できる
 */
export function AdminSiteDocuments({ language, user, onAnnounce }: AdminSiteDocumentsProps) {
  const [activeId, setActiveId] = useState<SiteDocumentId>('terms-of-service');
  const [docs, setDocs] = useState<Partial<Record<SiteDocumentId, DocumentState>>>({});
  const [revisions, setRevisions] = useState<Partial<Record<SiteDocumentId, SiteDocumentRevision[]>>>({});
  const [saving, setSaving] = useState(false);
  const [mode, setMode] = useState<ViewMode>('edit');
  const [announceChange, setAnnounceChange] = useState(false);
  // 取得中 = 表示中の文書が未ロード（別 state を持つと effect 内同期 setState になるため派生値にする）
  const doc = docs[activeId];
  const loading = doc === undefined;

  // 表示中の文書が未取得ならDBから読み込む（無ければ既定文面）
  useEffect(() => {
    if (docs[activeId] !== undefined) return;
    let cancelled = false;
    void (async () => {
      const record = await querySiteDocument(activeId);
      if (cancelled) return;
      const content = record?.content?.trim() ? record.content : DEFAULT_SITE_DOCUMENTS[activeId];
      setDocs((prev) => ({
        ...prev,
        [activeId]: {
          draft: splitSiteDocument(content),
          protected: record?.protected ?? true,
          updatedAt: record?.content?.trim() ? record.updatedAt : null,
        },
      }));
    })();
    return () => {
      cancelled = true;
    };
  }, [activeId, docs]);

  // 履歴表示に切り替えたら取得（表示のたびに取り直して保存直後の履歴も反映する）
  useEffect(() => {
    if (mode !== 'history') return;
    let cancelled = false;
    void (async () => {
      const rows = await querySiteDocumentRevisions(activeId);
      if (cancelled) return;
      setRevisions((prev) => ({ ...prev, [activeId]: rows }));
    })();
    return () => {
      cancelled = true;
    };
  }, [mode, activeId]);

  const canEdit = !doc?.protected || isSeniorRole(user.role);
  const draft = doc?.draft ?? { preamble: '', sections: [] };
  const joinedDraft = joinSiteDocument(draft);

  const updateDraft = (updater: (draft: SplitDocument) => SplitDocument) =>
    setDocs((prev) => {
      const current = prev[activeId];
      if (!current) return prev;
      return { ...prev, [activeId]: { ...current, draft: updater(current.draft) } };
    });

  const updateSection = (index: number, patch: Partial<{ title: string; body: string }>) =>
    updateDraft((d) => ({
      ...d,
      sections: d.sections.map((section, i) => (i === index ? { ...section, ...patch } : section)),
    }));

  const addSection = () => updateDraft((d) => ({ ...d, sections: [...d.sections, { title: '', body: '' }] }));

  const removeSection = (index: number) =>
    updateDraft((d) => ({ ...d, sections: d.sections.filter((_, i) => i !== index) }));

  const handleSave = async () => {
    if (!joinedDraft.trim()) {
      toast.error(language === 'ja' ? '本文が空です' : 'Content is empty');
      return;
    }
    setSaving(true);
    const { error } = await upsertSiteDocumentRow(activeId, joinedDraft, user.id);
    setSaving(false);
    if (error) {
      console.error('Failed to save site document:', error);
      toast.error(
        language === 'ja'
          ? '保存に失敗しました（保護文書は代表・副代表・顧問・SE のみ変更できます）'
          : 'Failed to save (protected documents can only be changed by senior roles)'
      );
      return;
    }
    setDocs((prev) => {
      const current = prev[activeId];
      if (!current) return prev;
      return { ...prev, [activeId]: { ...current, updatedAt: new Date().toISOString() } };
    });
    toast.success(
      language === 'ja'
        ? '保存しました。公開ページには最大5分で反映されます'
        : 'Saved. The public page updates within 5 minutes'
    );
    if (announceChange && onAnnounce) {
      // 送信状況のトーストは一斉送信側（LegacyApp）が出す
      try {
        await onAnnounce(activeId);
      } catch (error) {
        console.error('Failed to announce document change:', error);
        toast.error(language === 'ja' ? '告知の送信に失敗しました' : 'Failed to send announcement');
      }
      setAnnounceChange(false);
    }
  };

  const handleRestore = (revision: SiteDocumentRevision) => {
    updateDraft(() => splitSiteDocument(revision.content));
    setMode('edit');
    toast.info(
      language === 'ja'
        ? 'この版をドラフトに復元しました。「保存する」で確定します'
        : 'Restored this revision to the draft. Press Save to apply'
    );
  };

  const formatDateTime = (iso: string) =>
    new Date(iso).toLocaleString(language === 'ja' ? 'ja-JP' : 'en-US');

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6 space-y-4">
      <p className="text-sm text-[#6B6B7A] leading-relaxed">
        {language === 'ja'
          ? '保存すると公開ページ（最大5分で反映）に掲載され、旧版は履歴に残ります。条文ごとに編集できます（本文の行頭「1. 」は号、「(1) 」は小見出し、「・」は箇条書きになります）。'
          : 'Saved content is published to the public pages (within 5 minutes); previous versions are kept in history. Edit article by article — in bodies, lines starting with "1. " become numbered clauses, "(1) " sub-headings, "・" bullets.'}
      </p>

      <div className="flex items-center gap-2 flex-wrap">
        {DOCUMENT_IDS.map((id) => (
          <Button
            key={id}
            size="sm"
            variant={activeId === id ? 'default' : 'outline'}
            className={activeId === id ? 'bg-[#3D3D4E] hover:bg-[#2D2D3D] text-white' : ''}
            onClick={() => {
              setActiveId(id);
              setMode('edit');
            }}
          >
            {SITE_DOCUMENT_TITLES[id]}
          </Button>
        ))}
        <a
          href={`/${activeId}`}
          target="_blank"
          rel="noreferrer"
          className="ml-auto inline-flex items-center gap-1 text-xs text-[#49B1E4] underline underline-offset-2"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          {language === 'ja' ? '公開ページを開く' : 'Open public page'}
        </a>
      </div>

      {doc?.protected && !canEdit && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-[#3D3D4E]">
          <Lock className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-600" />
          <span>
            {language === 'ja'
              ? 'この文書は保護されています。変更できるのは代表・副代表・顧問・SE のみです（閲覧はできます）。'
              : 'This document is protected. Only senior roles (President, Vice President, Advisor, SE) can change it. You can still view it.'}
          </span>
        </div>
      )}

      {loading ? (
        <div className="py-16 text-center text-sm text-[#6B6B7A]">
          {language === 'ja' ? '読み込み中...' : 'Loading...'}
        </div>
      ) : mode === 'history' ? (
        <div className="rounded-lg border border-gray-200 divide-y divide-gray-100">
          {(revisions[activeId] ?? []).length === 0 ? (
            <p className="p-4 text-sm text-[#6B6B7A]">
              {language === 'ja'
                ? 'まだ改定履歴はありません（保存すると旧版がここに残ります）'
                : 'No revision history yet (previous versions appear here after you save).'}
            </p>
          ) : (
            (revisions[activeId] ?? []).map((revision) => (
              <div key={revision.id} className="flex items-center gap-3 px-4 py-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-[#3D3D4E]">{formatDateTime(revision.savedAt)}</p>
                  <p className="text-xs text-[#6B6B7A] truncate">
                    {revision.content.replace(/\s+/g, ' ').slice(0, 60)}
                  </p>
                </div>
                {canEdit && (
                  <Button size="sm" variant="outline" onClick={() => handleRestore(revision)}>
                    <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                    {language === 'ja' ? '復元' : 'Restore'}
                  </Button>
                )}
              </div>
            ))
          )}
        </div>
      ) : mode === 'preview' || !canEdit ? (
        <div className="rounded-lg border border-gray-200 bg-[#F5F1E8] p-4 text-[#3D3D4E]">
          <PolicyArticles content={joinedDraft} />
        </div>
      ) : (
        <div className="space-y-3">
          <div className="space-y-1.5">
            <p className="text-sm font-medium text-[#3D3D4E]">
              {language === 'ja' ? '前文' : 'Preamble'}
            </p>
            <textarea
              value={draft.preamble}
              onChange={(e) => updateDraft((d) => ({ ...d, preamble: e.target.value }))}
              rows={4}
              spellCheck={false}
              className="w-full resize-y rounded-lg border border-gray-200 bg-white p-3 text-sm leading-6 text-[#3D3D4E] outline-none focus:border-[#49B1E4]"
            />
          </div>
          {draft.sections.map((section, index) => (
            <div key={index} className="rounded-lg border border-gray-200 bg-gray-50/60 p-3 space-y-2">
              <div className="flex items-center gap-2">
                <Input
                  value={section.title}
                  onChange={(e) => updateSection(index, { title: e.target.value })}
                  placeholder={language === 'ja' ? '第1条（適用）' : 'Article 1 (Application)'}
                  className="bg-white font-medium"
                />
                <button
                  onClick={() => removeSection(index)}
                  className="shrink-0 p-2 text-[#6B6B7A] hover:text-[#D4183D] transition-colors"
                  title={language === 'ja' ? 'この条文を削除' : 'Delete this article'}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <textarea
                value={section.body}
                onChange={(e) => updateSection(index, { body: e.target.value })}
                rows={Math.min(14, Math.max(3, section.body.split('\n').length + 1))}
                spellCheck={false}
                className="w-full resize-y rounded-lg border border-gray-200 bg-white p-3 text-sm leading-6 text-[#3D3D4E] outline-none focus:border-[#49B1E4]"
              />
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={addSection}>
            <Plus className="w-4 h-4 mr-1.5" />
            {language === 'ja' ? '条文を追加' : 'Add article'}
          </Button>
        </div>
      )}

      <div className="flex flex-col gap-2 border-t border-gray-100 pt-3">
        {canEdit && onAnnounce && mode !== 'history' && (
          <label className="flex items-center gap-2 cursor-pointer text-sm text-[#3D3D4E]">
            <Checkbox
              className="size-4"
              checked={announceChange}
              onCheckedChange={(v) => setAnnounceChange(v === true)}
            />
            {language === 'ja'
              ? '重要な変更として、保存時に会員へ告知する（アプリ内メッセージ + プッシュ）'
              : 'Announce this change to members on save (in-app message + push)'}
          </label>
        )}
        <div className="flex items-center gap-2 flex-wrap">
          {doc?.updatedAt && (
            <span className="text-xs text-[#6B6B7A]">
              {language === 'ja' ? '最終改定: ' : 'Last updated: '}
              {formatDateTime(doc.updatedAt)}
            </span>
          )}
          <div className="ml-auto flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setMode(mode === 'history' ? 'edit' : 'history')}
              disabled={loading}
            >
              <History className="w-4 h-4 mr-1.5" />
              {mode === 'history'
                ? (language === 'ja' ? '戻る' : 'Back')
                : (language === 'ja' ? '履歴' : 'History')}
            </Button>
            {canEdit && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setMode(mode === 'preview' ? 'edit' : 'preview')}
                  disabled={loading || mode === 'history'}
                >
                  {mode === 'preview' ? (
                    <>
                      <Pencil className="w-4 h-4 mr-1.5" />
                      {language === 'ja' ? '編集に戻る' : 'Edit'}
                    </>
                  ) : (
                    <>
                      <Eye className="w-4 h-4 mr-1.5" />
                      {language === 'ja' ? 'プレビュー' : 'Preview'}
                    </>
                  )}
                </Button>
                <Button
                  size="sm"
                  onClick={handleSave}
                  disabled={saving || loading}
                  className="bg-[#49B1E4] hover:bg-[#3A9FD3] text-white"
                >
                  {saving
                    ? (language === 'ja' ? '保存中...' : 'Saving...')
                    : (language === 'ja' ? '保存する' : 'Save')}
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
