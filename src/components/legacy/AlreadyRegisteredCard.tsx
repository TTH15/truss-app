import type { Language } from '../../domain/types/app';

interface AlreadyRegisteredCardProps {
  language: Language;
  onBackToAccountSelection: () => void;
}

export function AlreadyRegisteredCard({ language, onBackToAccountSelection }: AlreadyRegisteredCardProps) {
  return (
    <div className="w-full max-w-[399px] mx-auto mb-6 rounded-[14px] border border-[rgba(61,61,78,0.15)] bg-white px-4 py-5">
      <p className="font-semibold leading-[28px] text-[#3d3d4e] text-[18px] text-center tracking-[-0.4395px]">
        {language === 'ja' ? 'すでに登録したことがありますか？' : 'Already registered before?'}
      </p>
      <div className="mt-3 flex justify-center">
        <button
          onClick={onBackToAccountSelection}
          className="max-w-full bg-white border-[#d1d5dc] border-2 border-solid rounded-[14px] px-4 py-2 shadow-[0px_4px_6px_-1px_rgba(0,0,0,0.1),0px_2px_4px_-2px_rgba(0,0,0,0.1)] hover:bg-gray-50 transition-colors text-[#3d3d4e] text-[18px] font-semibold leading-tight text-center break-words"
        >
          {language === 'ja' ? 'アカウント選択に戻る' : 'Back to Account Selection'}
        </button>
      </div>
    </div>
  );
}
