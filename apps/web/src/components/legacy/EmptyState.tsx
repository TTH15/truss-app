import type { ReactNode } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';

/**
 * データが0件のときの表示。
 * 「何も無い」で終わらせず、次にできることを示す(運営画面で既に使っている形をユーザー画面へ揃えたもの)。
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: IconDefinition;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className="w-16 h-16 rounded-full bg-[#E8E4DB]/60 flex items-center justify-center mb-4">
        <FontAwesomeIcon icon={icon} className="w-7 h-7 text-[#9A968C]" />
      </div>
      <p className="text-[#3D3D4E] font-medium">{title}</p>
      {description && <p className="text-sm text-[#6B6B7A] mt-1.5 max-w-xs">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
