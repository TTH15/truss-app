import { supabase } from "../../supabase";

export interface SiteDocumentRecord {
  content: string;
  updatedAt: string;
}

/** 公開文書（規約・ポリシー等）を取得する。行が無ければ null（呼び出し側が既定文面へフォールバック） */
export async function querySiteDocument(
  id: string
): Promise<SiteDocumentRecord | null> {
  const { data, error } = await supabase
    .from("site_documents")
    .select("content, updated_at")
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return null;
  return { content: data.content, updatedAt: data.updated_at };
}
