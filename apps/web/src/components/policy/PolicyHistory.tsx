import Link from 'next/link';
import { notFound } from 'next/navigation';
import { fetchPublishedDocumentRevisions, validRevisionId, type PublishedDocumentRevision } from '../../lib/site-document-history';
import { SITE_DOCUMENT_TITLES, type SiteDocumentId } from '../../lib/site-documents';
import { PolicyArticles } from './PolicyDocument';

const versionLabel = (revision: PublishedDocumentRevision) => revision.is_initial_version || !revision.saved_at ? '初期版' : new Date(revision.saved_at).toLocaleString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Tokyo' });

export async function renderPolicyHistory({ documentId, before, revisionId }: { documentId: SiteDocumentId; before?: string; revisionId?: string }) {
  if ((revisionId && !validRevisionId(revisionId)) || (before && !validRevisionId(before))) notFound();
  let result: Awaited<ReturnType<typeof fetchPublishedDocumentRevisions>>;
  let unavailable = false;
  try { result = await fetchPublishedDocumentRevisions(documentId, { before, revisionId }); }
  catch { unavailable = true; result = { revisions: [], hasMore: false }; }
  const selected = revisionId ? result.revisions[0] : null;
  if (revisionId && !selected && !unavailable) notFound();
  const historyPath = `/${documentId}/history`;
  return <div className="min-h-screen bg-[#F5F1E8] text-[#3D3D4E]">
    <header className="border-b border-[#3D3D4E]/15"><div className="mx-auto flex max-w-5xl items-center gap-4 px-5 py-5 sm:px-10">
      <Link href={revisionId ? historyPath : `/${documentId}`} prefetch={false} className="shrink-0 text-sm text-[#49B1E4]">戻る</Link>
      <h1 className="text-base font-semibold [overflow-wrap:anywhere]">{SITE_DOCUMENT_TITLES[documentId]}の変更履歴</h1>
    </div></header>
    <main className="mx-auto max-w-5xl space-y-6 px-5 py-8 sm:px-10 [overflow-wrap:anywhere]">
      <Link href={`/${documentId}`} prefetch={false} className="inline-block text-sm text-[#49B1E4] underline underline-offset-4">最新版を見る</Link>
      {unavailable ? <div role="alert" className="space-y-3"><p>変更履歴を取得できませんでした。</p><a href={revisionId ? `${historyPath}/${revisionId}` : historyPath} className="text-[#49B1E4] underline">再読み込み</a></div> : selected ? <>
        <div className="space-y-2 border-b border-[#3D3D4E]/15 pb-4"><p className="text-xs font-medium text-[#6B6B7A]">過去の版</p><h2 className="font-semibold">{versionLabel(selected)}</h2></div>
        <PolicyArticles content={selected.content ?? ''} />
      </> : <>
        {result.revisions.length === 0 ? <p className="text-sm text-[#6B6B7A]">公開されている変更履歴はありません。</p> : <ul className="divide-y divide-gray-200 rounded-xl border border-gray-200 bg-white">{result.revisions.map((revision) => <li key={revision.revision_id}><Link href={`${historyPath}/${revision.revision_id}`} prefetch={false} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 hover:bg-gray-50"><span className="text-sm font-medium">{versionLabel(revision)}</span><span className="text-sm text-[#49B1E4]">本文を読む</span></Link></li>)}</ul>}
        {result.hasMore && <Link href={`${historyPath}?before=${result.revisions.at(-1)?.revision_id}`} prefetch={false} className="inline-block text-sm text-[#49B1E4] underline">以前の版を見る</Link>}
      </>}
    </main>
  </div>;
}
