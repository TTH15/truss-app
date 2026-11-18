import type { SiteDocumentId } from './site-documents';

export interface PublishedDocumentRevision {
  revision_id: number;
  content?: string;
  saved_at: string | null;
  is_initial_version: boolean;
}

/** Read only the public snapshot table; unpublished audit rows and authors are never fetched. */
export async function fetchPublishedDocumentRevisions(documentId: SiteDocumentId, input: { before?: string; revisionId?: string } = {}) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error('History is unavailable');
  const params = new URLSearchParams({ document_id: `eq.${documentId}`, select: input.revisionId ? 'revision_id,content,saved_at,is_initial_version' : 'revision_id,saved_at,is_initial_version', order: 'revision_id.desc', limit: input.revisionId ? '1' : '21' });
  if (input.before) params.set('revision_id', `lt.${input.before}`);
  if (input.revisionId) params.set('revision_id', `eq.${input.revisionId}`);
  const response = await fetch(`${url}/rest/v1/site_document_published_revisions?${params}`, { headers: { apikey: key, Authorization: `Bearer ${key}` }, cache: 'no-store' });
  if (!response.ok) throw new Error('History is unavailable');
  const rows = await response.json() as PublishedDocumentRevision[];
  return { revisions: rows.slice(0, 20), hasMore: rows.length > 20 };
}

export function validRevisionId(value?: string): string | undefined {
  return value && /^[1-9]\d{0,14}$/.test(value) ? value : undefined;
}
