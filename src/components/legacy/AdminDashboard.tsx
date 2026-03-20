import { useState } from 'react';
import { CheckCircle, Users, Calendar, Mail, MessageSquare, Image } from 'lucide-react';
import { AdminApprovals } from './AdminApprovals';
import { AdminNotifications } from './AdminNotifications';
import { AdminEvents } from './AdminEvents';
import { AdminMembers } from './AdminMembers';
import { AdminBoards } from './AdminBoards';
import { AdminGallery } from './AdminGallery';
import type { User, Language } from '../../domain/types/app';

interface AdminDashboardProps {
  language: Language;
  user: User;
  currentTab?: string;
}
type AdminPage = 'approvals' | 'events' | 'gallery' | 'members' | 'notifications' | 'boards';

const translations = {
  ja: { adminPanel: '運営管理パネル', approvals: '承認待ち', events: 'イベント管理', gallery: 'ギャラリー', members: 'メンバー管理', notifications: '通知管理', boards: '掲示板管理', pendingApprovals: '承認待ち', totalMembers: '総メンバー数', upcomingEvents: '今後のイベント', activeNotifications: 'アクティブ通知' },
  en: { adminPanel: 'Admin Management Panel', approvals: 'Approvals', events: 'Event Management', gallery: 'Gallery', members: 'Member Management', notifications: 'Notifications', boards: 'Board Management', pendingApprovals: 'Pending Approvals', totalMembers: 'Total Members', upcomingEvents: 'Upcoming Events', activeNotifications: 'Active Notifications' }
};

export function AdminDashboard({ language, user, currentTab }: AdminDashboardProps) {
  const [currentPage, setCurrentPage] = useState<AdminPage>((currentTab as AdminPage) || 'approvals');
  const t = translations[language];
  const stats = [
    { label: t.pendingApprovals, value: 3, icon: CheckCircle, color: 'text-orange-600', bg: 'bg-orange-50' },
    { label: t.totalMembers, value: 48, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: t.upcomingEvents, value: 5, icon: Calendar, color: 'text-purple-600', bg: 'bg-purple-50' },
    { label: t.activeNotifications, value: 12, icon: Mail, color: 'text-pink-600', bg: 'bg-pink-50' },
  ];
  const pendingApprovals = 3;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-6"><h1 className="text-gray-900">{t.adminPanel}</h1><div className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs">ADMIN</div></div>
        <div className="grid grid-cols-4 gap-2 md:gap-4 mb-8">
          {stats.map((stat, index) => (
            <div key={index} className={`${stat.bg} rounded-xl p-3 md:p-6 aspect-square flex flex-col items-center justify-center`}>
              <stat.icon className={`w-6 h-6 md:w-8 md:h-8 ${stat.color} mb-2`} />
              <span className={`${stat.color} text-xl md:text-3xl mb-1`}>{stat.value}</span>
              <p className="text-gray-700 text-xs md:text-sm text-center">{stat.label}</p>
            </div>
          ))}
        </div>
        <div className="sticky top-0 z-10 bg-[#F5F1E8] pb-2">
          <div className="flex flex-wrap gap-2 bg-white rounded-lg p-2 border">
            <AdminNavButton icon={<CheckCircle className="w-4 h-4" />} label={t.approvals} active={currentPage === 'approvals'} onClick={() => setCurrentPage('approvals')} hasBadge={pendingApprovals > 0} />
            <AdminNavButton icon={<Calendar className="w-4 h-4" />} label={t.events} active={currentPage === 'events'} onClick={() => setCurrentPage('events')} />
            <AdminNavButton icon={<Image className="w-4 h-4" />} label={t.gallery} active={currentPage === 'gallery'} onClick={() => setCurrentPage('gallery')} />
            <AdminNavButton icon={<MessageSquare className="w-4 h-4" />} label={t.boards} active={currentPage === 'boards'} onClick={() => setCurrentPage('boards')} />
            <AdminNavButton icon={<Users className="w-4 h-4" />} label={t.members} active={currentPage === 'members'} onClick={() => setCurrentPage('members')} />
            <AdminNavButton icon={<Mail className="w-4 h-4" />} label={t.notifications} active={currentPage === 'notifications'} onClick={() => setCurrentPage('notifications')} />
          </div>
        </div>
      </div>
      <div>
        {currentPage === 'approvals' && <AdminApprovals language={language} />}
        {currentPage === 'events' && <AdminEvents language={language} />}
        {currentPage === 'gallery' && <AdminGallery language={language} />}
        {currentPage === 'members' && <AdminMembers language={language} approvedMembers={[]} pendingUsers={[]} />}
        {currentPage === 'notifications' && <AdminNotifications language={language} />}
        {currentPage === 'boards' && <AdminBoards language={language} />}
      </div>
    </div>
  );
}

function AdminNavButton({ icon, label, active, onClick, hasBadge }: { icon: React.ReactNode; label: string; active: boolean; onClick: () => void; hasBadge?: boolean; }) {
  return (
    <button onClick={onClick} className={`relative flex items-center gap-2 px-4 py-2 rounded-md transition-colors whitespace-nowrap ${active ? 'bg-purple-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
      {icon}
      <span className="text-sm">{label}</span>
      {hasBadge && <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white"></span>}
    </button>
  );
}
