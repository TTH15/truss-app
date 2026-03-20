import { useState } from 'react';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { Search, Globe2 } from 'lucide-react';
import type { Language } from '../../domain/types/app';

interface MembersPageProps { language: Language; }

const translations = {
  ja: { title: 'メンバー', search: 'メンバーを検索...', japanese: '日本人学生・国内学生', regularInternational: '正規留学生', exchange: '交換留学生', speaks: '話せる言語', from: '出身' },
  en: { title: 'Members', search: 'Search members...', japanese: 'Japanese Student', regularInternational: 'Regular International', exchange: 'Exchange Student', speaks: 'Speaks', from: 'From' }
};

export function MembersPage({ language }: MembersPageProps) {
  const t = translations[language];
  const [searchQuery, setSearchQuery] = useState('');
  const members = [
    { id: 1, name: language === 'ja' ? '田中太郎' : 'Taro Tanaka', nickname: 'Taro', furigana: 'たろう', category: 'japanese' as const, languages: ['Japanese', 'English'], country: 'Japan', avatar: 'TT' },
    { id: 2, name: 'Emma Wilson', nickname: 'Emma', furigana: 'エマ', category: 'exchange' as const, languages: ['English', 'Japanese'], country: 'USA', avatar: 'EW' },
    { id: 3, name: 'Li Wei', nickname: 'Wei', furigana: 'ウェイ', category: 'regular-international' as const, languages: ['Chinese', 'English', 'Japanese'], country: 'China', avatar: 'LW' },
    { id: 4, name: language === 'ja' ? '佐藤花子' : 'Hanako Sato', nickname: 'Hana', furigana: 'はな', category: 'japanese' as const, languages: ['Japanese', 'Korean'], country: 'Japan', avatar: 'HS' },
    { id: 5, name: 'Marie Dubois', nickname: 'Marie', furigana: 'マリー', category: 'exchange' as const, languages: ['French', 'English', 'Japanese'], country: 'France', avatar: 'MD' },
    { id: 6, name: 'Park Min-jun', nickname: 'Minjun', furigana: 'ミンジュン', category: 'regular-international' as const, languages: ['Korean', 'English', 'Japanese'], country: 'South Korea', avatar: 'PM' },
  ];
  const getCategoryLabel = (category: string) => category === 'japanese' ? t.japanese : category === 'regular-international' ? t.regularInternational : category === 'exchange' ? t.exchange : '';
  const getCategoryColor = (category: string) => category === 'japanese' ? 'bg-blue-100 text-blue-800' : category === 'regular-international' ? 'bg-purple-100 text-purple-800' : category === 'exchange' ? 'bg-pink-100 text-pink-800' : 'bg-gray-100 text-gray-800';
  const filteredMembers = members.filter((member) => member.name.toLowerCase().includes(searchQuery.toLowerCase()) || member.nickname.toLowerCase().includes(searchQuery.toLowerCase()) || member.furigana.includes(searchQuery));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between"><h1 className="text-gray-900">{t.title}</h1><Badge variant="secondary" className="text-sm">{filteredMembers.length} {language === 'ja' ? '人' : 'members'}</Badge></div>
      <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" /><Input placeholder={t.search} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" /></div>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredMembers.map((member) => (
          <Card key={member.id} className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <Avatar className="w-16 h-16 bg-linear-to-br from-blue-600 to-purple-600"><AvatarFallback className="text-white text-xl">{member.avatar}</AvatarFallback></Avatar>
                <div className="flex-1 min-w-0"><h3 className="text-gray-900 truncate">{member.name}</h3><p className="text-gray-600 text-sm">{member.nickname} ({member.furigana})</p><Badge className={`mt-2 text-xs ${getCategoryColor(member.category)}`}>{getCategoryLabel(member.category)}</Badge></div>
              </div>
              <div className="mt-4 space-y-2">
                <div className="flex items-start gap-2 text-sm"><Globe2 className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" /><div><span className="text-gray-600">{t.speaks}:</span><span className="text-gray-900 ml-1">{member.languages.join(', ')}</span></div></div>
                <div className="flex items-center gap-2 text-sm"><span className="text-gray-600">{t.from}:</span><span className="text-gray-900">{member.country}</span></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
