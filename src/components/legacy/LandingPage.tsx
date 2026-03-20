import { Button } from '../ui/button';
import { Shield } from 'lucide-react';
import { ImageWithFallback } from '../figma/ImageWithFallback';
import logoImage from '@/assets/bd10685cae8608f82fd9e782ed0442fecb293fc5.png';
import type { Language } from '../../domain/types/app';

interface LandingPageProps {
  onGetStarted: () => void;
  onAdminLogin: () => void;
  language: Language;
  onLanguageChange: (lang: Language) => void;
}

export function LandingPage({ onAdminLogin, language, onLanguageChange }: LandingPageProps) {
  const t = language === 'ja'
    ? { title: 'Truss!', appName: 'Truss', adminLogin: '運営ログイン' }
    : { title: 'Truss!', appName: 'Truss', adminLogin: 'Admin Login' };

  return (
    <div className="min-h-screen bg-linear-to-br from-[#F5F1E8] via-[#EFE9DD] to-[#E8E4DB]">
      <header className="container mx-auto px-4 py-6 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <ImageWithFallback src={logoImage} alt="Logo" loading="eager" className="w-10 h-10 object-contain" />
          <span className="text-[#3D3D4E]" style={{ fontFamily: "'Island Moments', cursive" }}>{t.appName}</span>
        </div>
        <Button variant={language === 'ja' ? 'default' : 'outline'} size="sm" onClick={() => onLanguageChange(language === 'ja' ? 'en' : 'ja')} className={language === 'ja' ? 'bg-[#3D3D4E] text-[#F5F1E8]' : 'border-[#3D3D4E] text-[#3D3D4E]'}>
          {language === 'ja' ? 'English' : '日本語'}
        </Button>
      </header>

      <section className="container mx-auto px-4 py-20 text-center flex items-center justify-center min-h-[calc(100vh-120px)]">
        <div className="max-w-3xl mx-auto">
          <button onClick={onAdminLogin} className="group mx-auto mb-8 cursor-pointer transition-all hover:scale-105 active:scale-95 focus:outline-none rounded-3xl" style={{ ['--u' as string]: '18px' }}>
            <div className="logo-container relative" style={{ width: 'calc(var(--u) * 28)', height: 'calc(var(--u) * 12)', margin: '0 auto' }}>
              <div className="ball absolute w-[calc(var(--u)*1.6)] h-[calc(var(--u)*1.6)] bg-[#78D850] rounded-full" style={{ left: 'calc(var(--u) * 2)', top: 'calc(var(--u) * 0.8)', animation: 'ball-roll-bounce 3s cubic-bezier(0.4, 0, 0.2, 1) infinite', transformOrigin: 'center center' }} />
              <div className="topbar absolute bg-[#38B0F8] rounded-full" style={{ left: 0, top: 'calc(var(--u) * 3.5)', width: 'calc(var(--u) * 8)', height: 'calc(var(--u) * 0.65)', animation: 'bar-bounce-up 3s ease-in-out infinite', transformOrigin: 'left center' }} />
              <div className="stem absolute bg-[#38B0F8] rounded-full" style={{ left: 'calc(var(--u) * 1.2)', top: 'calc(var(--u) * 4.15)', width: 'calc(var(--u) * 0.65)', height: 'calc(var(--u) * 7)', transformOrigin: 'center top' }} />
              <div className="word-container absolute flex items-center text-[#38B0F8] tracking-wider leading-none font-medium" style={{ left: 'calc(var(--u) * 9)', top: 'calc(var(--u) * 5)', fontSize: 'calc(var(--u) * 5.5)', letterSpacing: 'calc(var(--u) * 0.15)' }}>
                {['r', 'u', 's', 's'].map((char, index) => <span key={index} className="ch inline-block" style={{ animation: 'text-wave 1200ms cubic-bezier(.2,.9,.2,1) infinite', animationDelay: `${index * 90}ms`, transformOrigin: 'center bottom' }}>{char}</span>)}
              </div>
            </div>
          </button>
          <h1 className="text-[#3D3D4E] mb-4">{t.title}</h1>
          <div className="mt-8 pt-8 border-t border-[#3D3D4E]/10">
            <Button onClick={onAdminLogin} variant="outline" className="border-[#3D3D4E] text-[#3D3D4E] hover:bg-[#3D3D4E] hover:text-white">
              <Shield className="w-4 h-4 mr-2" />
              {t.adminLogin}
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
