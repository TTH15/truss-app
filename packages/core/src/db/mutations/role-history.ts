import { supabase } from "../../supabase";
import { toDbErrorOrNull, type DbError } from "../errors";
import type { UserRole } from "../../roles";

/** 過去の役職を手動登録する（RLS により運営のみ） */
export async function addUserRoleHistoryRow(input: {
  userId: string;
  role: UserRole;
  startedOn: string;
  endedOn?: string | null;
  note?: string | null;
}): Promise<{ error: DbError | null }> {
  const { error } = await supabase.from("user_role_history").insert({
    user_id: input.userId,
    role: input.role,
    started_on: input.startedOn,
    ended_on: input.endedOn ?? null,
    note: input.note ?? null,
  });
  return { error: toDbErrorOrNull(error) };
}

/** 誤登録した履歴の削除（RLS により運営のみ） */
export async function deleteUserRoleHistoryRow(
  id: number
): Promise<{ error: DbError | null }> {
  const { error } = await supabase.from("user_role_history").delete().eq("id", id);
  return { error: toDbErrorOrNull(error) };
}

/**
 * 代表・副代表の引き継ぎ（前任の降格 + 後任の昇格を1トランザクションで行う。migration 043 の RPC）。
 * 1人制約（部分ユニークインデックス）があるため、順に UPDATE するのではなくこの関数を使う。
 *
 * 失敗時は message だけでなく code / details / hint も保持した DbError を返す
 * （権限・制約違反・関数未適用を画面で区別して案内するため。classifyRoleChangeError を使う）
 */
export async function transferRoleRpc(
  successorId: string,
  role: "president" | "vice_president",
  predecessorNewRole: "member" | "officer"
): Promise<{ error: DbError | null }> {
  const { error } = await supabase.rpc("transfer_role", {
    p_successor: successorId,
    p_role: role,
    p_predecessor_new_role: predecessorNewRole,
  });
  return { error: toDbErrorOrNull(error) };
}
