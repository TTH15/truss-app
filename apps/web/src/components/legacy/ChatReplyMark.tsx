import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCircleExclamation } from '@fortawesome/free-solid-svg-icons';
import { Tooltip, TooltipTrigger, TooltipContent } from '../ui/tooltip';
import { Popover, PopoverTrigger, PopoverContent } from '../ui/popover';
import { Button } from '../ui/button';
import type { Language } from '@truss/core';

export function ChatReplyMark({ days, language, disabled, onDismiss }: { days: number; language: Language; disabled: boolean; onDismiss: () => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const label = language === 'ja' ? (days === 0 ? '1日未満の未返信です' : `${days}日未返信です`) : (days === 0 ? 'Awaiting reply for less than a day' : `Awaiting reply for ${days} day${days === 1 ? '' : 's'}`);
  return <Popover open={open} onOpenChange={setOpen}>
    <Tooltip><TooltipTrigger asChild><PopoverTrigger asChild>
      <button type="button" aria-label={label} className="flex size-8 shrink-0 items-center justify-center rounded-full text-amber-700 hover:bg-amber-50 focus-visible:outline-2 focus-visible:outline-amber-700"><FontAwesomeIcon icon={faCircleExclamation} className="size-4" /></button>
    </PopoverTrigger></TooltipTrigger><TooltipContent>{label}</TooltipContent></Tooltip>
    <PopoverContent className="w-64 space-y-3 text-sm" align="end">
      <p>{label}</p>
      <Button variant="outline" size="sm" disabled={disabled} onClick={async () => { await onDismiss(); setOpen(false); }}>{language === 'ja' ? '自分の表示から消す' : 'Dismiss for me'}</Button>
    </PopoverContent>
  </Popover>;
}
