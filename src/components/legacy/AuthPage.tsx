import { useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { ArrowLeft } from 'lucide-react';
import type { Language } from '../../domain/types/app';

interface AuthPageProps {
  onLogin: (email: string, password: string) => void;
  onBack: () => void;
  language: Language;
}

const translations = {
  ja: { loginTitle: 'ログイン', loginDesc: 'メールアドレスとパスワードを入力してください', email: 'メールアドレス', password: 'パスワード', loginBtn: 'ログイン', back: '戻る' },
  en: { loginTitle: 'Login', loginDesc: 'Enter your email and password', email: 'Email', password: 'Password', loginBtn: 'Login', back: 'Back' }
};

export function AuthPage({ onLogin, onBack, language }: AuthPageProps) {
  const t = translations[language];
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const handleLogin = (e: React.FormEvent) => { e.preventDefault(); onLogin(email, password); };
  return (
    <div className="min-h-screen bg-linear-to-br from-[#F5F1E8] via-[#EFE9DD] to-[#E8E4DB] py-12 px-4">
      <div className="container mx-auto max-w-md">
        <Button variant="ghost" onClick={onBack} className="mb-4"><ArrowLeft className="w-4 h-4 mr-2" />{t.back}</Button>
        <Card>
          <CardHeader><CardTitle>{t.loginTitle}</CardTitle><CardDescription>{t.loginDesc}</CardDescription></CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2"><Label htmlFor="login-email">{t.email}</Label><Input id="login-email" type="email" placeholder="example@university.ac.jp" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
              <div className="space-y-2"><Label htmlFor="login-password">{t.password}</Label><Input id="login-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required /></div>
              <Button type="submit" className="w-full bg-[#49B1E4] hover:bg-[#3A9FD3]">{t.loginBtn}</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
