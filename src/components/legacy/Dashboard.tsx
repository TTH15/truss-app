import { useEffect, useRef, useState } from 'react';
import { Home, Calendar, Users, Image, Mail, Bell, LogOut, X, Check, Clock, AlertCircle, Upload, FileText, CreditCard, MessageCircle } from 'lucide-react';
import { Button } from '../ui/button';
import { UserAvatarImage } from './UserAvatarImage';
import { Badge } from '../ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { HomePage } from './HomePage';
import { EventsPage } from './EventsPage';
import { MembersPage } from './MembersPage';
import { BulletinBoard } from './BulletinBoard';
import { GalleryPage } from './GalleryPage';
import { ProfilePage } from './ProfilePage';
import { NotificationsPage } from './NotificationsPage';
import { MessagesPage } from './MessagesPage';
import { LimitedAccessBanner } from './LimitedAccessBanner';
import { ImageWithFallback } from '../figma/ImageWithFallback';
import logoImage from '@/assets/bd10685cae8608f82fd9e782ed0442fecb293fc5.png';
import type { User as UserType, Language, Event, MessageThread, ChatThreadMetadata, Notification, BoardPost, BoardPostReply } from '../../domain/types/app';
import { isProfileCompleteForParticipation } from '../../lib/profile-completion';
import { toast } from 'sonner';

type User = UserType;

interface DashboardProps {
  user: User;
  onLogout: () => void;
  language: Language;
  onLanguageChange: (lang: Language) => void;
  events: Event[];
  attendingEvents: Set<number>;
  likedEvents: Set<number>;
  onToggleAttending: (eventId: number) => void;
  onToggleLike: (eventId: number) => void;
  onAddEventParticipant: (eventId: number, photoRefusal: boolean) => void;
  onOpenProfile: () => void;
  onUpdateProfile?: (updates: Partial<User>) => Promise<{ error: Error | null }>;
  onReopenInitialRegistration: () => void;
  onDismissReuploadNotification?: () => void;
  messageThreads: MessageThread;
  onUpdateMessageThreads: (threads: MessageThread) => void;
  onSendMessage?: (receiverId: string, text: string, isAdmin?: boolean) => Promise<void>;
  chatThreadMetadata: ChatThreadMetadata;
  onUpdateChatThreadMetadata: (metadata: ChatThreadMetadata) => void;
  notifications: Notification[];
  onDismissNotification: (notificationId: string) => void;
  boardPosts: BoardPost[];
  onUpdateBoardPosts: (posts: BoardPost[]) => void;
  onCreateBoardPost?: (post: Omit<BoardPost, 'id' | 'replies'>) => Promise<void>;
  onAddReply?: (postId: number, reply: Omit<BoardPostReply, 'id'>) => Promise<void>;
  onToggleInterest?: (postId: number) => Promise<void>;
  onDeleteBoardPost?: (postId: number) => Promise<void>;
  approvedMembers: User[];
  forceOpenEventId?: number;
  forceOpenEventToken?: string;
  onForceOpenEventHandled?: () => void;
}

type Page = 'home' | 'events' | 'members' | 'bulletin' | 'gallery' | 'profile' | 'notifications' | 'messages' | 'message-detail';

interface SelectedNotification {
  senderName: string;
  senderAvatar: string;
  isAdmin: boolean;
}

interface MessageHistory {
  [recipientId: string]: Array<{
    id: number;
    sender: 'user' | 'other';
    text: string;
    time: string;
  }>;
}

const translations = {
  ja: {
    appName: 'Truss',
    home: 'ホーム',
    events: 'イベント',
    members: 'メンバー',
    bulletin: '掲示板',
    boards: '掲示板',
    gallery: 'ギャラリー',
    messages: 'メッセジ',
    logout: 'ログアウト',
  },
  en: {
    appName: 'Truss',
    home: 'Home',
    events: 'Events',
    members: 'Members',
    bulletin: 'Bulletin',
    boards: 'Boards',
    gallery: 'Gallery',
    messages: 'Messages',
    logout: 'Logout',
  }
};

