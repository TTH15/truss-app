import { useState, useEffect } from 'react';
import { Users, Calendar, FileText, MessageCircle, LogOut, Image } from 'lucide-react';
import { Button } from '../ui/button';
import { AdminMembersManagement } from './AdminMembersManagement';
import { AdminEvents } from './AdminEvents';
import { AdminBoards } from './AdminBoards';
import { AdminChat } from './AdminChat';
import { AdminGallery } from './AdminGallery';
import { ImageWithFallback } from '../figma/ImageWithFallback';
import logoImage from '@/assets/bd10685cae8608f82fd9e782ed0442fecb293fc5.png';
import type { User as UserType, Language, Event, EventParticipant, MessageThread, ChatThreadMetadata, Notification, BoardPost } from '../../domain/types/app';

interface AdminPageProps {
  user: UserType;
  onLogout: () => void;
  language: Language;
  onLanguageChange: (lang: Language) => void;
  events: Event[];
  eventParticipants: { [eventId: number]: EventParticipant[] };
  onCreateEvent: (eventData: Omit<Event, 'id' | 'currentParticipants' | 'likes'>) => void;
  onUpdateEvent: (eventId: number, eventData: Partial<Event>) => void;
  onDeleteEvent: (eventId: number) => void;
  pendingUsers: UserType[];
  approvedMembers: UserType[];
  onApproveUser: (userId: string) => void;
  onRejectUser: (userId: string) => void;
  onRequestReupload: (userId: string, reasons?: string[]) => void;
  onConfirmFeePayment?: (userId: string, isRenewal?: boolean) => void | Promise<void>;
  onSetRenewalStatus?: (userId: string, isRenewal: boolean) => void | Promise<void>;
  onDeleteUser?: (userId: string) => void;
  messageThreads: MessageThread;
  onUpdateMessageThreads: (threads: MessageThread) => void;
  onSendMessage?: (receiverId: string, text: string, isAdmin?: boolean) => Promise<void>;
  chatThreadMetadata: ChatThreadMetadata;
  onUpdateChatThreadMetadata: (metadata: ChatThreadMetadata) => void;
  selectedChatUserId: string | null;
  onOpenMemberChat: (userId: string) => void;
  onUpdateNotifications: (notifications: Notification[]) => void;
  boardPosts: BoardPost[];
  onUpdateBoardPosts: (posts: BoardPost[]) => void;
  onDeleteBoardPost?: (postId: number) => Promise<void>;
  onSendBulkEmail?: (userIds: string[], subjectJa: string, subjectEn: string, messageJa: string, messageEn: string, sendInApp: boolean, sendEmail: boolean) => void;
}

type AdminTab = 'members' | 'events' | 'gallery' | 'boards' | 'chat';

const translations = {
  ja: {
    appName: 'Truss',
    members: 'メンバー',
    events: 'イベント',
    gallery: 'ギャラリー',
    boards: '掲示板',
    chat: 'チャット',
    logout: 'ログアウト',
    adminPanel: '運営管理画面',
  },
  en: {
    appName: 'Truss',
    members: 'Members',
    events: 'Events',
    gallery: 'Gallery',
    boards: 'Boards',
    chat: 'Chat',
    logout: 'Logout',
    adminPanel: 'Admin Panel',
  }
};

