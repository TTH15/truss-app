/**
 * users テーブル関連の読み取りを集約
 */
import { supabase } from "../../supabase";
import { isProfileCompleteForParticipation } from "../../profile-completion";
import { mapDbUserRowToUser } from "../mappers";
import type { User as AppUser, RegistrationStep } from "../../types/app";

const USER_SELECT_COLUMNS = [
  "id",
  "email",
  "created_at",
  "name",
  "nickname",
  "furigana",
  "birthday",
  "languages",
  "country",
  "category",
  "approved",
  "is_admin",
  "avatar_path",
  "student_id_image",
  "student_number",
  "grade",
  "major",
  "phone",
  "organizations",
  "blocked",
  "registration_step",
  "email_verified",
  "initial_registered",
  "profile_completed",
  "fee_paid",
  "membership_year",
  "is_renewal",
  "student_id_reupload_requested",
  "reupload_reason",
  "requested_at",
].join(",");

/** 承認済み（または管理者）のみ RPC が UUID を返す。RLS 下で users を一覧できない一般メンバー向け。 */
export async function queryStaffInboxUserId(): Promise<string | null> {
  const { data, error } = await supabase.rpc("get_staff_inbox_user_id");
  if (error) throw error;
  if (data == null || typeof data !== "string") return null;
  return data;
}

export async function queryPendingAndApprovedUsers(): Promise<{
  pending: AppUser[];
  approved: AppUser[];
}> {
  const startedAt = typeof performance !== "undefined" ? performance.now() : Date.now();
  const { data, error } = await supabase.from("users").select(USER_SELECT_COLUMNS);
  if (error) throw error;

  const rows = (data ?? []) as unknown as Array<Parameters<typeof mapDbUserRowToUser>[0]>;
  const pendingRows = rows.filter(
    (row) => row.approved === false && row.registration_step === "waiting_approval"
  );
  const approvedRows = rows.filter((row) => row.approved === true);

  const result = {
    pending: pendingRows.map(mapDbUserRowToUser),
    approved: approvedRows.map(mapDbUserRowToUser),
  };
  const endedAt = typeof performance !== "undefined" ? performance.now() : Date.now();
  console.info(
    `[perf] queryPendingAndApprovedUsers: ${Math.round(endedAt - startedAt)}ms, pending=${result.pending.length}, approved=${result.approved.length}`
  );
  return result;
}

export async function queryUserByAuthId(authId: string): Promise<AppUser | null> {
  try {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error("Query timeout after 15s")), 15000);
    });
    const queryPromise = supabase.from("users").select("*").eq("auth_id", authId).maybeSingle();
    const { data, error } = await Promise.race([queryPromise, timeoutPromise]);
    if (error || !data) return null;
    const row = {
      id: data.id,
      email: data.email,
      name: data.name || "",
      nickname: data.nickname || "",
      furigana: data.furigana || "",
      birthday: data.birthday || "",
      languages: data.languages || [],
      birthCountry: data.country || "",
      category: data.category,
      approved: data.approved,
      isAdmin: data.is_admin,
      avatarPath: data.avatar_path || undefined,
      studentIdImage: data.student_id_image || undefined,
      studentNumber: data.student_number || undefined,
      grade: data.grade || undefined,
      major: data.major || undefined,
      phone: data.phone || undefined,
      organizations: data.organizations || undefined,
      blocked: data.blocked,
      registrationStep: data.registration_step as RegistrationStep,
      emailVerified: data.email_verified,
      initialRegistered: data.initial_registered,
      profileCompleted: data.profile_completed,
      feePaid: data.fee_paid,
      membershipYear: data.membership_year || undefined,
      isRenewal: data.is_renewal || false,
      studentIdReuploadRequested: data.student_id_reupload_requested,
      reuploadReason: data.reupload_reason || undefined,
      requestedAt: data.requested_at || undefined,
    };
    if (!row.profileCompleted && isProfileCompleteForParticipation(row)) {
      void supabase.from("users").update({ profile_completed: true }).eq("id", row.id);
      row.profileCompleted = true;
    }
    return row;
  } catch (_error) {
    return null;
  }
}
