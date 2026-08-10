import { supabase } from "../../supabase";

export interface SiteDocumentRecord {
  content: string;
  updatedAt: string;
  /** 保護文書（上位役職のみ編集可）。RLS でも強制されるが UI の出し分けにも使う */
  protected: boolean;
}

export interface SiteDocumentRevision {
  id: number;
  content: string;
  /** その版が保存された日時（退避された日時ではない） */
  savedAt: string;
  savedBy: string | null;
}

/** 公開文書（規約・ポリシー等）を取得する。行が無ければ null（呼び出し側が既定文面へフォールバック） */
export async function querySiteDocument(
  id: string
): Promise<SiteDocumentRecord | null> {
  const { data, error } = await supabase
    .from("site_documents")
    .select("content, protected, updated_at")
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return null;
  return {
    content: data.content,
    updatedAt: data.updated_at,
    protected: data.protected,
  };
}

/** 改定履歴（新しい順）。RLS により運営のみ取得できる */
export async function querySiteDocumentRevisions(
  documentId: string,
  limit = 20
): Promise<SiteDocumentRevision[]> {
  const { data, error } = await supabase
    .from("site_document_revisions")
    .select("id, content, saved_at, saved_by")
    .eq("document_id", documentId)
    .order("archived_at", { ascending: false })
    .limit(limit);
  if (error || !data) return [];
  return data.map((row) => ({
    id: row.id,
    content: row.content,
    savedAt: row.saved_at,
    savedBy: row.saved_by,
  }));
}
