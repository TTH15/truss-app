import { supabase } from "../../supabase";
import type { UserRole } from "../../roles";

function toErrorOrNull(error: { message: string } | null) {
  return error ? new Error(error.message) : null;
}

/** 過去の役職を手動登録する（RLS により運営のみ） */
export async function addUserRoleHistoryRow(input: {
  userId: string;
  role: UserRole;
  startedOn: string;
  endedOn?: string | null;
  note?: string | null;
}): Promise<{ error: Error | null }> {
  const { error } = await supabase.from("user_role_history").insert({
    user_id: input.userId,
    role: input.role,
    started_on: input.startedOn,
    ended_on: input.endedOn ?? null,
    note: input.note ?? null,
  });
  return { error: toErrorOrNull(error) };
}

/** 誤登録した履歴の削除（RLS により運営のみ） */
export async function deleteUserRoleHistoryRow(
  id: number
): Promise<{ error: Error | null }> {
  const { error } = await supabase.from("user_role_history").delete().eq("id", id);
  return { error: toErrorOrNull(error) };
}

/**
 * 代表・副代表の引き継ぎ（前任の降格 + 後任の昇格を1トランザクションで行う。migration 043 の RPC）。
 * 1人制約（部分ユニークインデックス）があるため、順に UPDATE するのではなくこの関数を使う
 */
export async function transferRoleRpc(
  successorId: string,
  role: "president" | "vice_president",
  predecessorNewRole: "member" | "officer"
): Promise<{ error: Error | null }> {
  const { error } = await supabase.rpc("transfer_role", {
    p_successor: successorId,
    p_role: role,
    p_predecessor_new_role: predecessorNewRole,
  });
  return { error: toErrorOrNull(error) };
}
