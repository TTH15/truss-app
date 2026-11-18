import { supabase } from "../../supabase";

export interface SiteDocumentRecord {
  content: string;
  updatedAt: string | null;
  /** 保護文書（上位役職のみ編集可）。RLS でも強制されるが UI の出し分けにも使う */
  protected: boolean;
}

export interface SiteDocumentRevision {
  id: number;
  content: string;
  /** その版が保存された日時（退避された日時ではない） */
  savedAt: string | null;
  isInitialVersion: boolean;
  publishedAt: string | null;
  savedBy: string | null;
}

/** 公開文書（規約・ポリシー等）を取得する。行が無ければ null（呼び出し側が既定文面へフォールバック） */
export async function querySiteDocument(
  id: string
): Promise<SiteDocumentRecord | null> {
  const { data, error } = await supabase
    .from("site_documents")
    .select("content, protected, updated_at, is_initial_version")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    content: data.content,
    updatedAt: data.is_initial_version ? null : data.updated_at,
    protected: data.protected,
  };
}

/** Private audit history; public status is obtained from the separate snapshot table. */
export async function querySiteDocumentRevisionPage(documentId: string, beforeId?: number) {
  let query = supabase.from("site_document_revisions")
    .select("id,content,saved_at,saved_by,is_initial_version")
    .eq("document_id", documentId).order("id", { ascending: false }).limit(21);
  if (beforeId) query = query.lt("id", beforeId);
  const { data, error } = await query;
  if (error) throw error;
  const rows = (data ?? []).slice(0, 20);
  const publications = rows.length ? await supabase.from("site_document_published_revisions")
    .select("revision_id,published_at").in("revision_id", rows.map((r) => r.id)) : { data: [], error: null };
  if (publications.error) throw publications.error;
  const published = new Map((publications.data ?? []).map((r) => [r.revision_id, r.published_at]));
  return {
    hasMore: (data?.length ?? 0) > 20,
    revisions: rows.map((row): SiteDocumentRevision => ({
      id: row.id, content: row.content, savedAt: row.saved_at, savedBy: row.saved_by,
      isInitialVersion: row.is_initial_version, publishedAt: published.get(row.id) ?? null,
    })),
  };
}

export async function querySiteDocumentRevisions(documentId: string): Promise<SiteDocumentRevision[]> {
  return (await querySiteDocumentRevisionPage(documentId)).revisions;
}
