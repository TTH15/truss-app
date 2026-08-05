import type { ReactNode } from 'react';
import { X } from 'lucide-react';

interface ConfirmDialogProps {
  title: string;
  description: string;
  onClose: () => void;
  /** 背景を押して閉じられるか。処理中に閉じられると困る場面では false にする */
  dismissOnBackdrop?: boolean;
  /** 下部のボタン。押したときの見た目や数がダイアログごとに違うため、丸ごと受け取る */
  children: ReactNode;
}

/** 保存・削除の確認に使う小さなダイアログ（枠と見出しは共通、ボタンだけ差し替える） */
export function ConfirmDialog({ title, description, onClose, dismissOnBackdrop = false, children }: ConfirmDialogProps) {
  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={dismissOnBackdrop ? onClose : undefined}
    >
      <div
        className="bg-[#F5F1E8] rounded-[10px] w-full max-w-[400px] shadow-xl border border-[rgba(61,61,78,0.15)] relative max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-[rgba(61,61,78,0.15)]">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <h2 className="text-[#3D3D4E] text-lg font-semibold tracking-[-0.4395px]">{title}</h2>
              <p className="text-[#6B6B7A] text-sm tracking-[-0.1504px]">{description}</p>
            </div>
            <button onClick={onClose} className="text-[#3D3D4E] hover:text-[#1a1a24] transition-colors opacity-70">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}
