'use client';

import { useEffect, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faEye, faEyeSlash, faRotateLeft } from '@fortawesome/free-solid-svg-icons';
import { querySiteDocumentRevisionPage, setSiteDocumentRevisionPublished, type SiteDocumentRevision, type Language } from '@truss/core';
import { Button } from '../ui/button';
import { PolicyArticles } from '../policy/PolicyDocument';
import { toast } from 'sonner';

export function AdminDocumentHistory({ documentId, language, canEdit, onRestore }: { documentId: string; language: Language; canEdit: boolean; onRestore: (revision: SiteDocumentRevision) => void }) {
  const ja = language === 'ja';
  const [page, setPage] = useState<{ revisions: SiteDocumentRevision[]; hasMore: boolean }>({ revisions: [], hasMore: false });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [selected, setSelected] = useState<SiteDocumentRevision | null>(null);
  const [busy, setBusy] = useState(false);
  const [publication, setPublication] = useState<Record<number, boolean>>({});
  useEffect(() => {
    let cancelled = false;
    void Promise.resolve().then(async () => {
      setLoading(true);
      try {
        const result = await querySiteDocumentRevisionPage(documentId);
        if (!cancelled) { setPage(result); setError(false); }
      } catch { if (!cancelled) setError(true); }
      finally { if (!cancelled) setLoading(false); }
    });
    return () => { cancelled = true; };
  }, [documentId, attempt]);
  const published = (revision: SiteDocumentRevision) => publication[revision.id] ?? !!revision.publishedAt;
  const label = (revision: SiteDocumentRevision) => revision.isInitialVersion || !revision.savedAt
    ? (ja ? '初期版' : 'Initial version')
    : new Date(revision.savedAt).toLocaleString(ja ? 'ja-JP' : 'en-US', ja ? { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' } : undefined);
  const badge = (revision: SiteDocumentRevision) => <span className={`shrink-0 rounded-full px-2 py-1 text-xs ${published(revision) ? 'bg-emerald-50 text-emerald-800' : 'bg-gray-100 text-gray-600'}`}>{published(revision) ? (ja ? '公開中' : 'Public') : (ja ? '非公開' : 'Private')}</span>;
  const changePublication = async (revision: SiteDocumentRevision) => {
    const next = !published(revision);
    setBusy(true);
    try {
      await setSiteDocumentRevisionPublished(revision.id, next);
      setPublication((prev) => ({ ...prev, [revision.id]: next }));
      toast.success(next ? (ja ? 'この版を履歴に公開しました' : 'Version published in history') : (ja ? 'この版の公開を取り消しました' : 'Version removed from public history'));
    } catch { toast.error(ja ? '公開状態を変更できませんでした。再試行してください' : 'Could not change publication. Please try again.'); }
    finally { setBusy(false); }
  };

  if (selected) return <div className="space-y-4">
    <div className="flex flex-wrap items-center gap-2">
      <Button size="sm" variant="ghost" disabled={busy} onClick={() => setSelected(null)}><FontAwesomeIcon icon={faArrowLeft} className="mr-2" />{ja ? '履歴一覧' : 'All versions'}</Button>
      <h3 className="text-sm font-medium">{label(selected)}</h3>{badge(selected)}
    </div>
    <div className="rounded-lg border border-gray-200 p-4 [overflow-wrap:anywhere]"><PolicyArticles content={selected.content} /></div>
    {canEdit && !published(selected) && <p className="text-xs text-gray-500">{ja ? '公開した版は、ログイン前でも閲覧できます。' : 'Published versions are also visible before login.'}</p>}
    {canEdit && <div className="flex flex-wrap justify-end gap-2">
      <Button size="sm" variant="outline" disabled={busy} onClick={() => onRestore(selected)}><FontAwesomeIcon icon={faRotateLeft} className="mr-2" />{ja ? 'この版を編集に使用' : 'Use this version to edit'}</Button>
      <Button size="sm" variant={published(selected) ? 'outline' : 'default'} disabled={busy} onClick={() => void changePublication(selected)}><FontAwesomeIcon icon={published(selected) ? faEyeSlash : faEye} className="mr-2" />{published(selected) ? (ja ? '履歴の公開を取り消す' : 'Unpublish from history') : (ja ? '変更履歴に公開する' : 'Publish in history')}</Button>
    </div>}
  </div>;

  return <div className="space-y-3">
    <a href={`/${documentId}/history`} target="_blank" rel="noreferrer" className="text-sm text-[#49B1E4] underline">{ja ? 'メンバー向けの変更履歴' : 'Member-facing history'}</a>
    {error && <div role="alert" className="space-y-2 text-sm"><p>{ja ? '履歴を取得できませんでした' : 'Could not load version history'}</p><Button size="sm" variant="outline" disabled={loading} onClick={() => setAttempt((v) => v + 1)}>{ja ? '再試行' : 'Retry'}</Button></div>}
    {loading && <p role="status" className="py-4 text-sm text-gray-500">{ja ? '読み込み中...' : 'Loading...'}</p>}
    {!loading && !error && page.revisions.length === 0 && <p className="py-4 text-sm text-gray-500">{ja ? '改定履歴はまだありません' : 'No revision history yet.'}</p>}
    <div className="divide-y rounded-lg border border-gray-200">{page.revisions.map((revision) => <div key={revision.id} className="flex flex-wrap items-center gap-3 p-3">
      <div className="min-w-0 flex-1"><p className="text-sm">{label(revision)}</p><p className="truncate text-xs text-gray-500">{revision.content.replace(/\s+/g, ' ').slice(0, 60)}</p></div>
      {badge(revision)}<Button size="sm" variant="outline" onClick={() => setSelected(revision)}>{ja ? '内容を確認' : 'Review'}</Button>
    </div>)}</div>
    {page.hasMore && <Button size="sm" variant="outline" disabled={loading} onClick={async () => {
      setLoading(true);
      try {
        const result = await querySiteDocumentRevisionPage(documentId, page.revisions.at(-1)?.id);
        setPage((prev) => ({ revisions: [...prev.revisions, ...result.revisions], hasMore: result.hasMore })); setError(false);
      } catch { setError(true); }
      finally { setLoading(false); }
    }}>{ja ? 'さらに読み込む' : 'Load more'}</Button>}
  </div>;
}
