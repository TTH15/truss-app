/**
 * fee_settings の読み取り（単一行）
 */
import { membershipFeeTotal } from "../../membership-fees";
import { supabase } from "../../supabase";
import type { DbFeeSettings } from "../../types/database.types";

export type FeeSettings = {
  annualFee: number;
  admissionFee: number;
  currency: string;
  updatedAt: string;
};

export async function queryFeeSettings(): Promise<FeeSettings> {
  const { data, error } = await supabase
    .from("fee_settings")
    .select("annual_fee,admission_fee,currency,updated_at")
    .eq("id", 1)
    .single();
  if (error) throw error;
  const row = data as unknown as Pick<
    DbFeeSettings,
    "annual_fee" | "admission_fee" | "currency" | "updated_at"
  >;
  const settings = {
    annualFee: row.annual_fee,
    admissionFee: row.admission_fee,
    currency: row.currency,
    updatedAt: row.updated_at,
  };
  membershipFeeTotal(settings, false);
  return settings;
}

