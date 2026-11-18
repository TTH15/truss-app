import { supabase } from "../../supabase";

function toErrorOrNull(error: { message: string } | null) {
  return error ? new Error(error.message) : null;
}

/** 公開文書（規約・ポリシー等）を保存する（RLS により運営のみ） */
export async function upsertSiteDocumentRow(
  id: string,
  content: string,
  updatedBy: string
): Promise<{ error: Error | null; updatedAt?: string | null }> {
  const { data, error } = await supabase.from("site_documents").upsert({
    id,
    content,
    updated_at: new Date().toISOString(),
    updated_by: updatedBy,
  }).select("id,updated_at,is_initial_version").single();
  return { error: toErrorOrNull(error), updatedAt: data?.is_initial_version ? null : data?.updated_at };
}


export async function setSiteDocumentRevisionPublished(revisionId: number, published: boolean): Promise<void> {
  const { data, error } = await supabase.rpc("set_site_document_revision_published", { p_revision_id: revisionId, p_published: published });
  if (error) throw error;
  if (data !== published) throw new Error("Publication update was not confirmed");
}
