/**
 * users テーブル関連の書き込みを集約
 */
import { deleteStudentIdImageByPath, supabase } from "../../supabase";
import {
  buildInitialRegistrationUserInsert,
  buildInitialRegistrationUserUpdate,
  type InitialRegistrationPayload,
} from "../initial-registration";
import type { UserRole } from "../../roles";
import { toLocalDateKey } from "../../date-key";

function toErrorOrNull(error: { message: string } | null) {
  return error ? new Error(error.message) : null;
}

export async function approvePendingUserRow(
  userId: string,
  input: {
    registrationStep: string;
    profileCompleted: boolean;
    feePaid: boolean;
  }
): Promise<{ error: Error | null }> {
  const { data: current } = await supabase.from("users").select("student_id_image").eq("id", userId).maybeSingle();
  const existingPath = current?.student_id_image;

  const { error } = await supabase
    .from("users")
    .update({
      approved: true,
      registration_step: input.registrationStep,
      profile_completed: input.profileCompleted,
      fee_paid: input.feePaid,
      student_id_image: null,
    })
    .eq("id", userId);

  if (!error && existingPath) {
    await deleteStudentIdImageByPath(existingPath);
  }

  return { error: toErrorOrNull(error) };
}

/** 役職の付与（管理画面用。DB トリガーにより管理者以外は変更不可） */
export async function updateUserRoleRow(
  userId: string,
  role: UserRole
): Promise<{ error: Error | null }> {
  const { error } = await supabase.from("users").update({ role }).eq("id", userId);
  return { error: toErrorOrNull(error) };
}

/**
 * 運営権限（is_admin）の付与・剥奪。
 * DB 側のトリガー（migration 038）により、変更できるのは管理者のみ（自己昇格は DB が拒否する）。
 */
export async function updateUserAdminFlagRow(
  userId: string,
  isAdmin: boolean
): Promise<{ error: Error | null }> {
  const { error } = await supabase.from("users").update({ is_admin: isAdmin }).eq("id", userId);
  return { error: toErrorOrNull(error) };
}

export async function rejectUserRow(
  userId: string
): Promise<{ error: Error | null }> {
  const { data: current } = await supabase.from("users").select("student_id_image").eq("id", userId).maybeSingle();
  const existingPath = current?.student_id_image;
  const { error } = await supabase.from("users").delete().eq("id", userId);
  if (!error && existingPath) {
    await deleteStudentIdImageByPath(existingPath);
  }
  return { error: toErrorOrNull(error) };
}

export async function requestReuploadRow(
  userId: string,
  reason: string
): Promise<{ error: Error | null }> {
  const { error } = await supabase
    .from("users")
    .update({
      student_id_reupload_requested: true,
      reupload_reason: reason,
    })
    .eq("id", userId);
  return { error: toErrorOrNull(error) };
}

export async function confirmFeePaymentRow(
  userId: string,
  input: { membershipYear: number; isRenewal: boolean }
): Promise<{ error: Error | null }> {
  const { error } = await supabase
    .from("users")
    .update({
      fee_paid: true,
      registration_step: "fully_active",
      membership_year: input.membershipYear,
      is_renewal: input.isRenewal,
    })
    .eq("id", userId);
  return { error: toErrorOrNull(error) };
}

export async function setRenewalStatusRow(
  userId: string,
  isRenewal: boolean
): Promise<{ error: Error | null }> {
  const { error } = await supabase
    .from("users")
    .update({ is_renewal: isRenewal })
    .eq("id", userId);
  return { error: toErrorOrNull(error) };
}

export async function resetMembershipForNewYearRow(
  newMembershipYear: number
): Promise<{ error: Error | null }> {
  const { error } = await supabase
    .from("users")
    .update({ fee_paid: false, is_renewal: true })
    .lt("membership_year", newMembershipYear)
    .eq("fee_paid", true);
  return { error: toErrorOrNull(error) };
}

export async function deleteUserRow(
  userId: string
): Promise<{ error: Error | null }> {
  const { data: current } = await supabase.from("users").select("student_id_image").eq("id", userId).maybeSingle();
  const existingPath = current?.student_id_image;
  const { error } = await supabase.from("users").delete().eq("id", userId);
  if (!error && existingPath) {
    await deleteStudentIdImageByPath(existingPath);
  }
  return { error: toErrorOrNull(error) };
}

