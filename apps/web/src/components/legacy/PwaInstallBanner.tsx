import { useEffect, useState, useSyncExternalStore } from 'react';
import { useLocalStorageDismissal } from '../../lib/use-local-storage-dismissal';
import { X } from 'lucide-react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faMobileScreenButton,
  faArrowUpFromBracket,
  faSquarePlus,
} from '@fortawesome/free-solid-svg-icons';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import type { Language } from '@truss/core';

const DISMISSED_KEY = 'truss-pwa-install-dismissed-v1';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const translations = {
  ja: {
    title: 'ホーム画面に追加できます',
    message: 'Truss をホーム画面に追加すると、アプリのようにワンタップで開けます。',
    install: 'ホーム画面に追加',
    howTo: '追加方法を見る',
    iosTitle: 'ホーム画面への追加方法(iPhone / iPad)',
    iosStep1: 'Safari 下部の共有ボタンをタップ',
    iosStep2: '「ホーム画面に追加」を選択',
    iosStep3: '右上の「追加」をタップ',
    iosNote: '※ Safari 以外のブラウザでは表示されない場合があります。',
    close: '閉じる',
  },
  en: {
    title: 'Add Truss to your home screen',
    message: 'Add Truss to your home screen to open it like an app with one tap.',
    install: 'Add to Home Screen',
    howTo: 'See how to add',
    iosTitle: 'Add to Home Screen (iPhone / iPad)',
    iosStep1: 'Tap the Share button at the bottom of Safari',
    iosStep2: 'Select "Add to Home Screen"',
    iosStep3: 'Tap "Add" in the top right corner',
    iosNote: '* This may not be available in browsers other than Safari.',
    close: 'Close',
  },
};

function isStandaloneDisplay(): boolean {
  if (typeof window === 'undefined') return true;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

function isIosSafariCapable(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  const isIos =
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  return isIos;
}

/**
 * 「ホーム画面に追加」の案内はスマホ・タブレット限定。
 * デスクトップ Chrome でも beforeinstallprompt は発火するが、文言が実態に合わないため出さない。
 * 主ポインタが粗い(指)かどうかで判定する。
 */
function isTouchDevice(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(pointer: coarse)').matches;
}

const emptySubscribe = () => () => {};

export function PwaInstallBanner({ language }: { language: Language }) {
  const t = translations[language];
  const hydrated = useSyncExternalStore(emptySubscribe, () => true, () => false);
  const [dismissed, dismiss] = useLocalStorageDismissal(DISMISSED_KEY);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [iosGuideOpen, setIosGuideOpen] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') dismiss();
    setInstallPrompt(null);
  };

  // インストール済み(standalone 起動)・デスクトップ・非対応環境・閉じた後は出さない
  if (!hydrated || dismissed) return null;
  if (!isTouchDevice() || isStandaloneDisplay()) return null;
  if (!installPrompt && !isIosSafariCapable()) return null;

  return (
    <>
      <div className="relative bg-white border border-[#49B1E4]/40 p-4 rounded-xl mb-4 shadow-sm">
        <button
          onClick={dismiss}
          className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors"
          aria-label="Close"
        >
          <X className="w-4 h-4 text-gray-500" />
        </button>
        <div className="flex items-start gap-3 pr-6">
          <div className="w-10 h-10 bg-[#E0F3FB] rounded-full flex items-center justify-center shrink-0">
            <FontAwesomeIcon icon={faMobileScreenButton} className="w-5 h-5 text-[#49B1E4]" />
          </div>
          <div className="flex-1">
            <h4 className="font-bold text-[#3D3D4E]">{t.title}</h4>
            <p className="text-sm text-[#4A5565] mt-1">{t.message}</p>
            {installPrompt ? (
              <Button
                onClick={handleInstall}
                size="sm"
                className="mt-2 bg-[#49B1E4] hover:bg-[#3A9FD3] text-white"
              >
                {t.install}
              </Button>
            ) : (
              <button
                onClick={() => setIosGuideOpen(true)}
                className="mt-2 text-sm font-medium text-[#49B1E4] underline hover:no-underline"
              >
                {t.howTo}
              </button>
            )}
          </div>
        </div>
      </div>

      <Dialog open={iosGuideOpen} onOpenChange={setIosGuideOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{t.iosTitle}</DialogTitle>
            <DialogDescription className="sr-only">{t.title}</DialogDescription>
          </DialogHeader>
          <ol className="space-y-4 text-sm text-[#3D3D4E]">
            <li className="flex items-center gap-3">
              <span className="w-6 h-6 rounded-full bg-[#49B1E4] text-white flex items-center justify-center text-xs shrink-0">1</span>
              <span className="flex items-center gap-2 flex-wrap">
                {t.iosStep1}
                <FontAwesomeIcon icon={faArrowUpFromBracket} className="w-4 h-4 text-[#49B1E4]" />
              </span>
            </li>
            <li className="flex items-center gap-3">
              <span className="w-6 h-6 rounded-full bg-[#49B1E4] text-white flex items-center justify-center text-xs shrink-0">2</span>
              <span className="flex items-center gap-2 flex-wrap">
                {t.iosStep2}
                <FontAwesomeIcon icon={faSquarePlus} className="w-4 h-4 text-[#49B1E4]" />
              </span>
            </li>
            <li className="flex items-center gap-3">
              <span className="w-6 h-6 rounded-full bg-[#49B1E4] text-white flex items-center justify-center text-xs shrink-0">3</span>
              <span>{t.iosStep3}</span>
            </li>
          </ol>
          <p className="text-xs text-[#6B6B7A]">{t.iosNote}</p>
          <Button onClick={() => setIosGuideOpen(false)} variant="outline" className="w-full">
            {t.close}
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