export function AdminPage({ user, onLogout, language, onLanguageChange, events, eventParticipants, onCreateEvent, onUpdateEvent, onDeleteEvent, pendingUsers, approvedMembers, onApproveUser, onRejectUser, onRequestReupload, onConfirmFeePayment, onSetRenewalStatus, onDeleteUser, messageThreads, onUpdateMessageThreads, onSendMessage, chatThreadMetadata, onUpdateChatThreadMetadata, selectedChatUserId, onOpenMemberChat, onUpdateNotifications, boardPosts, onUpdateBoardPosts, onDeleteBoardPost, onSendBulkEmail }: AdminPageProps) {
  const t = translations[language];
  const [currentTab, setCurrentTab] = useState<AdminTab>('members');

  useEffect(() => {
    if (selectedChatUserId) {
      setCurrentTab('chat');
    }
  }, [selectedChatUserId]);

  const totalUnreadCount = Object.keys(messageThreads).reduce((total, userId) => {
    const messages = messageThreads[userId] || [];
    const unreadCount = messages.filter((m) => !m.isAdmin && !m.read).length;
    return total + unreadCount;
  }, 0);

  return (
    <div className="min-h-screen bg-[#F5F1E8]">
      <header className="bg-[#3D3D4E] text-white sticky top-0 z-50 shadow-lg">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col gap-3">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <ImageWithFallback src={logoImage} alt="Logo" className="w-8 h-8 object-contain" />
                <div>
                  <span className="text-[#F5F1E8] text-2xl" style={{ fontFamily: "'Island Moments', cursive" }}>{t.appName}</span>
                  <p className="text-xs text-[#B8B8C8]">{t.adminPanel}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Button variant="ghost" onClick={onLogout} className="text-[#F5F1E8] hover:bg-[#2D2D3D]">
                  <LogOut className="w-4 h-4 mr-2" />
                  {t.logout}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="flex min-h-[calc(100vh-80px)]">
        <aside className="w-64 bg-white border-r border-gray-200 hidden lg:block sticky top-[80px] self-start h-[calc(100vh-80px)] overflow-y-auto">
          <nav className="p-4 space-y-2">
            <Button variant={currentTab === 'members' ? 'default' : 'ghost'} className={`w-full justify-start ${currentTab === 'members' ? 'bg-[#3D3D4E] text-white hover:bg-[#2D2D3D] text-white' : ''}`} onClick={() => setCurrentTab('members')}>
              <Users className="w-5 h-5 mr-3" />
              {t.members}
              {pendingUsers.length > 0 && <span className="ml-auto bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">{pendingUsers.length}</span>}
            </Button>
            <Button variant={currentTab === 'events' ? 'default' : 'ghost'} className={`w-full justify-start ${currentTab === 'events' ? 'bg-[#3D3D4E] text-white hover:bg-[#2D2D3D] text-white' : ''}`} onClick={() => setCurrentTab('events')}>
              <Calendar className="w-5 h-5 mr-3" />
              {t.events}
            </Button>
            <Button variant={currentTab === 'gallery' ? 'default' : 'ghost'} className={`w-full justify-start ${currentTab === 'gallery' ? 'bg-[#3D3D4E] text-white hover:bg-[#2D2D3D] text-white' : ''}`} onClick={() => setCurrentTab('gallery')}>
              <Image className="w-5 h-5 mr-3" />
              {t.gallery}
            </Button>
            <Button variant={currentTab === 'boards' ? 'default' : 'ghost'} className={`w-full justify-start ${currentTab === 'boards' ? 'bg-[#3D3D4E] text-white hover:bg-[#2D2D3D] text-white' : ''}`} onClick={() => setCurrentTab('boards')}>
              <FileText className="w-5 h-5 mr-3" />
              {t.boards}
            </Button>
            <Button variant={currentTab === 'chat' ? 'default' : 'ghost'} className={`w-full justify-start ${currentTab === 'chat' ? 'bg-[#3D3D4E] text-white hover:bg-[#2D2D3D] text-white' : ''}`} onClick={() => setCurrentTab('chat')}>
              <MessageCircle className="w-5 h-5 mr-3" />
              {t.chat}
              {totalUnreadCount > 0 && <span className="ml-auto bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">{totalUnreadCount}</span>}
            </Button>
          </nav>
        </aside>

        <main className="flex-1 container mx-auto px-4 py-8 pb-24 lg:pb-8">
          {currentTab === 'members' && <AdminMembersManagement language={language} pendingUsers={pendingUsers} approvedMembers={approvedMembers} onApproveUser={onApproveUser} onRejectUser={onRejectUser} onRequestReupload={onRequestReupload} onOpenChat={onOpenMemberChat} onSendBulkEmail={onSendBulkEmail} onConfirmFeePayment={onConfirmFeePayment} onSetRenewalStatus={onSetRenewalStatus} onDeleteUser={onDeleteUser} />}
          {currentTab === 'events' && <AdminEvents language={language} events={events} eventParticipants={eventParticipants} onCreateEvent={onCreateEvent} onUpdateEvent={onUpdateEvent} onDeleteEvent={onDeleteEvent} onSendBulkEmail={onSendBulkEmail} />}
          {currentTab === 'gallery' && <AdminGallery language={language} />}
          {currentTab === 'boards' && <AdminBoards language={language} boardPosts={boardPosts} onUpdateBoardPosts={onUpdateBoardPosts} onDeleteBoardPost={onDeleteBoardPost} />}
          {currentTab === 'chat' && <AdminChat language={language} messageThreads={messageThreads} onUpdateMessageThreads={onUpdateMessageThreads} onSendMessage={onSendMessage} approvedMembers={approvedMembers} pendingUsers={pendingUsers} chatThreadMetadata={chatThreadMetadata} onUpdateChatThreadMetadata={onUpdateChatThreadMetadata} selectedChatUserId={selectedChatUserId} onOpenMemberChat={onOpenMemberChat} />}
        </main>
      </div>

      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-50 pb-[env(safe-area-inset-bottom)]">
        <div className="flex justify-around items-center h-16 pb-1">
          <button onClick={() => setCurrentTab('members')} className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${currentTab === 'members' ? 'text-[#3D3D4E]' : 'text-[#B8B8C8]'}`}>
            <div className="relative">
              <Users className="w-6 h-6" />
              {pendingUsers.length > 0 && <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">{pendingUsers.length}</span>}
            </div>
            <span className="text-xs mt-1">{t.members}</span>
          </button>
          <button onClick={() => setCurrentTab('events')} className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${currentTab === 'events' ? 'text-[#3D3D4E]' : 'text-[#B8B8C8]'}`}>
            <Calendar className="w-6 h-6" />
            <span className="text-xs mt-1">{t.events}</span>
          </button>
          <button onClick={() => setCurrentTab('gallery')} className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${currentTab === 'gallery' ? 'text-[#3D3D4E]' : 'text-[#B8B8C8]'}`}>
            <Image className="w-6 h-6" />
            <span className="text-xs mt-1">{t.gallery}</span>
          </button>
          <button onClick={() => setCurrentTab('boards')} className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${currentTab === 'boards' ? 'text-[#3D3D4E]' : 'text-[#B8B8C8]'}`}>
            <FileText className="w-6 h-6" />
            <span className="text-xs mt-1">{t.boards}</span>
          </button>
          <button onClick={() => setCurrentTab('chat')} className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${currentTab === 'chat' ? 'text-[#3D3D4E]' : 'text-[#B8B8C8]'}`}>
            <div className="relative">
              <MessageCircle className="w-6 h-6" />
              {totalUnreadCount > 0 && <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">{totalUnreadCount}</span>}
            </div>
            <span className="text-xs mt-1">{t.chat}</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