export async function updateUserProfileRow(
  userId: string,
  dbUpdates: Record<string, unknown>
): Promise<{ error: Error | null }> {
  const { error } = await supabase.from("users").update(dbUpdates).eq("id", userId);
  return { error: toErrorOrNull(error) };
}

/**
 * 初期登録の送信を確定する。auth_id に紐づく users 行が既にあれば update、
 * なければ insert（OAuthサインアップ等で行が事前作成されている場合と、
 * メール/パスワードサインアップで未作成の場合の両方に対応）。
 */
export async function completeInitialRegistrationRow(
  authId: string,
  email: string,
  data: InitialRegistrationPayload
): Promise<{ error: Error | null }> {
  const requestedAt = toLocalDateKey();
  const { data: existing, error: checkError } = await supabase
    .from("users")
    .select("id")
    .eq("auth_id", authId)
    .maybeSingle();
  if (checkError) return { error: toErrorOrNull(checkError) };

  if (existing) {
    const { error } = await supabase
      .from("users")
      .update(buildInitialRegistrationUserUpdate(data, requestedAt))
      .eq("auth_id", authId);
    return { error: toErrorOrNull(error) };
  }

  // 退会時に auth_id を切り離すため、作り直しは必ずこの insert を通る。
  // 学籍番号で退会済みの記録を引き当て、会費の状況を引き継ぐ
  // （引き継がないと、未払いのまま退会して作り直せば記録が消えてしまう）
  const withdrawnRecord = await queryWithdrawnRecord(data.studentNumber);
  const { error } = await supabase
    .from("users")
    .insert(buildInitialRegistrationUserInsert(authId, email, data, requestedAt, withdrawnRecord));
  return { error: toErrorOrNull(error) };
}


/**
 * 退会（本人によるアカウント削除、migration 036）。
 * 行は物理削除せず、個人情報を消して退会済みにする。
 * 学籍番号と会費の状況は残るので、作り直しても未払いのままになる。
 */
export async function withdrawOwnAccount(): Promise<{ error: Error | null }> {
  const { error } = await supabase.rpc("withdraw_own_account");
  return { error: toErrorOrNull(error) };
}

/**
 * 退会した人の、再登録時に引き継ぐ情報。個人情報は含まない。
 * 退会時に `auth_id` を切り離すため、同じ Google アカウントでも再登録は新規 insert になる。
 * そのままだと未払いの記録が消えて「作り直せば踏み倒せる」ので、学籍番号で引き当てて引き継ぐ。
 */
export type WithdrawnRecord = {
  feePaid: boolean;
  membershipYear: number | null;
  isRenewal: boolean;
};

/** 学籍番号から退会済みの記録を引く（初期登録時に会費状況を引き継ぐため） */
export async function queryWithdrawnRecord(studentNumber: string): Promise<WithdrawnRecord | null> {
  const { data, error } = await supabase.rpc("find_withdrawn_record", {
    p_student_number: studentNumber,
  });
  if (error || !data || data.length === 0) return null;
  const row = data[0];
  return {
    feePaid: Boolean(row.fee_paid),
    membershipYear: row.membership_year ?? null,
    isRenewal: Boolean(row.is_renewal),
  };
}

/** 通知の種類ごとの受信設定（migration 037）。端末ではなく人ごとの設定 */
export async function updateNotificationPrefsRow(
  userId: string,
  prefs: { notifyMessage?: boolean; notifyEvent?: boolean; notifyAnnouncement?: boolean }
): Promise<{ error: Error | null }> {
  const patch: Record<string, boolean> = {};
  if (prefs.notifyMessage !== undefined) patch.notify_message = prefs.notifyMessage;
  if (prefs.notifyEvent !== undefined) patch.notify_event = prefs.notifyEvent;
  if (prefs.notifyAnnouncement !== undefined) patch.notify_announcement = prefs.notifyAnnouncement;
  if (Object.keys(patch).length === 0) return { error: null };
  const { error } = await supabase.from("users").update(patch).eq("id", userId);
  return { error: toErrorOrNull(error) };
}
