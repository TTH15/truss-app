"use client";

import { useEffect, useState } from 'react';
import { ScrollText, Eye, Pencil, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../ui/dialog';
import { querySiteDocument, upsertSiteDocumentRow } from '@truss/core';
import type { Language } from '@truss/core';
import { PolicyDocumentBody } from '../policy/PolicyDocument';
import {
  DEFAULT_SITE_DOCUMENTS,
  SITE_DOCUMENT_TITLES,
  type SiteDocumentId,
} from '../../lib/site-documents';

const DOCUMENT_IDS: SiteDocumentId[] = ['terms-of-service', 'privacy-policy'];

interface AdminSiteDocumentsProps {
  language: Language;
  adminUserId: string;
}

/**
 * 利用規約・プライバシーポリシーの閲覧・改定（運営画面ヘッダーから開くモーダル）。
 * 保存先は site_documents テーブル。公開ページは ISR のため最大5分で反映される。
 */
export function AdminSiteDocuments({ language, adminUserId }: AdminSiteDocumentsProps) {
  const [open, setOpen] = useState(false);
  const [activeId, setActiveId] = useState<SiteDocumentId>('terms-of-service');
  const [drafts, setDrafts] = useState<Partial<Record<SiteDocumentId, string>>>({});
  const [updatedAt, setUpdatedAt] = useState<Partial<Record<SiteDocumentId, string>>>({});
  const [saving, setSaving] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  // 取得中 = 表示中の文書のドラフトが未ロード（別 state を持つと effect 内同期 setState になるため派生値にする）
  const loading = drafts[activeId] === undefined;

  // モーダルを開いた時・文書を切り替えた時に、未取得ならDBから読み込む（無ければ既定文面）
  useEffect(() => {
    if (!open || drafts[activeId] !== undefined) return;
    let cancelled = false;
    void (async () => {
      const record = await querySiteDocument(activeId);
      if (cancelled) return;
      setDrafts((prev) => ({
        ...prev,
        [activeId]: record?.content ?? DEFAULT_SITE_DOCUMENTS[activeId],
      }));
      if (record?.updatedAt) {
        setUpdatedAt((prev) => ({ ...prev, [activeId]: record.updatedAt }));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, activeId, drafts]);

  const draft = drafts[activeId] ?? '';

  const handleSave = async () => {
    if (!draft.trim()) {
      toast.error(language === 'ja' ? '本文が空です' : 'Content is empty');
      return;
    }
    setSaving(true);
    const { error } = await upsertSiteDocumentRow(activeId, draft, adminUserId);
    setSaving(false);
    if (error) {
      console.error('Failed to save site document:', error);
      toast.error(language === 'ja' ? '保存に失敗しました' : 'Failed to save');
      return;
    }
    setUpdatedAt((prev) => ({ ...prev, [activeId]: new Date().toISOString() }));
    toast.success(
      language === 'ja'
        ? '保存しました。公開ページには最大5分で反映されます'
        : 'Saved. The public page updates within 5 minutes'
    );
  };

  const lastUpdated = updatedAt[activeId];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="text-[#F5F1E8] hover:bg-[#2D2D3D]"
          title={language === 'ja' ? '規約・ポリシーの管理' : 'Terms & policy documents'}
        >
          <ScrollText className="w-5 h-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl w-[calc(100vw-2rem)] h-[85vh] flex flex-col gap-3 p-4 sm:p-6">
        <DialogHeader className="space-y-1">
          <DialogTitle>
            {language === 'ja' ? '規約・ポリシーの管理' : 'Terms & Policy Documents'}
          </DialogTitle>
          <DialogDescription>
            {language === 'ja'
              ? '保存すると公開ページ（最大5分で反映）に掲載されます。空行で段落を区切り、「1. 」「第1条」で始まる行は見出しになります。'
              : 'Saved content is published to the public pages (within 5 minutes). Separate paragraphs with blank lines; lines starting with "1. " or "第1条" become headings.'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2 flex-wrap">
          {DOCUMENT_IDS.map((id) => (
            <Button
              key={id}
              size="sm"
              variant={activeId === id ? 'default' : 'outline'}
              className={activeId === id ? 'bg-[#3D3D4E] hover:bg-[#2D2D3D] text-white' : ''}
              onClick={() => {
                setActiveId(id);
                setPreviewing(false);
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

        {loading ? (
          <div className="flex-1 flex items-center justify-center text-sm text-[#6B6B7A]">
            {language === 'ja' ? '読み込み中...' : 'Loading...'}
          </div>
        ) : previewing ? (
          <div className="flex-1 min-h-0 overflow-y-auto rounded-lg border border-gray-200 bg-[#F5F1E8] p-4 text-[#3D3D4E]">
            <PolicyDocumentBody content={draft} />
          </div>
        ) : (
          <textarea
            value={draft}
            onChange={(e) => setDrafts((prev) => ({ ...prev, [activeId]: e.target.value }))}
            spellCheck={false}
            className="flex-1 min-h-0 w-full resize-none rounded-lg border border-gray-200 bg-white p-3 font-mono text-[13px] leading-6 text-[#3D3D4E] outline-none focus:border-[#49B1E4]"
          />
        )}

        <div className="flex items-center gap-2">
          {lastUpdated && (
            <span className="text-xs text-[#6B6B7A]">
              {language === 'ja' ? '最終更新: ' : 'Last updated: '}
              {new Date(lastUpdated).toLocaleString(language === 'ja' ? 'ja-JP' : 'en-US')}
            </span>
          )}
          <div className="ml-auto flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPreviewing((v) => !v)}
              disabled={loading}
            >
              {previewing ? (
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
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
