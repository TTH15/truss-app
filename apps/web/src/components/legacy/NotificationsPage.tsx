import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { Bell, Calendar, MessageSquare, Users, Image as ImageIcon, Mail, X } from 'lucide-react';
import type { Language, User, Notification } from '../../domain/types/app';

interface NotificationsPageProps {
  language: Language;
  user: User;
  onMessageClick?: (notification: any) => void;
  interestedPosts?: Array<{ postId: number; author: string; authorAvatar: string; title: string }>;
  notifications: Notification[];
  onDismissNotification: (notificationId: string) => void;
  unreadAdminMessagesCount?: number;
  onAdminChatClick?: () => void;
}

const translations = {
  ja: { title: 'お知らせ', noNotifications: 'お知らせはありません', adminChat: '運営', tapToOpenChat: 'タップしてチャットを開く →' },
  en: { title: 'Notifications', noNotifications: 'No notifications', adminChat: 'Admin', tapToOpenChat: 'Tap to open chat →' }
};

export function NotificationsPage({ language, onMessageClick, notifications, onDismissNotification, unreadAdminMessagesCount, onAdminChatClick }: NotificationsPageProps) {
  const t = translations[language];
  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto">
      {onAdminChatClick && (
        <div className="shrink-0">
          <Card className="cursor-pointer hover:shadow-lg transition-all border-2 border-[#49B1E4] bg-linear-to-r from-white to-[#E0F3FB]" onClick={onAdminChatClick}>
            <CardContent className="p-3 sm:p-5">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="shrink-0 w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-linear-to-br from-[#49B1E4] to-[#3A9FD3] flex items-center justify-center shadow-md"><MessageSquare className="w-6 h-6 sm:w-7 sm:h-7 text-white" /></div>
                <div className="flex-1 min-w-0"><p className="font-bold text-base sm:text-lg text-[#3D3D4E] mb-0.5 sm:mb-1">{t.adminChat}</p><p className="text-[#49B1E4] text-xs sm:text-sm font-semibold">{t.tapToOpenChat}</p></div>
                {unreadAdminMessagesCount && unreadAdminMessagesCount > 0 && <div className="shrink-0 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-red-500 flex items-center justify-center shadow-md"><span className="text-white text-xs sm:text-sm font-bold">{unreadAdminMessagesCount}</span></div>}
              </div>
            </CardContent>
          </Card>
          <div className="border-t-2 border-gray-300 my-3 sm:my-4"></div>
        </div>
      )}
      <div className="flex-1 overflow-y-auto">
        <div className="space-y-4 pb-4">
          <h2 className="text-2xl font-bold text-[#3D3D4E] mb-6">{t.title}</h2>
          <div className="space-y-2">
            {notifications.map((notification) => {
              const IconComponent = notification.icon === 'mail' ? Mail : notification.icon === 'calendar' ? Calendar : notification.icon === 'image' ? ImageIcon : Users;
              const title = language === 'ja' ? notification.title : (notification.titleEn || notification.title);
              const description = language === 'ja' ? notification.description : (notification.descriptionEn || notification.description);
              return (
                <Card key={notification.id} className={`group relative hover:shadow-md transition-all ${notification.type === 'message' || notification.linkPage === 'admin-chat' ? 'cursor-pointer hover:border-[#49B1E4]' : ''}`} onClick={() => { if ((notification.type === 'message' || notification.linkPage === 'admin-chat') && onMessageClick) onMessageClick(notification); }}>
                  <CardContent className="p-3 sm:p-4">
                    <div className="flex items-start gap-3 sm:gap-4">
                      <div className="shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-[#49B1E4] flex items-center justify-center"><IconComponent className="w-5 h-5 sm:w-6 sm:h-6 text-white" /></div>
                      <div className="flex-1 min-w-0 overflow-hidden"><div className="flex items-start justify-between gap-2 mb-1"><p className="font-medium text-[#3D3D4E] text-sm sm:text-base truncate">{title}</p><span className="text-[#6B6B7A] text-xs shrink-0 whitespace-nowrap">{notification.time}</span></div><p className="text-[#6B6B7A] text-xs sm:text-sm line-clamp-2">{description}</p></div>
                      <button onClick={(e) => { e.stopPropagation(); onDismissNotification(notification.id); }} className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-200 transition-colors sm:opacity-0 sm:group-hover:opacity-100" aria-label="Close notification"><X className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500" /></button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
          {notifications.length === 0 && <Card><CardContent className="p-12 text-center"><Bell className="w-12 h-12 text-[#6B6B7A] mx-auto mb-4" /><p className="text-[#6B6B7A]">{t.noNotifications}</p></CardContent></Card>}
        </div>
      </div>
    </div>
  );
}
