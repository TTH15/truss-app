/**
 * fee_settings の書き込み（管理者のみ）
 */
import { membershipFeeTotal } from "../../membership-fees";
import { supabase } from "../../supabase";

function toErrorOrNull(error: { message: string } | null) {
  return error ? new Error(error.message) : null;
}

export async function upsertFeeSettingsRow(input: {
  annualFee: number;
  admissionFee: number;
  currency?: string;
}): Promise<{ error: Error | null }> {
  try { membershipFeeTotal(input, false); } catch { return { error: new Error("Invalid membership fee") }; }
  const { error } = await supabase.from("fee_settings").upsert(
    {
      id: 1,
      annual_fee: input.annualFee,
      admission_fee: input.admissionFee,
      currency: input.currency ?? "JPY",
    },
    { onConflict: "id" }
  ).select('annual_fee,admission_fee').single();
  return { error: toErrorOrNull(error) };
}

