import { supabase } from "../../supabase";
import type { UserRole } from "../../roles";

export interface UserRoleHistoryEntry {
  id: number;
  role: UserRole;
  /** 在任開始日（YYYY-MM-DD） */
  startedOn: string;
  /** 在任終了日（YYYY-MM-DD）。null = 在任中 */
  endedOn: string | null;
  note: string | null;
  /** auto = 役職変更時のトリガー記録 / manual = 運営画面からの手動登録 */
  source: "auto" | "manual";
}

/** 役職の在任履歴（新しい順）。RLS により運営のみ取得できる */
export async function queryUserRoleHistory(
  userId: string
): Promise<UserRoleHistoryEntry[]> {
  const { data, error } = await supabase
    .from("user_role_history")
    .select("id, role, started_on, ended_on, note, source")
    .eq("user_id", userId)
    .order("started_on", { ascending: false });
  if (error || !data) return [];
  return data.map((row) => ({
    id: row.id,
    role: row.role as UserRole,
    startedOn: row.started_on,
    endedOn: row.ended_on,
    note: row.note,
    source: row.source,
  }));
}
