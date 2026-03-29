import { useState } from 'react';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { Search, Globe2 } from 'lucide-react';
import type { Language, User } from '../../domain/types/app';

interface MembersPageProps {
  language: Language;
  members: User[];
}

const translations = {
  ja: { title: 'メンバー', search: 'メンバーを検索...', japanese: '日本人学生・国内学生', regularInternational: '正規留学生', exchange: '交換留学生', speaks: '話せる言語', from: '出身' },
  en: { title: 'Members', search: 'Search members...', japanese: 'Japanese Student', regularInternational: 'Regular International', exchange: 'Exchange Student', speaks: 'Speaks', from: 'From' }
};

export function MembersPage({ language, members }: MembersPageProps) {
  const t = translations[language];
  const [searchQuery, setSearchQuery] = useState('');
  const getAvatar = (name: string) => name.slice(0, 2).toUpperCase();
  const getCategoryLabel = (category: string) => category === 'japanese' ? t.japanese : category === 'regular-international' ? t.regularInternational : category === 'exchange' ? t.exchange : '';
  const getCategoryColor = (category: string) => category === 'japanese' ? 'bg-blue-100 text-blue-800' : category === 'regular-international' ? 'bg-purple-100 text-purple-800' : category === 'exchange' ? 'bg-pink-100 text-pink-800' : 'bg-gray-100 text-gray-800';
  const filteredMembers = members.filter((member) =>
    member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (member.nickname || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (member.furigana || '').includes(searchQuery)
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between"><h1 className="text-gray-900">{t.title}</h1><Badge variant="secondary" className="text-sm">{filteredMembers.length} {language === 'ja' ? '人' : 'members'}</Badge></div>
      <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" /><Input placeholder={t.search} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" /></div>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredMembers.map((member) => (
          <Card key={member.id} className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <Avatar className="w-16 h-16 bg-linear-to-br from-blue-600 to-purple-600"><AvatarFallback className="text-white text-xl">{getAvatar(member.name)}</AvatarFallback></Avatar>
                <div className="flex-1 min-w-0"><h3 className="text-gray-900 truncate">{member.name}</h3><p className="text-gray-600 text-sm">{member.nickname || '-'} ({member.furigana || '-'})</p><Badge className={`mt-2 text-xs ${getCategoryColor(member.category)}`}>{getCategoryLabel(member.category)}</Badge></div>
              </div>
              <div className="mt-4 space-y-2">
                <div className="flex items-start gap-2 text-sm"><Globe2 className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" /><div><span className="text-gray-600">{t.speaks}:</span><span className="text-gray-900 ml-1">{member.languages.join(', ')}</span></div></div>
                <div className="flex items-center gap-2 text-sm"><span className="text-gray-600">{t.from}:</span><span className="text-gray-900">{member.country || member.birthCountry || '-'}</span></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
