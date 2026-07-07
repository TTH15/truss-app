import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Shield } from 'lucide-react';
import type { Language } from '../../domain/types/app';

interface AdminLoginProps {
  language: Language;
  onLogin: (email: string, password: string) => void | Promise<void>;
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
  },
  en: {
    title: 'Admin Login',
    subtitle: 'Login page for admin members only',
    emailLabel: 'Email Address',
    emailPlaceholder: 'admin@example.com',
    passwordLabel: 'Password',
    passwordPlaceholder: 'Enter password',
    loginButton: 'Login',
  }
};

export function AdminLogin({ language, onLogin }: AdminLoginProps) {
  const t = translations[language];
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      await onLogin(email, password);
    } finally {
      // 成功時は親側の遷移でアンマウントされますが、
      // 失敗時にローディングが残らないよう保険で戻します。
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-[#F5F1E8] via-[#EFE9DD] to-[#E8E4DB] py-12 px-4">
      <div className="container mx-auto max-w-md">
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-linear-to-br from-[#49B1E4] to-[#3A9FD3] rounded-full flex items-center justify-center mb-4">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <CardTitle>{t.title}</CardTitle>
            <CardDescription>{t.subtitle}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4" aria-busy={isSubmitting}>
              <div className="space-y-2">
                <Label htmlFor="email">{t.emailLabel}</Label>
                {isSubmitting ? (
                  <div className="h-10 rounded-md bg-[#F3F3F3] animate-pulse" />
                ) : (
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t.emailPlaceholder}
                    required
                    disabled={isSubmitting}
                  />
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">{t.passwordLabel}</Label>
                {isSubmitting ? (
                  <div className="h-10 rounded-md bg-[#F3F3F3] animate-pulse" />
                ) : (
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={t.passwordPlaceholder}
                    required
                    disabled={isSubmitting}
                  />
                )}
              </div>

              <Button
                type="submit"
                className="w-full bg-[#49B1E4] hover:bg-[#3A9FD3]"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="w-4 h-4 rounded-full border-2 border-white/70 border-t-white animate-spin" />
                    {language === 'ja' ? 'ログイン中...' : 'Logging in...'}
                  </span>
                ) : (
                  t.loginButton
                )}
              </Button>
            </form>

            {isSubmitting && (
              <p className="mt-3 text-center text-xs text-muted-foreground">
                {language === 'ja' ? 'しばらくお待ちください。' : 'Please wait a moment.'}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
