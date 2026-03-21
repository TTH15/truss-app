import { Button } from '../ui/button';
import { ImageWithFallback } from '../figma/ImageWithFallback';
import logoImage from '@/assets/bd10685cae8608f82fd9e782ed0442fecb293fc5.png';
import type { Language } from '../../domain/types/app';

interface AuthSelectionProps {
  language: Language;
  onLanguageChange: (lang: Language) => void;
  onGoogleAuth: () => void;
}

const translations = {
  ja: {
    appName: 'Truss',
    tagline: '国際交流をもっと身近に',
    googleAuth: 'Googleでサインイン',
    authDesc: 'サインイン後、初回の方は新規登録画面が表示されます',
  },
  en: {
    appName: 'Truss',
    tagline: 'Making International Exchange Accessible',
    googleAuth: 'Sign in with Google',
    authDesc: 'First-time users will see the registration screen after signing in',
  }
};

export function AuthSelection({ language, onLanguageChange, onGoogleAuth }: AuthSelectionProps) {
  const t = translations[language];

  return (
    <div className="min-h-screen bg-[#F5F1E8] flex flex-col items-center justify-center p-4">
      <div className="absolute top-4 right-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onLanguageChange(language === 'ja' ? 'en' : 'ja')}
          className="text-[#3D3D4E] hover:bg-[#E8E4DB]"
        >
          {language === 'ja' ? 'English' : '日本語'}
        </Button>
      </div>

      <div className="text-center mb-12">
        <div className="flex justify-center mb-4">
          <ImageWithFallback src={logoImage} alt="Logo" className="w-24 h-24 object-contain" />
        </div>
        <h1 className="text-5xl mb-2 text-[#3D3D4E]" style={{ fontFamily: "'Island Moments', cursive" }}>
          {t.appName}
        </h1>
        <p className="text-gray-600 text-lg">{t.tagline}</p>
      </div>

      <div className="w-full max-w-md space-y-4">
        <button
          onClick={onGoogleAuth}
          className="w-full bg-[#F5F1E8] border border-[rgba(61,61,78,0.22)] rounded-xl p-6 hover:border-[#49B1E4] transition-all duration-300 group"
        >
          <div className="flex items-center justify-center gap-2">
            <svg
              className="w-5 h-5"
              version="1.1"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 48 48"
              xmlnsXlink="http://www.w3.org/1999/xlink"
              style={{ display: "block" }}
              aria-hidden="true"
            >
              <path
                fill="#EA4335"
                d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
              ></path>
              <path
                fill="#4285F4"
                d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
              ></path>
              <path
                fill="#FBBC05"
                d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
              ></path>
              <path
                fill="#34A853"
                d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
              ></path>
              <path fill="none" d="M0 0h48v48H0z"></path>
            </svg>
            <span className="text-xl font-semibold text-[#3D3D4E] group-hover:text-[#49B1E4]">{t.googleAuth}</span>
          </div>
          <p className="mt-2 text-sm text-gray-500 text-center">{t.authDesc}</p>
        </button>
      </div>

      <div className="mt-12 text-center text-sm text-gray-500">
        <p>© 2026 Truss International Club</p>
      </div>
    </div>
  );
}
