import type { Language } from '../../domain/types/app';

interface AuthCompleteScreenProps {
  onContinue: () => void;
  language: Language;
  onLanguageChange: (lang: Language) => void;
}

export function AuthCompleteScreen({ onContinue, language, onLanguageChange }: AuthCompleteScreenProps) {
  return (
    <div className="w-full h-screen relative bg-[#F5F1E8]">
      <div className="absolute top-7 right-4 z-10">
        <button
          onClick={() => onLanguageChange(language === 'ja' ? 'en' : 'ja')}
          className="bg-[#3D3D4E] text-[#F5F1E8] px-3 py-2 rounded-lg text-sm font-medium"
        >
          {language === 'ja' ? 'English' : '日本語'}
        </button>
      </div>

      <div className="flex flex-col items-center justify-center h-full px-4">
        <div className="bg-[#49B1E4] rounded-full w-16 h-16 flex items-center justify-center mb-6">
          <svg className="w-8 h-8" fill="none" viewBox="0 0 32 32">
            <path d="M6.66669 16L13.3334 22.6667L26.6667 9.33337" stroke="white" strokeWidth="2.66593" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>

        <h2 className="text-[#3D3D4E] text-base text-center mb-8">
          {language === 'ja' ? '認証完了' : 'Authentication Complete'}
        </h2>

        <button
          onClick={onContinue}
          className="bg-[#49B1E4] text-[#F5F1E8] px-8 py-3 rounded-lg text-sm font-medium w-full max-w-[350px]"
        >
          {language === 'ja' ? '次へ' : 'Next'}
        </button>
      </div>
    </div>
  );
}
