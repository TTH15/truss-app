import { supabase } from '../../supabase';

export type FeeSettingsHistoryEntry = {
  id: number;
  changedAt: string;
  action: 'baseline' | 'insert' | 'update' | 'delete';
  actorName: string | null;
  hasActor: boolean;
  previousAnnualFee: number | null;
  previousAdmissionFee: number | null;
  previousCurrency: string | null;
  annualFee: number | null;
  admissionFee: number | null;
  currency: string | null;
};

export async function queryFeeSettingsHistory(beforeId?: number): Promise<{ entries: FeeSettingsHistoryEntry[]; hasMore: boolean }> {
  let query = supabase.from('fee_settings_history')
    .select('id,changed_at,action,changed_by_auth_id,previous_annual_fee,previous_admission_fee,previous_currency,annual_fee,admission_fee,currency,actor:users!fee_settings_history_changed_by_fkey(name)')
    .order('id', { ascending: false }).limit(21);
  if (beforeId !== undefined) query = query.lt('id', beforeId);
  const { data, error } = await query;
  if (error) throw error;
  const rows = (data ?? []) as unknown as Array<{
    id: number; changed_at: string; action: FeeSettingsHistoryEntry['action'];
    changed_by_auth_id: string | null; actor: { name: string } | null;
    previous_annual_fee: number | null; previous_admission_fee: number | null; previous_currency: string | null;
    annual_fee: number | null; admission_fee: number | null; currency: string | null;
  }>;
  return {
    hasMore: rows.length > 20,
    entries: rows.slice(0, 20).map((row) => ({
      id: row.id, changedAt: row.changed_at, action: row.action,
      actorName: row.actor?.name ?? null, hasActor: row.changed_by_auth_id !== null,
      previousAnnualFee: row.previous_annual_fee, previousAdmissionFee: row.previous_admission_fee, previousCurrency: row.previous_currency,
      annualFee: row.annual_fee, admissionFee: row.admission_fee, currency: row.currency,
    })),
  };
}
