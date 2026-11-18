'use client';

import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowUpRightFromSquare, faCopy } from '@fortawesome/free-solid-svg-icons';
import { getEventChatLinks, type Event, type Language } from '@truss/core';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { toast } from 'sonner';

export function EventChatLinks({ event, language }: { event: Event; language: Language }) {
  const links = getEventChatLinks(event);
  const [manualUrl, setManualUrl] = useState<string | null>(null);
  const ja = language === 'ja';
  const copy = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success(ja ? '招待リンクをコピーしました' : 'Invitation link copied');
    } catch {
      setManualUrl(url);
    }
  };

  return <section className="space-y-3 min-w-0" aria-label={ja ? 'イベントのグループチャット' : 'Event group chat'}>
    <h4 className="font-medium">{ja ? 'グループチャット' : 'Group chat'}</h4>
    {links.length ? links.map((link) => {
      const name = link.service === 'line' ? 'LINE' : 'Instagram';
      return <div className="flex flex-wrap items-center gap-2 min-w-0" key={link.url}>
        <Button asChild variant="outline" className="flex-1 min-w-0 h-auto min-h-11 whitespace-normal text-center">
          <a href={link.url} target="_blank" rel="noopener noreferrer">{ja ? `${name}に参加` : `Join ${name}`}<FontAwesomeIcon icon={faArrowUpRightFromSquare} /></a>
        </Button>
        <Button variant="outline" onClick={() => void copy(link.url)} aria-label={ja ? `${name}の招待リンクをコピー` : `Copy ${name} invitation link`}><FontAwesomeIcon icon={faCopy} /></Button>
      </div>;
    }) : <p className="text-sm text-muted-foreground">{ja ? '招待リンクは準備中です。運営にお問い合わせください。' : 'Invitation links are not available yet. Please contact the staff.'}</p>}
    {manualUrl && <div className="space-y-1">
      <p role="status" className="text-sm">{ja ? 'コピーできませんでした。リンクを選択してコピーしてください。' : 'Could not copy. Select and copy the link below.'}</p>
      <Input aria-label={ja ? 'コピー用の招待リンク' : 'Invitation link to copy'} value={manualUrl} readOnly onFocus={(e) => e.currentTarget.select()} />
    </div>}
    {links.length > 0 && <p className="text-xs text-muted-foreground">{ja ? '開けない場合は、招待リンクをコピーしてSafari・Chromeで開いてください。' : 'If the link does not open, copy it and open it in Safari or Chrome.'}</p>}
  </section>;
}
