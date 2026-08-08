import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faWallet } from '@fortawesome/free-solid-svg-icons';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';

/** 会費未払いを示す赤い財布アイコン（メンバー名簿・運営チャットで共用） */
export function FeeUnpaidWalletIcon({ tooltip }: { tooltip: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex shrink-0 cursor-default items-center align-middle text-[#dc2626]" aria-label={tooltip} tabIndex={0}>
          <FontAwesomeIcon icon={faWallet} className="h-[1.05rem] w-[1.05rem]" />
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" sideOffset={6} className="max-w-[240px] border-0 bg-[#1f2937] px-3 py-2 text-xs font-normal text-balance text-white shadow-lg">
        {tooltip}
      </TooltipContent>
    </Tooltip>
  );
}
