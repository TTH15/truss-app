/**
 * users テーブル関連の書き込みを集約
 */
import { supabase } from "../../supabase";

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

  return { error: toErrorOrNull(error) };
}

export async function rejectUserRow(
  userId: string
): Promise<{ error: Error | null }> {
  const { error } = await supabase.from("users").delete().eq("id", userId);
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
  const { error } = await supabase.from("users").delete().eq("id", userId);
  return { error: toErrorOrNull(error) };
}

