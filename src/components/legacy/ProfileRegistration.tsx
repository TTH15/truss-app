import { useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { X } from 'lucide-react';
import type { User, Language } from '../../domain/types/app';

interface ProfileRegistrationProps {
  email: string;
  onComplete: (user: User) => void;
  language: Language;
  onBack?: () => void;
  existingUser?: User;
}

const translations = {
  ja: {
    title: 'プロフィール登録',
    desc: '追加情報を入力して、全ての機能をご利用ください',
    name: '名前',
    nickname: 'ニックネーム',
    furigana: 'ふりがな',
    languages: '話せる言語',
    country: '生まれた国',
    phone: '電話番号',
    phonePlaceholder: '090-1234-5678',
    organizations: '他の所属団体',
    organizationsPlaceholder: 'サークル名、ボランティア団体など',
    submit: '登録する',
    grade: '学年',
    major: '専攻',
    alreadyRegistered: '（登録済み）',
  },
  en: {
    title: 'Profile Registration',
    desc: 'Complete your profile to access all features',
    name: 'Name',
    nickname: 'Nickname',
    furigana: 'Furigana (Reading)',
    languages: 'Languages',
    country: 'Country of Birth',
    phone: 'Phone Number',
    phonePlaceholder: '090-1234-5678',
    organizations: 'Other Organizations',
    organizationsPlaceholder: 'Clubs, volunteer groups, etc.',
    submit: 'Register',
    grade: 'Grade',
    major: 'Major',
    alreadyRegistered: '(Already Registered)',
  }
};

export function ProfileRegistration({ email, onComplete, language, onBack, existingUser }: ProfileRegistrationProps) {
  const t = translations[language];
  const [formData, setFormData] = useState({
    name: existingUser?.name || '',
    nickname: existingUser?.nickname || '',
    furigana: existingUser?.furigana || '',
    languages: existingUser?.languages?.join(', ') || '',
    country: existingUser?.country || '',
    category: existingUser?.category || '' as 'japanese' | 'regular-international' | 'exchange' | '',
    grade: existingUser?.grade || '',
    major: existingUser?.major || '',
    phone: existingUser?.phone || '',
    organizations: existingUser?.organizations || '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let registrationStep: 'profile_completion' | 'fee_payment' | 'fully_active';
    let feePaid = false;

    if (existingUser?.category === 'exchange' || existingUser?.category === 'regular-international') {
      registrationStep = 'fully_active';
      feePaid = true;
    } else {
      registrationStep = 'fee_payment';
      feePaid = false;
    }

    const updatedUser: User = {
      ...existingUser,
      id: existingUser?.id || Math.random().toString(36).substr(2, 9),
      email: existingUser?.email || email,
      name: formData.name,
      nickname: formData.nickname,
      furigana: formData.furigana,
      languages: formData.languages.split(',').map((l) => l.trim()),
      country: formData.country,
      category: existingUser?.category || formData.category as 'japanese' | 'regular-international' | 'exchange',
      approved: existingUser?.approved || false,
      studentIdImage: existingUser?.studentIdImage || '',
      studentNumber: existingUser?.studentNumber || '',
      grade: formData.grade,
      major: formData.major,
      registrationStep,
      emailVerified: true,
      initialRegistered: true,
      profileCompleted: true,
      feePaid,
      phone: formData.phone,
      organizations: formData.organizations,
    };
    onComplete(updatedUser);
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-[#F5F1E8] via-[#EFE9DD] to-[#E8E4DB] py-12 px-4">
      <div className="container mx-auto max-w-2xl">
        <Card className="relative">
          {onBack && (
            <Button onClick={onBack} variant="ghost" size="icon" className="absolute right-4 top-4 z-10">
              <X className="w-5 h-5" />
            </Button>
          )}
          <CardHeader>
            <CardTitle>{t.title}</CardTitle>
            <CardDescription>{t.desc}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">{t.name} {t.alreadyRegistered}</Label>
                  <Input id="name" value={formData.name} disabled className="bg-gray-100 cursor-not-allowed" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="furigana">{t.furigana} {t.alreadyRegistered}</Label>
                  <Input id="furigana" value={formData.furigana} disabled className="bg-gray-100 cursor-not-allowed" />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="grade">{t.grade} {t.alreadyRegistered}</Label>
                  <Input id="grade" value={formData.grade} disabled className="bg-gray-100 cursor-not-allowed" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="major">{t.major} {t.alreadyRegistered}</Label>
                  <Input id="major" value={formData.major} disabled className="bg-gray-100 cursor-not-allowed" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="nickname">{t.nickname}</Label>
                <Input id="nickname" value={formData.nickname} onChange={(e) => setFormData({ ...formData, nickname: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="languages">{t.languages}</Label>
                <Input id="languages" value={formData.languages} onChange={(e) => setFormData({ ...formData, languages: e.target.value })} placeholder="Japanese, English, Chinese" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="country">{t.country}</Label>
                <Input id="country" value={formData.country} onChange={(e) => setFormData({ ...formData, country: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">{t.phone}</Label>
                <Input id="phone" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} placeholder={t.phonePlaceholder} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="organizations">{t.organizations}</Label>
                <Input id="organizations" value={formData.organizations} onChange={(e) => setFormData({ ...formData, organizations: e.target.value })} placeholder={t.organizationsPlaceholder} />
              </div>
              <Button type="submit" className="w-full bg-[#49B1E4] hover:bg-[#3A9FD3]">{t.submit}</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