export function Dashboard({
  user,
  onLogout,
  language,
  onLanguageChange,
  events,
  attendingEvents,
  likedEvents,
  onToggleAttending,
  onToggleLike,
  onAddEventParticipant,
  onOpenProfile,
  onUpdateProfile,
  onReopenInitialRegistration,
  onDismissReuploadNotification,
  messageThreads,
  onUpdateMessageThreads,
  chatThreadMetadata,
  onUpdateChatThreadMetadata,
  notifications,
  onDismissNotification,
  boardPosts,
  onUpdateBoardPosts,
  onCreateBoardPost,
  onAddReply,
  onToggleInterest,
  onDeleteBoardPost,
  approvedMembers,
  forceOpenEventId,
  forceOpenEventToken,
  onForceOpenEventHandled,
}: DashboardProps) {
  const DASHBOARD_PAGE_STORAGE_KEY = `truss-dashboard-page-${user.id}`;
  const [currentPage, setCurrentPage] = useState<Page>('home');
  const [selectedMessage, setSelectedMessage] = useState<string | null>(null);
  const [selectedNotification, setSelectedNotification] = useState<SelectedNotification | null>(null);
  const [interestedPosts, setInterestedPosts] = useState<Array<{ postId: number; author: string; authorAvatar: string; title: string }>>([]);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [highlightEventId, setHighlightEventId] = useState<number | undefined>(undefined);
  const [messageHistory, setMessageHistory] = useState<MessageHistory>({});
  const [feePaymentDialogOpen, setFeePaymentDialogOpen] = useState(false);
  const [pendingOpenEventId, setPendingOpenEventId] = useState<number | undefined>(undefined);
  const [uploadingStudentId, setUploadingStudentId] = useState(false);
  const studentIdReuploadInputRef = useRef<HTMLInputElement | null>(null);
  const t = translations[language];
  const profileDone = isProfileCompleteForParticipation(user);

  const readFileAsDataUrl = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => resolve(event.target?.result as string);
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });

  const compressImageDataUrl = (dataUrl: string, maxSide: number = 1600, quality: number = 0.82) =>
    new Promise<string>((resolve, reject) => {
      const img = new window.Image();
      img.onload = () => {
        const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
        const width = Math.max(1, Math.round(img.width * scale));
        const height = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to create canvas context'));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = () => reject(new Error('Failed to decode image'));
      img.src = dataUrl;
    });

  const handleStudentIdReupload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!onUpdateProfile) {
      toast.error(language === 'ja' ? '再アップロード機能を利用できません' : 'Re-upload feature is unavailable');
      e.currentTarget.value = '';
      return;
    }
    if (!file.type.startsWith('image/')) {
      toast.error(language === 'ja' ? '画像ファイルを選択してください' : 'Please select an image file');
      e.currentTarget.value = '';
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error(language === 'ja' ? '画像サイズは10MB以下にしてください' : 'Please keep image size under 10MB');
      e.currentTarget.value = '';
      return;
    }

    setUploadingStudentId(true);
    try {
      const dataUrl = await readFileAsDataUrl(file);
      const normalized = dataUrl.length > 2_000_000 ? await compressImageDataUrl(dataUrl) : dataUrl;
      const { error } = await onUpdateProfile({
        studentIdImage: normalized, // 旧画像はこの更新で置換される
        studentIdReuploadRequested: false,
        reuploadReason: undefined,
      });
      if (error) {
        toast.error(language === 'ja' ? '再アップロードに失敗しました' : 'Failed to re-upload student ID');
        return;
      }
      toast.success(language === 'ja' ? '学生証を再アップロードしました' : 'Student ID re-uploaded successfully');
    } catch {
      toast.error(language === 'ja' ? '画像の読み込みに失敗しました' : 'Failed to process image');
    } finally {
      setUploadingStudentId(false);
      e.currentTarget.value = '';
    }
  };

  useEffect(() => {
    try {
      const saved = localStorage.getItem(DASHBOARD_PAGE_STORAGE_KEY) as Page | null;
      if (!saved) return;
      const validPages: Page[] = ['home', 'events', 'members', 'bulletin', 'gallery', 'profile', 'notifications', 'messages', 'message-detail'];
      if (validPages.includes(saved)) setCurrentPage(saved);
    } catch {
      // ignore storage errors
    }
  }, [DASHBOARD_PAGE_STORAGE_KEY]);

  useEffect(() => {
    try {
      localStorage.setItem(DASHBOARD_PAGE_STORAGE_KEY, currentPage);
    } catch {
      // ignore storage errors
    }
  }, [DASHBOARD_PAGE_STORAGE_KEY, currentPage]);

  const unreadMessageCount = () => {
    const userMessages = messageThreads[user.id] || [];
    return userMessages.filter((msg) => msg.isAdmin && !msg.read).length;
  };

  const handleInterested = (post: { author: string; authorAvatar: string; title: string }) => {
    setInterestedPosts((prev) => [...prev, { postId: Date.now(), ...post }]);
  };

  const handleMessageClick = (notification: any) => {
    if (notification.linkPage === 'admin-chat' || notification.type === 'message') {
      setSelectedNotification({
        senderName: language === 'ja' ? '運営管理者' : 'Admin',
        senderAvatar: 'A',
        isAdmin: true,
      });
      setCurrentPage('messages');
    }
  };

  const handleAdminChatClick = () => {
    setSelectedNotification({
      senderName: language === 'ja' ? '運営管理者' : 'Admin',
      senderAvatar: 'A',
      isAdmin: true,
    });
    setCurrentPage('messages');
  };

  const handleBackFromMessages = () => {
    setSelectedMessage(null);
    setCurrentPage('notifications');
  };

  const handleNavigateToEvent = (eventId: number) => {
    setHighlightEventId(eventId);
    setCurrentPage('events');
    setTimeout(() => setHighlightEventId(undefined), 3000);
  };

  useEffect(() => {
    if (!forceOpenEventId) return;
    setCurrentPage('events');
    setHighlightEventId(forceOpenEventId);
    setPendingOpenEventId(forceOpenEventId);
    setTimeout(() => setHighlightEventId(undefined), 3000);
  }, [forceOpenEventId]);

  useEffect(() => {
    if (!forceOpenEventToken) return;
    const target = events.find((event) => event.shareToken === forceOpenEventToken);
    if (!target) return;
    setCurrentPage('events');
    setHighlightEventId(target.id);
    setPendingOpenEventId(target.id);
    setTimeout(() => setHighlightEventId(undefined), 3000);
    onForceOpenEventHandled?.();
  }, [forceOpenEventToken, events, onForceOpenEventHandled]);

  return (
    <div className="min-h-screen bg-[#F5F1E8]">
      <header className="bg-[#F5F1E8] border-b sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3">
          <div className="flex flex-col gap-3">
            <div className="flex justify-between items-center">
              <button
                type="button"
                onClick={() => setCurrentPage('home')}
                className="flex items-center gap-2 cursor-pointer bg-transparent border-none p-0 hover:opacity-80 transition-opacity"
                title={language === 'ja' ? 'ホームへ' : 'Go to home'}
              >
                <ImageWithFallback
                  src={logoImage}
                  alt="Logo"
                  className="w-8 h-8 object-contain"
                />
                <span className="text-[#3D3D4E] text-2xl" style={{ fontFamily: "'Island Moments', cursive" }}>{t.appName}</span>
              </button>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onLanguageChange(language === 'ja' ? 'en' : 'ja')}
                  className="text-[#3D3D4E] hover:bg-[#E8E4DB]"
                >
                  {language === 'ja' ? 'English' : '日本語'}
                </Button>

                <Popover open={notificationOpen} onOpenChange={setNotificationOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="relative hover:bg-[#E8E4DB] p-2 w-8 h-8 flex items-center justify-center"
                    >
                      <Bell className="w-5 h-5 text-[#3D3D4E]" />
                      {notifications.length > 0 && (
                        <Badge className="absolute top-0 right-0 w-4 h-4 flex items-center justify-center p-0 bg-red-500 text-white text-[10px] border-2 border-[#F5F1E8]">
                          {notifications.length}
                        </Badge>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80 p-0" align="end">
                    <div className="p-4 border-b flex items-center justify-between">
                      <h3 className="font-semibold text-[#3D3D4E]">
                        {language === 'ja' ? '通知' : 'Notifications'}
                      </h3>
                      <button
                        onClick={() => setNotificationOpen(false)}
                        className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-gray-200 transition-colors"
                        aria-label="Close"
                      >
                        <X className="w-4 h-4 text-gray-600" />
                      </button>
                    </div>
                    <div className="max-h-96 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="p-8 text-center text-gray-500">
                          {language === 'ja' ? '通知はありません' : 'No notifications'}
                        </div>
                      ) : (
                        notifications.map((notif) => {
                          const IconComponent = notif.icon === 'mail' ? Mail : notif.icon === 'calendar' ? Calendar : notif.icon === 'image' ? Image : Users;
                          const title = language === 'ja' ? notif.title : (notif.titleEn || notif.title);
                          const description = language === 'ja' ? notif.description : (notif.descriptionEn || notif.description);

                          return (
                            <div key={notif.id} className="relative group border-b last:border-b-0">
                              <button
                                onClick={() => {
                                  if (notif.linkPage) {
                                    if (notif.linkPage === 'messages' || notif.type === 'message') {
                                      setSelectedNotification({
                                        senderName: language === 'ja' ? '運営管理者' : 'Admin',
                                        senderAvatar: 'A',
                                        isAdmin: true,
                                      });
                                      setCurrentPage('messages');
                                    } else {
                                      setCurrentPage(
                                        (notif.linkPage === 'admin-chat' ? 'messages' : notif.linkPage) as Page
                                      );
                                    }
                                    onDismissNotification(notif.id);
                                    setNotificationOpen(false);
                                  }
                                }}
                                className="w-full p-4 pr-12 hover:bg-[#F5F1E8] transition-colors text-left"
                              >
                                <div className="flex items-start gap-3">
                                  <div className="w-10 h-10 rounded-full bg-[#49B1E4] flex items-center justify-center shrink-0">
                                    <IconComponent className="w-5 h-5 text-white" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-[#3D3D4E]">
                                      {title}
                                    </p>
                                    <p className="text-xs text-gray-600 mt-1">
                                      {description}
                                    </p>
                                    <p className="text-xs text-gray-400 mt-1">{notif.time}</p>
                                  </div>
                                </div>
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onDismissNotification(notif.id);
                                }}
                                className="absolute top-3 right-3 w-7 h-7 rounded-full flex items-center justify-center hover:bg-gray-200 transition-colors opacity-0 group-hover:opacity-100"
                                aria-label="Close notification"
                              >
                                <X className="w-4 h-4 text-gray-600" />
                              </button>
                            </div>
                          );
                        })
                      )}
                    </div>
                    <div className="p-3 border-t">
                      <Button
                        onClick={() => {
                          setCurrentPage('notifications');
                          setNotificationOpen(false);
                        }}
                        variant="ghost"
                        className="w-full text-[#49B1E4] hover:bg-[#F5F1E8]"
                      >
                        {language === 'ja' ? 'すべての通知を見る' : 'View All Notifications'}
                      </Button>
                    </div>
                  </PopoverContent>
                </Popover>

                <Popover open={profileOpen} onOpenChange={setProfileOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="rounded-full p-0 hover:bg-[#E8E4DB]"
                    >
                      <UserAvatarImage
                        avatarPath={user.avatarPath}
                        name={user.name}
                        className="h-8 w-8"
                        fallbackClassName="bg-[#3D3D4E] text-white text-sm"
                      />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80 p-0 bg-white border border-[#E5E7EB] shadow-lg" align="end">
                    <ProfilePage
                      language={language}
                      user={user}
                      isCompact={true}
                      isProfileComplete={profileDone}
                      onUpdateProfile={onUpdateProfile}
                    />
                    <div className="p-4 border-t">
                      <Button
                        onClick={() => {
                          setCurrentPage('profile');
                          setProfileOpen(false);
                        }}
                        className="w-full bg-[#49B1E4] hover:bg-[#3A9FD3] mb-2"
                      >
                        {language === 'ja' ? 'プロフィールを見る' : 'View Profile'}
                      </Button>
                      <Button
                        onClick={onLogout}
                        variant="outline"
                        className="w-full"
                      >
                        <LogOut className="w-4 h-4 mr-2" />
                        {t.logout}
                      </Button>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className={`${currentPage === 'messages' ? 'px-0 py-0 pb-0 h-[calc(100vh-4rem)]' : currentPage === 'notifications' ? 'container mx-auto px-4 py-8 pb-32 h-[calc(100vh-4rem-8rem)]' : 'container mx-auto px-4 py-8 pb-32'} min-h-screen`}>
        {user.registrationStep === 'waiting_approval' && currentPage !== 'messages' && (
          <div className="mb-6 space-y-4">
            {user.studentIdReuploadRequested && (
              <div className="border-2 rounded-lg p-5 shadow-md" style={{ backgroundColor: '#E0F3FB', borderColor: '#49B1E4' }}>
                <div className="flex items-start gap-3">
                  <div className="shrink-0 w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#49B1E4' }}>
                    <AlertCircle className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-lg mb-2" style={{ color: '#3D3D4E' }}>
                      {language === 'ja' ? '学生証の再アップロードが必要です' : 'Student ID Re-upload Required'}
                    </h3>
                    {user.reuploadReason && (
                      <div className="mb-3">
                        <p className="text-sm font-medium mb-1" style={{ color: '#3D3D4E' }}>
                          {language === 'ja' ? '理由：' : 'Reason:'}
                        </p>
                        <p className="text-sm bg-white/50 p-2 rounded" style={{ color: '#3D3D4E' }}>
                          {user.reuploadReason}
                        </p>
                      </div>
                    )}
                    <p className="text-sm mb-3" style={{ color: '#3D3D4E' }}>
                      {language === 'ja'
                        ? '運営チームから学生証の再アップロードが依頼されました。以下のボタンから学生証を再度アップロードしてください。'
                        : 'The administration team has requested you to re-upload your student ID. Please re-upload it using the button below.'}
                    </p>
                    <Button
                      onClick={() => studentIdReuploadInputRef.current?.click()}
                      disabled={uploadingStudentId}
                      className="text-white hover:opacity-90"
                      style={{ backgroundColor: '#49B1E4' }}
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      {uploadingStudentId
                        ? (language === 'ja' ? 'アップロード中...' : 'Uploading...')
                        : (language === 'ja' ? '学生証を再アップロード' : 'Re-upload Student ID')}
                    </Button>
                    <input
                      ref={studentIdReuploadInputRef}
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handleStudentIdReupload}
                      className="hidden"
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="bg-white rounded-lg p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex flex-col items-center flex-1">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center mb-2 bg-[#49B1E4] text-white">
                    <Check className="w-5 h-5" />
                  </div>
                  <p className="text-xs text-center font-medium text-green-600">
                    {language === 'ja' ? '認証' : 'Verified'}
                  </p>
                </div>
                <div className="flex-1 h-1 bg-gray-200 mx-2 relative top-[-20px]">
                  <div className="h-full bg-[#49B1E4] transition-all duration-500" style={{ width: '100%' }} />
                </div>
                <div className="flex flex-col items-center flex-1">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center mb-2 bg-[#49B1E4] text-white">
                    <Check className="w-5 h-5" />
                  </div>
                  <p className="text-xs text-center font-medium text-green-600">
                    {language === 'ja' ? '初期登録' : 'Registration'}
                  </p>
                </div>
                <div className="flex-1 h-1 bg-gray-200 mx-2 relative top-[-20px]">
                  <div className="h-full bg-gray-200 transition-all duration-500" style={{ width: '0%' }} />
                </div>
                <div className="flex flex-col items-center flex-1">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center mb-2 bg-[#49B1E4] text-white animate-pulse">
                    <Clock className="w-5 h-5" />
                  </div>
                  <p className="text-xs text-center font-medium text-[#49B1E4]">
                    {language === 'ja' ? '承認待ち' : 'Awaiting Approval'}
                  </p>
                </div>
              </div>
              <p className="text-center text-sm text-gray-600 mt-4">
                {language === 'ja'
                  ? '承認後、メールでお知らせします。'
                  : 'We will notify you by email after approval.'}
              </p>
            </div>
          </div>
        )}

        {user.registrationStep === 'approved_limited' && (!profileDone || !user.feePaid) && (
          <div className="mb-6 bg-linear-to-r from-[#49B1E4] to-[#3A9BD4] rounded-lg p-6 shadow-lg text-white">
            <div className="flex items-start gap-4">
              <div className="flex-1">
                <h3 className="text-2xl font-bold mb-3">
                  {language === 'ja' ? '運営による承認が完了しました。以下のステップを完了してください。' : 'Your registration has been approved. Please complete the following steps.'}
                </h3>
                <div className="space-y-3">
                  <div className={`flex items-center gap-3 p-3 rounded-lg ${profileDone ? 'bg-white/20' : 'bg-white/30'}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${profileDone ? 'bg-green-500' : 'bg-white'}`}>
                      {profileDone ? (
                        <Check className="w-5 h-5 text-white" />
                      ) : (
                        <FileText className="w-5 h-5 text-[#49B1E4]" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">
                        {language === 'ja' ? 'プロフィール登録' : 'Profile Registration'}
                      </p>
                      {!profileDone && (
                        <button
                          onClick={onOpenProfile}
                          className="text-sm underline hover:no-underline mt-1"
                        >
                          {language === 'ja' ? '今すぐ登録 →' : 'Register Now →'}
                        </button>
                      )}
                    </div>
                  </div>

                  {user.category === 'japanese' && (
                    <div className={`flex items-center gap-3 p-3 rounded-lg ${user.feePaid ? 'bg-white/30' : 'bg-yellow-400/90'}`}>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${user.feePaid ? 'bg-green-500' : 'bg-white'}`}>
                        {user.feePaid ? (
                          <Check className="w-5 h-5 text-white" />
                        ) : (
                          <CreditCard className="w-5 h-5 text-[#3D3D4E]" />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className={`font-medium ${user.feePaid ? 'text-white' : 'text-[#3D3D4E]'}`}>
                          {user.isRenewal
                            ? (language === 'ja' ? '継続手続き（年会費）' : 'Renewal (Annual Fee)')
                            : (language === 'ja' ? '入会手続き（入会金＋年会費）' : 'Registration (Entry Fee + Annual Fee)')
                          }
                        </p>
                        {!user.feePaid && (
                          <button
                            onClick={() => setFeePaymentDialogOpen(true)}
                            className="text-sm font-bold text-[#3D3D4E] underline hover:no-underline mt-1"
                          >
                            {language === 'ja' ? '支払い手続きへ →' : 'Proceed to payment →'}
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        <LimitedAccessBanner
          language={language}
          user={user}
          onOpenProfile={onOpenProfile}
        />

        {currentPage === 'home' && <HomePage language={language} user={user} events={events} onNavigateToEvent={handleNavigateToEvent} onOpenProfile={onOpenProfile} onReopenInitialRegistration={onReopenInitialRegistration} onDismissReuploadNotification={onDismissReuploadNotification} onOpenFeePayment={() => setFeePaymentDialogOpen(true)} />}
        {currentPage === 'events' && <EventsPage language={language} events={events} attendingEvents={attendingEvents} likedEvents={likedEvents} onToggleAttending={onToggleAttending} onToggleLike={onToggleLike} highlightEventId={highlightEventId} openEventId={pendingOpenEventId} onOpenEventHandled={() => setPendingOpenEventId(undefined)} onAddEventParticipant={onAddEventParticipant} user={user} />}
        {currentPage === 'members' && <MembersPage language={language} members={approvedMembers.filter((member) => !member.isAdmin)} />}
        {currentPage === 'bulletin' && <BulletinBoard language={language} user={user} onInterested={handleInterested} boardPosts={boardPosts} onUpdateBoardPosts={onUpdateBoardPosts} onCreateBoardPost={onCreateBoardPost} onAddReply={onAddReply} onToggleInterest={onToggleInterest} onDeleteBoardPost={onDeleteBoardPost} />}
        {currentPage === 'gallery' && <GalleryPage language={language} currentUser={user} />}
        {currentPage === 'profile' && (
          <ProfilePage
            language={language}
            user={user}
            isProfileComplete={profileDone}
            onClose={() => setCurrentPage('home')}
            onUpdateProfile={onUpdateProfile}
          />
        )}
        {currentPage === 'notifications' && <NotificationsPage language={language} user={user} onMessageClick={handleMessageClick} interestedPosts={interestedPosts} notifications={notifications} onDismissNotification={onDismissNotification} unreadAdminMessagesCount={unreadMessageCount()} onAdminChatClick={handleAdminChatClick} />}
        {currentPage === 'messages' && selectedNotification && (
          <MessagesPage
            language={language}
            user={user}
            recipientName={selectedNotification.senderName}
            recipientAvatar={selectedNotification.senderAvatar}
            isAdmin={selectedNotification.isAdmin}
            onBack={handleBackFromMessages}
            messageHistory={messageHistory}
            setMessageHistory={setMessageHistory}
            messageThreads={messageThreads}
            onUpdateMessageThreads={onUpdateMessageThreads}
            chatThreadMetadata={chatThreadMetadata}
            onUpdateChatThreadMetadata={onUpdateChatThreadMetadata}
          />
        )}
      </main>

      {currentPage !== 'messages' && (
        <nav className="fixed bottom-0 left-0 right-0 bg-[#F5F1E8] border-t z-50 shadow-lg pb-[env(safe-area-inset-bottom)]">
          <div className="container mx-auto px-4 pb-2">
            <div className="flex justify-around items-end">
              <NavButton
                icon={<Home className="w-5 h-5" />}
                label={t.home}
                active={currentPage === 'home'}
                onClick={() => setCurrentPage('home')}
              />
              <NavButton
                icon={<Calendar className="w-5 h-5" />}
                label={t.events}
                active={currentPage === 'events'}
                onClick={() => setCurrentPage('events')}
              />
              <NavButton
                icon={<Image className="w-5 h-5" />}
                label={t.gallery}
                active={currentPage === 'gallery'}
                onClick={() => setCurrentPage('gallery')}
              />
              <NavButton
                icon={<Users className="w-5 h-5" />}
                label={t.bulletin}
                active={currentPage === 'bulletin'}
                onClick={() => setCurrentPage('bulletin')}
              />
              <NavButton
                icon={<Mail className="w-5 h-5" />}
                label={t.messages}
                active={currentPage === 'notifications'}
                badgeCount={unreadMessageCount()}
                onClick={() => setCurrentPage('notifications')}
              />
            </div>
          </div>
        </nav>
      )}

      <Dialog open={feePaymentDialogOpen} onOpenChange={setFeePaymentDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-[#49B1E4]" />
              {user.isRenewal
                ? (language === 'ja' ? '継続手続き' : 'Membership Renewal')
                : (language === 'ja' ? '入会手続き' : 'Membership Registration')
              }
            </DialogTitle>
            <DialogDescription>
              {language === 'ja'
                ? '以下の手順で会費をお支払いください。'
                : 'Please follow the steps below to pay your membership fee.'
              }
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="bg-[#F5F1E8] p-4 rounded-lg text-center">
              <p className="text-sm text-[#6B6B7A] mb-1">
                {language === 'ja' ? 'お支払い金額' : 'Amount'}
              </p>
              <p className="text-3xl font-bold text-[#3D3D4E]">
                {user.isRenewal ? '¥2,000' : '¥2,500'}
              </p>
              <p className="text-xs text-[#6B6B7A] mt-1">
                {user.isRenewal
                  ? (language === 'ja' ? '年会費のみ（継続会員は入会金不要）' : 'Annual fee only (No entry fee for renewals)')
                  : (language === 'ja' ? '入会金 ¥500 + 年会費 ¥2,000' : 'Entry fee ¥500 + Annual fee ¥2,000')
                }
              </p>
            </div>

            <div className="space-y-3">
              <h4 className="font-medium text-[#3D3D4E]">
                {language === 'ja' ? '支払い方法（銀行振込）' : 'Payment Method (Bank Transfer)'}
              </h4>
              <div className="bg-gray-50 p-3 rounded-lg space-y-2">
                <div className="text-sm text-[#3D3D4E] space-y-1">
                  <p className="font-medium">{language === 'ja' ? '【振込先】' : '【Bank Account】'}</p>
                  <p>{language === 'ja' ? '銀行名：三井住友銀行' : 'Bank: Sumitomo Mitsui Banking Corporation'}</p>
                  <p>{language === 'ja' ? '支店名：六甲支店（421）' : 'Branch: Rokko Branch (421)'}</p>
                  <p>{language === 'ja' ? '口座種別：普通' : 'Account Type: Savings'}</p>
                  <p>{language === 'ja' ? '口座番号：4392061' : 'Account No: 4392061'}</p>
                  <p>{language === 'ja' ? '口座名義：ﾄﾗｽ ﾀﾞｲﾋｮｳｼｬ ｸﾛﾀﾞ ﾁﾊﾙ' : 'Account Name: ﾄﾗｽ ﾀﾞｲﾋｮｳｼｬ ｸﾛﾀﾞ ﾁﾊﾙ'}</p>
                </div>
                <div className="border-t border-gray-200 pt-2 mt-2">
                  <p className="text-xs text-[#6B6B7A]">
                    {language === 'ja'
                      ? '※振込名義は「学籍番号＋フリガナ」でお願いします。振込手数料は各自ご負担ください。'
                      : '※ Please use "Student ID + Furigana" as the transfer name. Please bear the transfer fee yourself.'
                    }
                  </p>
                </div>
                <p className="text-sm text-[#3D3D4E]">
                  {language === 'ja'
                    ? '振込確認後、機能制限が解除されます。'
                    : 'After payment confirmation, restrictions will be lifted.'
                  }
                </p>
              </div>
            </div>

            <Button
              className="w-full bg-[#49B1E4] hover:bg-[#3A9BD4] text-white"
              onClick={() => {
                setFeePaymentDialogOpen(false);
                setCurrentPage('notifications');
              }}
            >
              <MessageCircle className="w-4 h-4 mr-2" />
              {language === 'ja' ? '運営にメッセージを送る' : 'Message Staff'}
            </Button>

            <Button
              variant="outline"
              className="w-full"
              onClick={() => setFeePaymentDialogOpen(false)}
            >
              {language === 'ja' ? '閉じる' : 'Close'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function NavButton({
  icon,
  label,
  active,
  onClick,
  badgeCount
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
  badgeCount?: number;
}) {
  return (
    <button
      onClick={onClick}
      className={`relative flex flex-col items-center justify-center py-3 px-4 transition-all duration-300 group ${active
        ? 'text-[#3D3D4E]'
        : 'text-[#6B6B7A] hover:text-[#3D3D4E]'
        }`}
    >
      <div className={`
        transition-all duration-300 ease-out
        flex items-center justify-center relative
        ${active
          ? 'bg-[#3D3D4E] text-white rounded-full w-14 h-14 -translate-y-4 shadow-xl'
          : 'group-hover:bg-[#E8E4DB] group-hover:rounded-full group-hover:w-12 group-hover:h-12 group-hover:-translate-y-2 group-hover:shadow-lg w-10 h-10'
        }
      `}>
        {icon}
        {badgeCount !== undefined && badgeCount > 0 && (
          <div className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1.5 rounded-full bg-red-500 border-2 border-[#F5F1E8] flex items-center justify-center">
            <span className="text-white text-xs font-medium">{badgeCount}</span>
          </div>
        )}
      </div>
    </button>
  );
}
