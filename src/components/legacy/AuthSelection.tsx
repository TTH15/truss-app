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
          className="w-full bg-white border-2 border-gray-300 rounded-xl shadow-md p-6 hover:shadow-xl hover:border-[#49B1E4] transition-all duration-300 group"
        >
          <div className="flex items-center justify-center gap-3 mb-2">
            <svg className="w-6 h-6" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            <span className="text-xl font-semibold text-[#3D3D4E] group-hover:text-[#49B1E4]">{t.googleAuth}</span>
          </div>
          <p className="text-sm text-gray-500 text-center">{t.authDesc}</p>
        </button>
      </div>

      <div className="mt-12 text-center text-sm text-gray-500">
        <p>© 2026 Truss International Club</p>
      </div>
    </div>
  );
}
