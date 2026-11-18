'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { queryFeeSettingsHistory, type FeeSettingsHistoryEntry, type Language } from '@truss/core';
import { Button } from '../ui/button';

export function FeeSettingsHistory({ language }: { language: Language }) {
  const [entries, setEntries] = useState<FeeSettingsHistoryEntry[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const mounted = useRef(false);
  const pending = useRef(false);
  const cursor = useRef<number | undefined>(undefined);
  const ja = language === 'ja';
  const load = useCallback(async () => {
    if (pending.current) return;
    pending.current = true;
    setLoading(true);
    setFailed(false);
    try {
      const result = await queryFeeSettingsHistory(cursor.current);
      if (!mounted.current) return;
      setEntries((previous) => [...previous, ...result.entries]);
      if (result.entries.length) cursor.current = result.entries.at(-1)!.id;
      setHasMore(result.hasMore);
    } catch {
      if (mounted.current) setFailed(true);
    } finally {
      pending.current = false;
      if (mounted.current) setLoading(false);
    }
  }, []);
  useEffect(() => {
    mounted.current = true;
    const timer = window.setTimeout(() => void load(), 0);
    return () => { mounted.current = false; window.clearTimeout(timer); };
  }, [load]);

  const amount = (value: number | null, currency: string | null) => {
    if (value === null) return '—';
    try { return new Intl.NumberFormat(ja ? 'ja-JP' : 'en-US', { style: 'currency', currency: currency || 'JPY', maximumFractionDigits: 0 }).format(value); }
    catch { return value.toLocaleString(ja ? 'ja-JP' : 'en-US'); }
  };
  const rows = (entry: FeeSettingsHistoryEntry) => [
    [ja ? '会費' : 'Membership fee', amount(entry.previousAnnualFee, entry.previousCurrency), amount(entry.annualFee, entry.currency)],
    [ja ? '入会金' : 'Entry fee', amount(entry.previousAdmissionFee, entry.previousCurrency), amount(entry.admissionFee, entry.currency)],
    [ja ? '新規合計' : 'New member total', amount(entry.previousAnnualFee === null || entry.previousAdmissionFee === null ? null : entry.previousAnnualFee + entry.previousAdmissionFee, entry.previousCurrency), amount(entry.annualFee === null || entry.admissionFee === null ? null : entry.annualFee + entry.admissionFee, entry.currency)],
  ];
  return <section className="space-y-3 border-t pt-4 min-w-0" aria-label={ja ? '会費の変更履歴' : 'Fee change history'} aria-busy={loading}>
    <h3 className="font-medium">{ja ? '変更履歴' : 'Change history'}</h3>
    <ol className="space-y-4">
      {entries.map((entry) => <li key={entry.id} className="space-y-2 min-w-0">
        <div className="text-xs text-muted-foreground [overflow-wrap:anywhere]">
          <time dateTime={entry.changedAt}>{new Date(entry.changedAt).toLocaleString(ja ? 'ja-JP' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</time>
          <p>{entry.actorName || (entry.hasActor ? (ja ? '運営（アカウント削除済み）' : 'Former staff account') : (ja ? 'システム' : 'System'))}</p>
          {entry.action === 'baseline' && <p>{ja ? '記録開始時の設定' : 'Settings when recording began'}</p>}
          {entry.action === 'delete' && <p>{ja ? '設定削除' : 'Settings deleted'}</p>}
        </div>
        <table className="w-full table-fixed text-xs [overflow-wrap:anywhere]">
          <thead><tr className="text-muted-foreground"><th scope="col" className="w-2/5 text-left font-normal">{ja ? '項目' : 'Item'}</th><th scope="col" className="text-right font-normal">{ja ? '変更前' : 'Before'}</th><th scope="col" className="text-right font-normal">{ja ? '変更後' : 'After'}</th></tr></thead>
          <tbody>{rows(entry).map(([label, before, after]) => <tr key={label}><th scope="row" className="py-1 text-left font-normal pr-2">{label}</th><td className="text-right pl-2">{before}</td><td className="text-right pl-2">{after}</td></tr>)}</tbody>
        </table>
      </li>)}
    </ol>
    {!loading && !failed && !entries.length && <p className="text-sm text-muted-foreground">{ja ? '変更履歴はありません' : 'No changes recorded'}</p>}
    {failed && <p role="alert" className="text-sm">{ja ? '変更履歴を取得できませんでした' : 'Could not load change history'}</p>}
    {(hasMore || failed) && <Button variant="outline" disabled={loading} onClick={() => void load()} className="w-full">{failed ? (ja ? '再試行' : 'Retry') : (ja ? '以前の変更を表示' : 'Show earlier changes')}</Button>}
    {loading && <p role="status" className="text-sm text-muted-foreground">{ja ? '読み込み中…' : 'Loading…'}</p>}
  </section>;
}
