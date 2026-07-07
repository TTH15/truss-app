import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Mail, ArrowLeft, Check, FileText, Clock } from 'lucide-react';
import { toast } from 'sonner';
import type { Language } from '../../domain/types/app';

interface EmailVerificationProps {
  language: Language;
  onVerified: (email: string) => void;
  onBack: () => void;
  onLanguageChange: (lang: Language) => void;
  isLoginMode?: boolean;
}

const translations = {
  ja: {
    title: 'メール認証', loginTitle: 'ログイン', subtitle: '大学のメールアドレスを入力してください', loginSubtitle: '登録済みのメールアドレスを入力してください',
    emailLabel: '大学メールアドレス', emailPlaceholder: 'example@university.ac.jp', emailNote: 'デモ用: どのメールアドレスでも入力可能です',
    sendButton: '認証メールを送信', loginButton: 'ログイン', emailSentTitle: 'メールを送信しました', emailSentDescription: 'メールに記載されているリンクをクリックして認証を完了してください。',
    verifiedTitle: '認証完了', verifiedDescription: '次へ進んで初期登録を行ってください。', continueButton: '次へ', back: '戻る', invalidEmail: '有効なメールアドレスを入力してください',
    emailRequired: 'メールアドレスは必須です', step: 'ステップ', stepEmailVerification: '認証', stepInitialRegistration: '初期登録', stepApproval: '運営の承認',
  },
  en: {
    title: 'Email Verification', loginTitle: 'Login', subtitle: 'Enter your university email address', loginSubtitle: 'Enter your registered email address',
    emailLabel: 'University Email', emailPlaceholder: 'example@university.ac.jp', emailNote: 'Demo: Any email address is accepted',
    sendButton: 'Send Verification Email', loginButton: 'Login', emailSentTitle: 'Email Sent', emailSentDescription: 'Please click the link in the email to complete verification.',
    verifiedTitle: 'Verification Complete', verifiedDescription: 'Please proceed to initial registration.', continueButton: 'Continue', back: 'Back', invalidEmail: 'Please enter a valid email address',
    emailRequired: 'Email address is required', step: 'Step', stepEmailVerification: 'Email Verification', stepInitialRegistration: 'Initial Registration', stepApproval: 'Approval',
  }
};

export function EmailVerification({ language, onVerified, onBack, onLanguageChange, isLoginMode }: EmailVerificationProps) {
  const t = translations[language];
  const [email, setEmail] = useState('');
  const [step, setStep] = useState<'input' | 'sent' | 'verified'>('input');

  const validateEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

  const handleSendEmail = () => {
    if (!email) return void toast.error(t.emailRequired);
    if (!validateEmail(email)) return void toast.error(t.invalidEmail);
    toast.success(language === 'ja' ? 'メールを送信しました' : 'Email sent successfully');
    setStep('sent');
    setTimeout(() => {
      setStep('verified');
      toast.success(language === 'ja' ? 'メール認証が完了しました' : 'Email verification completed');
    }, 3000);
  };

  return (
    <div className="min-h-screen bg-[#F5F1E8] flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <div className="flex justify-between items-center mb-4">
          <Button variant="ghost" onClick={onBack}><ArrowLeft className="w-4 h-4 mr-2" />{t.back}</Button>
          <Button variant={language === 'ja' ? 'default' : 'outline'} size="sm" onClick={() => onLanguageChange(language === 'ja' ? 'en' : 'ja')} className={language === 'ja' ? 'bg-[#3D3D4E] text-[#F5F1E8]' : 'border-[#3D3D4E] text-[#3D3D4E]'}>
            {language === 'ja' ? 'English' : '日本語'}
          </Button>
        </div>

        <Card>
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-[#49B1E4] rounded-full flex items-center justify-center mx-auto mb-4">
              {step === 'verified' ? <Check className="w-8 h-8 text-white" /> : <Mail className="w-8 h-8 text-white" />}
            </div>
            <CardTitle>{step === 'input' ? (isLoginMode ? t.loginTitle : t.title) : step === 'sent' ? t.emailSentTitle : t.verifiedTitle}</CardTitle>
            <CardDescription>{step === 'input' ? (isLoginMode ? t.loginSubtitle : t.subtitle) : step === 'sent' ? t.emailSentDescription : t.verifiedDescription}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {step === 'input' && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="email">{t.emailLabel}</Label>
                  <Input id="email" type="email" placeholder={t.emailPlaceholder} value={email} onChange={(e) => setEmail(e.target.value)} />
                  <p className="text-sm text-gray-500">{t.emailNote}</p>
                </div>
                <Button onClick={handleSendEmail} className="w-full bg-[#49B1E4] hover:bg-[#3A9BD4]">{isLoginMode ? t.loginButton : t.sendButton}</Button>
              </>
            )}
            {step === 'sent' && <div className="text-center py-8"><Mail className="w-16 h-16 text-[#49B1E4] mx-auto mb-4 animate-pulse" /></div>}
            {step === 'verified' && <Button onClick={() => onVerified(email)} className="w-full bg-[#49B1E4] hover:bg-[#3A9BD4]">{t.continueButton}</Button>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
