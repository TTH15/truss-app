import { membershipFeeTotal, type Language } from '@truss/core';
import { useFeeSettings } from '../../lib/use-fee-settings';
import { Button } from '../ui/button';

export function MembershipFeeSummary({ isRenewal, language }: { isRenewal: boolean; language: Language }) {
  const { settings, error, loading, refresh } = useFeeSettings();
  const ja = language === 'ja';
  const formatAmount = (amount: number) => `¥${amount.toLocaleString(ja ? 'ja-JP' : 'en-US')}`;
  return <div className="bg-[#F5F1E8] p-4 rounded-lg text-center" aria-live="polite" aria-busy={loading}>
    <p className="text-sm text-[#6B6B7A] mb-1">{ja ? 'お支払い金額' : 'Amount'}</p>
    {loading ? <p>{ja ? '確認中…' : 'Loading…'}</p> : error || !settings ? <>
      <p role="alert" className="text-sm">{ja ? '会費を取得できませんでした。' : 'Could not load membership fees.'}</p>
      <Button variant="outline" onClick={() => void refresh()}>{ja ? '再試行' : 'Retry'}</Button>
    </> : <>
      <p className="text-3xl font-bold text-[#3D3D4E]">{formatAmount(membershipFeeTotal(settings, isRenewal))}</p>
      <p className="text-xs text-[#6B6B7A] mt-1">{isRenewal
        ? (ja ? `会費 ${formatAmount(settings.annualFee)}（継続会員は入会金不要）` : `Membership fee ${formatAmount(settings.annualFee)} (no entry fee for renewals)`)
        : (ja ? `入会金 ${formatAmount(settings.admissionFee)} ＋ 会費 ${formatAmount(settings.annualFee)}` : `Entry fee ${formatAmount(settings.admissionFee)} + Membership fee ${formatAmount(settings.annualFee)}`)}</p>
    </>}
  </div>;
}
