import { supabase } from "../../supabase";

function toErrorOrNull(error: { message: string } | null) {
  return error ? new Error(error.message) : null;
}

/** 公開文書（規約・ポリシー等）を保存する（RLS により運営のみ） */
export async function upsertSiteDocumentRow(
  id: string,
  content: string,
  updatedBy: string
): Promise<{ error: Error | null }> {
  const { error } = await supabase.from("site_documents").upsert({
    id,
    content,
    updated_at: new Date().toISOString(),
    updated_by: updatedBy,
  });
  return { error: toErrorOrNull(error) };
}
