import type { Language } from '../../domain/types/app';

interface AlreadyRegisteredCardProps {
  language: Language;
  onBackToAccountSelection: () => void;
}

export function AlreadyRegisteredCard({ language, onBackToAccountSelection }: AlreadyRegisteredCardProps) {
  return (
    <div className="h-[119px] relative w-full max-w-[399px] mx-auto mb-6">
      <div className="absolute bg-white border-[0.664px] border-[rgba(61,61,78,0.15)] border-solid inset-0 rounded-[14px]" />
      <p className="absolute font-semibold inset-[20.17%_0_56.3%_0] leading-[28px] text-[#3d3d4e] text-[18px] text-center tracking-[-0.4395px]">
        {language === 'ja' ? 'すでに登録したことがありますか？' : 'Already registered before?'}
      </p>
      <button
        onClick={onBackToAccountSelection}
        className="absolute bg-white border-[#d1d5dc] border-[1.959px] border-solid inset-[52.1%_21.3%_12.61%_21.05%] rounded-[14px] shadow-[0px_4px_6px_-1px_rgba(0,0,0,0.1),0px_2px_4px_-2px_rgba(0,0,0,0.1)] hover:bg-gray-50 transition-colors"
      />
      <p className="absolute font-semibold inset-[57.98%_25.06%_18.49%_24.56%] leading-[28px] text-[#3d3d4e] text-[18px] text-center tracking-[-0.4395px] pointer-events-none">
        {language === 'ja' ? 'アカウント選択に戻る' : 'Back to Account Selection'}
      </p>
    </div>
  );
}
