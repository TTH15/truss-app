import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { ArrowLeft, Shield } from 'lucide-react';
import type { Language } from '../../domain/types/app';

interface AdminLoginProps {
  language: Language;
  onLogin: (email: string, password: string) => void;
  onBack: () => void;
}

const translations = {
  ja: {
    title: '運営ログイン',
    subtitle: '運営メンバー専用のログイン画面です',
    emailLabel: 'ログインID',
    emailPlaceholder: 'admin@example.com',
    passwordLabel: 'パスワード',
    passwordPlaceholder: 'パスワードを入力',
    loginButton: 'ログイン',
    back: '戻る',
  },
  en: {
    title: 'Admin Login',
    subtitle: 'Login page for admin members only',
    emailLabel: 'Email Address',
    emailPlaceholder: 'admin@example.com',
    passwordLabel: 'Password',
    passwordPlaceholder: 'Enter password',
    loginButton: 'Login',
    back: 'Back',
  }
};

export function AdminLogin({ language, onLogin, onBack }: AdminLoginProps) {
  const t = translations[language];
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onLogin(email, password);
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-[#F5F1E8] via-[#EFE9DD] to-[#E8E4DB] py-12 px-4">
      <div className="container mx-auto max-w-md">
        <Button onClick={onBack} variant="ghost" className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          {t.back}
        </Button>

        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-linear-to-br from-[#49B1E4] to-[#3A9FD3] rounded-full flex items-center justify-center mb-4">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <CardTitle>{t.title}</CardTitle>
            <CardDescription>{t.subtitle}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">{t.emailLabel}</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t.emailPlaceholder} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">{t.passwordLabel}</Label>
                <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder={t.passwordPlaceholder} required />
              </div>
              <Button type="submit" className="w-full bg-[#49B1E4] hover:bg-[#3A9FD3]">
                {t.loginButton}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
