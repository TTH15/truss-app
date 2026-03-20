import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { LandingPage } from '../components/legacy/LandingPage';
import { AuthSelection } from '../components/legacy/AuthSelection';
import { EmailVerification } from '../components/legacy/EmailVerification';
import { InitialRegistration, InitialRegistrationData } from '@/components/legacy/InitialRegistration';
import { ProfileRegistration } from '../components/legacy/ProfileRegistration';
import { Dashboard } from '../components/legacy/Dashboard';
import { AdminPage } from '../components/legacy/AdminPage';
import { AdminLogin } from '../components/legacy/AdminLogin';
import { WaitingApproval } from '../components/legacy/WaitingApproval';
import { LoginScreen } from '../components/legacy/LoginScreen';
import { AuthCompleteScreen } from '../components/legacy/AuthCompleteScreen';
import { Toaster, toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { supabase } from '../lib/supabase';
import {
  buildInitialRegistrationUserInsert,
  buildInitialRegistrationUserUpdate,
} from '../lib/db/initial-registration';
import '../styles/globals.css';
import type { Event, Language, User } from '../domain/types/app';

const ADMIN_PATH = '/admin-z8x4m2q9r7';

export type {
  Language,
  RegistrationStep,
  User,
  Event,
  EventParticipant,
  Message,
  MessageThread,
  ChatThreadMetadata,
  Notification,
  BoardPost,
  BoardPostReply,
  GalleryPhoto,
} from '../domain/types/app';

type PageState =
  | 'landing'
  | 'auth-selection'
  | 'auth-complete'
  | 'login'
  | 'admin-login'
  | 'email-verification'
  | 'initial-registration'
  | 'profile'
  | 'dashboard'
  | 'admin';

interface AppProps {
  initialPage?: PageState;
  standaloneAdmin?: boolean;
}

function LegacyApp({ initialPage = 'landing', standaloneAdmin = false }: AppProps) {
  const router = useRouter();
  const pathname = usePathname();
  const {
    user: authUser,
    loading: authLoading,
    session,
    signInWithGoogle,
    signOut,
    updateUser: updateAuthUser,
    refreshUser
  } = useAuth();

  const {
    events,
    pendingUsers,
    approvedMembers,
    messageThreads,
    chatThreadMetadata,
    notifications,
    boardPosts,
    eventParticipants,
    loading: dataLoading,
    createEvent,
    updateEvent,
    deleteEvent,
    registerForEvent,
    unregisterFromEvent,
    toggleEventLike,
    approveUser,
    rejectUser,
    requestReupload,
    confirmFeePayment,
    setRenewalStatus,
    deleteUser,
    sendMessage,
    markNotificationAsRead,
    dismissNotification,
    createBoardPost,
    addReply,
    toggleInterest,
    deleteBoardPost,
    setMessageThreads,
    setChatThreadMetadata,
    setNotifications,
    setBoardPosts,
    refreshUsers,
    refreshBoardPosts,
  } = useData();

  const [currentPage, setCurrentPage] = useState<PageState>(
    standaloneAdmin ? 'admin-login' : initialPage
  );
  const [language, setLanguage] = useState<Language>('ja');
  const [user, setUser] = useState<User | null>(null);
  const [tempEmail, setTempEmail] = useState('');
  const [tempInitialData, setTempInitialData] = useState<InitialRegistrationData | null>(null);

  const [attendingEvents, setAttendingEvents] = useState<Set<number>>(new Set());
  const [likedEvents, setLikedEvents] = useState<Set<number>>(new Set());
  const [selectedChatUserId, setSelectedChatUserId] = useState<string | null>(null);
  const [adminActiveTab, setAdminActiveTab] = useState<'members' | 'events' | 'boards' | 'chat'>('members');

  const routeMap: Partial<Record<PageState, string>> = {
    landing: '/',
    login: '/login',
    dashboard: '/dashboard',
    admin: ADMIN_PATH,
    profile: '/profile',
  };

  /** URL → 画面状態（App Router と同期。未割当パスは触れない） */
  const pathToPage: Partial<Record<string, PageState>> = {
    '/': 'landing',
    '/login': 'login',
    '/dashboard': 'dashboard',
    [ADMIN_PATH]: 'admin',
    '/profile': 'profile',
  };

  const navigateTo = (page: PageState) => {
    setCurrentPage(page);
    const nextPath = routeMap[page];
    if (nextPath && pathname !== nextPath) {
      router.push(nextPath);
    }
  };

  /** 認証フロー画面（現状は `/` 上で描画）へ切り替える */
  const showAuthFlowPage = (page: PageState) => {
    setCurrentPage(page);
    // 認証フローは現状 landing(`/`) を土台に表示しているため、URL も合わせる
    if (pathname !== '/') router.push('/');
  };

  /** ブラウザの戻る/進む・直接 URL 入力時に currentPage を合わせる（認証フローの仮画面は `/` で上書きしない） */
  useEffect(() => {
    if (standaloneAdmin) return;
    const next = pathToPage[pathname];
    if (!next || next === currentPage) return;
    const authFlowPages: PageState[] = [
      'email-verification',
      'initial-registration',
      'auth-selection',
      'auth-complete',
    ];
    if (pathname === '/' && authFlowPages.includes(currentPage)) return;
    setCurrentPage(next);
  }, [pathname, currentPage, standaloneAdmin]);

  const isOAuthCallback = () => {
    const hash = window.location.hash;
    const search = window.location.search;
    return hash.includes('access_token') ||
           hash.includes('error') ||
           search.includes('code=') ||
           search.includes('error=');
  };

  useEffect(() => {
    // 管理者専用画面は、ユーザー認証フローと分離しているため
    // ここでは「セッションが復元されている場合は admin に戻す」だけ行う。
    if (standaloneAdmin) {
      const run = async () => {
        if (authLoading) return;

        if (!authUser) {
          setUser(null);
          setCurrentPage('admin-login');
          return;
        }

        try {
          const { data, error } = await supabase
            .from('users')
            .select(
              'id,email,name,nickname,furigana,birthday,languages,country,category,approved,is_admin,registration_step,email_verified,initial_registered,profile_completed,fee_paid'
            )
            .eq('auth_id', authUser.id)
            .single();

          if (error || !data || !data.is_admin) {
            setUser(null);
            setCurrentPage('admin-login');
            return;
          }

          setUser({
            id: data.id,
            email: data.email,
            name: data.name,
            nickname: data.nickname,
            furigana: data.furigana,
            birthday: data.birthday ?? '',
            languages: data.languages ?? [],
            birthCountry: data.country,
            country: data.country,
            category: data.category,
            approved: data.approved,
            isAdmin: data.is_admin,
            registrationStep: data.registration_step,
            emailVerified: data.email_verified,
            initialRegistered: data.initial_registered,
            profileCompleted: data.profile_completed,
            feePaid: data.fee_paid,
          });
          setCurrentPage('admin');
        } catch (e) {
          console.error('Standalone admin session restore failed:', e);
          setUser(null);
          setCurrentPage('admin-login');
        }
      };

      void run();
      return;
    }

    if (authUser) {
      setUser(authUser);
      if (isOAuthCallback()) {
        window.history.replaceState({}, document.title, window.location.pathname);
      }
      if (authUser.isAdmin) {
        navigateTo('admin');
      } else if (!authUser.initialRegistered) {
        setTempEmail(authUser.email);
        showAuthFlowPage('initial-registration');
      } else if (!authUser.approved) {
        navigateTo('dashboard');
      } else if (!authUser.profileCompleted && authUser.category !== 'exchange') {
        navigateTo('dashboard');
      } else {
        navigateTo('dashboard');
      }
    } else if (!authLoading && !session) {
      if (isOAuthCallback()) {
        console.log('🔄 OAuth callback detected, waiting for session...');
        return;
      }
      setUser(null);
      navigateTo('landing');
    }
  }, [authUser, authLoading, session, standaloneAdmin]);

  useEffect(() => {
    if (user && eventParticipants) {
      const attending = new Set<number>();
      Object.entries(eventParticipants).forEach(([eventId, participants]) => {
        if (participants.some(p => p.userId === user.id)) {
          attending.add(parseInt(eventId));
        }
      });
      setAttendingEvents(attending);
    }
  }, [user, eventParticipants]);

  const handleAdminLogin = async (email: string, password: string) => {
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const errorPayload = (await res.json().catch(() => ({}))) as { error?: string };
        alert(
          language === 'ja'
            ? `メールアドレスまたはパスワードが正しくありません${errorPayload.error ? ` (${errorPayload.error})` : ''}`
            : `Invalid email or password${errorPayload.error ? ` (${errorPayload.error})` : ''}`
        );
        return;
      }

      const data = await res.json();
      const { accessToken, refreshToken, user: dbUser } = data as {
        accessToken: string;
        refreshToken: string;
        user: {
          id: string;
          email: string;
          name: string;
          nickname: string;
          furigana: string;
          birthday: string | null;
          languages: string[];
          country: string;
          category: User['category'];
          approved: boolean;
          is_admin: boolean;
          registration_step: User['registrationStep'];
          email_verified: boolean;
          initial_registered: boolean;
          profile_completed: boolean;
          fee_paid: boolean;
        };
      };

      if (!accessToken || !refreshToken) {
        alert(language === 'ja' ? '管理者トークンの取得に失敗しました' : 'Failed to obtain admin token');
        return;
      }

      const { error: sessionError } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
      if (sessionError) {
        // Fallback: sign in directly to ensure a usable client session.
        const { error: fallbackError } = await supabase.auth.signInWithPassword({ email, password });
        if (fallbackError) {
          alert(
            language === 'ja'
              ? `管理者セッションの作成に失敗しました: ${sessionError.message}`
              : `Failed to create admin session: ${sessionError.message}`
          );
          return;
        }
      }

      const adminUser: User = {
        id: dbUser.id,
        email: dbUser.email,
        name: dbUser.name,
        nickname: dbUser.nickname,
        furigana: dbUser.furigana,
        birthday: dbUser.birthday ?? '',
        languages: dbUser.languages ?? [],
        birthCountry: dbUser.country,
        country: dbUser.country,
        category: dbUser.category,
        approved: dbUser.approved,
        isAdmin: dbUser.is_admin,
        registrationStep: dbUser.registration_step,
        emailVerified: dbUser.email_verified,
        initialRegistered: dbUser.initial_registered,
        profileCompleted: dbUser.profile_completed,
        feePaid: dbUser.fee_paid,
      };
      setUser(adminUser);
      navigateTo('admin');
    } catch (error) {
      console.error('Admin login error:', error);
      alert(language === 'ja' ? 'ログインエラーが発生しました' : 'Login error occurred');
    }
  };

  const handleEmailVerified = (email: string) => {
    setTempEmail(email);
    showAuthFlowPage('initial-registration');
  };

  const handleGoogleLogin = async () => {
    toast.loading(language === 'ja' ? 'Googleで認証中...' : 'Authenticating with Google...');
    const { error } = await signInWithGoogle();
    if (error) {
      toast.dismiss();
      toast.error(language === 'ja' ? 'Google認証エラー' : 'Google auth error');
    }
  };

  const handleAuthComplete = () => {
    if (authUser) {
      setUser(authUser);
      if (!authUser.initialRegistered) {
        setTempEmail(authUser.email);
        showAuthFlowPage('initial-registration');
      } else {
        navigateTo('dashboard');
      }
    } else {
      showAuthFlowPage('initial-registration');
    }
  };

  const handleInitialRegistrationComplete = async (data: InitialRegistrationData) => {
    setTempInitialData(data);
    if (user && user.studentIdReuploadRequested) {
      const { error } = await updateAuthUser({
        studentIdImage: data.studentIdImage, studentIdReuploadRequested: false, reuploadReason: undefined,
      });
      if (error) {
        toast.error(language === 'ja' ? 'エラーが発生しました' : 'An error occurred');
        return;
      }
      toast.success(language === 'ja' ? '学生証を再アップロードしました' : 'Student ID re-uploaded successfully');
      navigateTo('dashboard');
      return;
    }
    const now = new Date();
    const requestedAt = now.toISOString().split('T')[0];
    try {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData?.user) {
        toast.error(language === 'ja' ? '認証エラー' : 'Auth error');
        return;
      }
      const { data: existingUser } = await supabase.from('users').select('id').eq('auth_id', authData.user.id).single();
      const email = tempEmail || authData.user.email || '';
      let error;
      if (existingUser) {
        const patch = buildInitialRegistrationUserUpdate(data, requestedAt);
        const result = await supabase.from('users').update(patch).eq('auth_id', authData.user.id);
        error = result.error;
      } else {
        const row = buildInitialRegistrationUserInsert(authData.user.id, email, data, requestedAt);
        const result = await supabase.from('users').insert(row);
        error = result.error;
      }
      if (error) {
        console.error('Error saving user:', error);
        toast.error(language === 'ja' ? 'ユーザー登録エラー' : 'User registration error');
        return;
      }
      await refreshUser();
      await refreshUsers();
      toast.success(language === 'ja' ? '登録申請を送信しました' : 'Registration submitted');
      navigateTo('dashboard');
    } catch (error) {
      console.error('Registration error:', error);
      toast.error(language === 'ja' ? 'エラーが発生しました' : 'An error occurred');
    }
  };

  const handleProfileComplete = async (userData: User) => {
    const { error } = await updateAuthUser({
      ...userData,
      profileCompleted: true,
      registrationStep: userData.category === 'japanese' ? 'fee_payment' : 'fully_active',
    });
    if (error) {
      toast.error(language === 'ja' ? 'プロフィール更新エラー' : 'Profile update error');
      return;
    }
    await refreshUser();
    navigateTo('dashboard');
  };

  const handleOpenProfile = () => navigateTo('profile');
  const handleReopenInitialRegistration = () => {
    if (!user) return;
    setTempEmail(user.email);
    showAuthFlowPage('initial-registration');
  };
  const handleOpenMemberChat = (userId: string) => {
    setSelectedChatUserId(userId);
    setAdminActiveTab('chat');
  };
  const handleLogout = async () => {
    if (standaloneAdmin) {
      await signOut();
      setUser(null);
      setTempEmail('');
      setCurrentPage('admin-login');
      return;
    }
    await signOut();
    setUser(null);
    setTempEmail('');
    navigateTo('landing');
  };
  const handleApproveUser = async (userId: string) => {
    await approveUser(userId);
    await refreshUsers();
    if (user && user.id === userId) await refreshUser();
    toast.success(language === 'ja' ? 'ユーザーを承認しました' : 'User approved');
  };
  const handleRejectUser = async (userId: string) => {
    await rejectUser(userId);
    await refreshUsers();
    toast.success(language === 'ja' ? 'ユーザーを拒否しました' : 'User rejected');
  };

  const handleRequestReupload = async (userId: string, reasons?: string[]) => {
    const reasonLabels = reasons?.map(reason => {
      switch (reason) {
        case 'unclear': return language === 'ja' ? '画像が不鮮明' : 'Image is unclear';
        case 'not-valid': return language === 'ja' ? '本学の学生証ではない' : 'Not a valid student ID from this university';
        case 'mismatch': return language === 'ja' ? '学生証情報と入力情報が異なる' : 'Student ID information does not match the input information';
        default: return reason;
      }
    }) || [];
    const reasonText = reasonLabels.length > 0 ? reasonLabels.join('、') : '';
    await requestReupload(userId, reasonText);
    const messageText = language === 'ja'
      ? `学生証の再アップロードをお願いします。\n\n理由: ${reasonText}`
      : `Please re-upload your student ID card.\n\nReason: ${reasonText}`;
    await sendMessage(userId, messageText, true);
    await refreshUsers();
    toast.success(language === 'ja' ? '学生証の再アップロードを依頼しました' : 'Student ID re-upload requested');
  };

  const handleDismissReuploadNotification = async () => {
    if (!user) return;
    const { error } = await updateAuthUser({ studentIdReuploadRequested: false, reuploadReason: undefined });
    if (error) {
      toast.error(language === 'ja' ? 'エラーが発生しました' : 'An error occurred');
      return;
    }
    await refreshUser();
    toast.success(language === 'ja' ? '通知を閉じました' : 'Notification dismissed');
  };

  const handleDismissNotification = async (notificationId: string) => { await dismissNotification(notificationId); };

  const toggleAttending = async (eventId: number) => {
    if (!user) return;
    const isCurrentlyAttending = attendingEvents.has(eventId);
    if (isCurrentlyAttending) {
      await unregisterFromEvent(eventId);
      setAttendingEvents(prev => { const newSet = new Set(prev); newSet.delete(eventId); return newSet; });
    } else {
      await registerForEvent(eventId);
      setAttendingEvents(prev => { const newSet = new Set(prev); newSet.add(eventId); return newSet; });
    }
  };
  const toggleLike = async (eventId: number) => {
    if (!user) return;
    await toggleEventLike(eventId);
    setLikedEvents(prev => {
      const newSet = new Set(prev);
      if (newSet.has(eventId)) newSet.delete(eventId); else newSet.add(eventId);
      return newSet;
    });
  };
  const handleCreateEvent = async (eventData: Omit<Event, 'id' | 'currentParticipants' | 'likes'>) => { await createEvent(eventData); };
  const handleUpdateEvent = async (eventId: number, eventData: Partial<Event>) => { await updateEvent(eventId, eventData); };
  const handleDeleteEvent = async (eventId: number) => {
    await deleteEvent(eventId);
    setAttendingEvents(prev => { const newSet = new Set(prev); newSet.delete(eventId); return newSet; });
    setLikedEvents(prev => { const newSet = new Set(prev); newSet.delete(eventId); return newSet; });
  };
  const addEventParticipant = async (eventId: number, photoRefusal: boolean = false) => {
    if (!user) return;
    await registerForEvent(eventId, photoRefusal);
  };
  const handleSendBulkEmail = async (userIds: string[], subjectJa: string, subjectEn: string, messageJa: string, messageEn: string, sendInApp: boolean, sendEmail: boolean) => {
    if (sendInApp) {
      for (const userId of userIds) {
        await sendMessage(userId, language === 'ja' ? messageJa : messageEn, true);
      }
    }
    if (sendEmail) console.log('Email sending:', { userIds, subjectJa, subjectEn, messageJa, messageEn });
    const messageType = sendInApp && sendEmail ? (language === 'ja' ? '通知とメール' : 'notification and email')
      : sendInApp ? (language === 'ja' ? '通知' : 'notification')
      : (language === 'ja' ? 'メール' : 'email');
    toast.success(language === 'ja' ? `${userIds.length}人に${messageType}を送信しました` : `Sent ${messageType} to ${userIds.length} members`);
  };

  const isLoadingUser = !standaloneAdmin && (authLoading || (session && !authUser));
  if (isLoadingUser) {
    return (
      <div className="min-h-screen bg-[#F5F1E8] flex items-center justify-center px-6">
        <div className="text-center flex flex-col items-center gap-5">
          <img
            src="/Truss/3.svg"
            alt="Truss"
            className="w-[280px] h-auto animate-pulse"
            draggable={false}
          />
          <p className="text-[#3D3D4E] text-sm">{language === 'ja' ? '読み込み中...' : 'Loading...'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {currentPage === 'landing' && (
        <LoginScreen onLogin={handleGoogleLogin} language={language} onLanguageChange={setLanguage} />
      )}
      {currentPage === 'auth-selection' && (
        <AuthSelection language={language} onLanguageChange={setLanguage} onGoogleAuth={handleGoogleLogin} />
      )}
      {currentPage === 'login' && (
        <LoginScreen onLogin={handleGoogleLogin} onAdminLogin={() => navigateTo('admin-login')} language={language} onLanguageChange={setLanguage} />
      )}
      {currentPage === 'email-verification' && (
        <EmailVerification onVerified={handleEmailVerified} onBack={() => setCurrentPage('auth-selection')} language={language} onLanguageChange={setLanguage} />
      )}
      {currentPage === 'initial-registration' && (
        <InitialRegistration email={tempEmail} onComplete={handleInitialRegistrationComplete} language={language} onLanguageChange={setLanguage} onBack={() => setCurrentPage('landing')} existingUser={user || undefined} />
      )}
      {currentPage === 'profile' && (
        <ProfileRegistration email={tempEmail} onComplete={handleProfileComplete} language={language} onBack={() => navigateTo('dashboard')} existingUser={user || undefined} />
      )}
      {currentPage === 'dashboard' && user && (
        <Dashboard
          user={user} onLogout={handleLogout} language={language} onLanguageChange={setLanguage} events={events}
          attendingEvents={attendingEvents} likedEvents={likedEvents} onToggleAttending={toggleAttending} onToggleLike={toggleLike}
          onAddEventParticipant={addEventParticipant} onOpenProfile={handleOpenProfile} onReopenInitialRegistration={handleReopenInitialRegistration}
          onDismissReuploadNotification={handleDismissReuploadNotification} messageThreads={messageThreads}
          onUpdateMessageThreads={setMessageThreads} onSendMessage={sendMessage} chatThreadMetadata={chatThreadMetadata}
          onUpdateChatThreadMetadata={setChatThreadMetadata} notifications={notifications} onDismissNotification={handleDismissNotification}
          boardPosts={boardPosts} onUpdateBoardPosts={setBoardPosts} onCreateBoardPost={createBoardPost} onAddReply={addReply}
          onToggleInterest={toggleInterest}
        />
      )}
      {currentPage === 'admin' && user && (
        <AdminPage
          user={user} onLogout={handleLogout} language={language} onLanguageChange={setLanguage} events={events}
          eventParticipants={eventParticipants} onCreateEvent={handleCreateEvent} onUpdateEvent={handleUpdateEvent} onDeleteEvent={handleDeleteEvent}
          pendingUsers={pendingUsers} approvedMembers={approvedMembers} onApproveUser={handleApproveUser} onRejectUser={handleRejectUser}
          onRequestReupload={handleRequestReupload} onConfirmFeePayment={confirmFeePayment} onSetRenewalStatus={setRenewalStatus}
          onDeleteUser={deleteUser} messageThreads={messageThreads} onUpdateMessageThreads={setMessageThreads} onSendMessage={sendMessage}
          chatThreadMetadata={chatThreadMetadata} onUpdateChatThreadMetadata={setChatThreadMetadata} selectedChatUserId={selectedChatUserId}
          onOpenMemberChat={handleOpenMemberChat} onUpdateNotifications={setNotifications} boardPosts={boardPosts}
          onUpdateBoardPosts={setBoardPosts} onDeleteBoardPost={deleteBoardPost} onSendBulkEmail={handleSendBulkEmail}
        />
      )}
      {currentPage === 'admin-login' && (
        <AdminLogin onLogin={handleAdminLogin} language={language} onBack={() => (standaloneAdmin ? setCurrentPage('admin-login') : navigateTo('landing'))} />
      )}
      {currentPage === 'auth-complete' && (
        <AuthCompleteScreen onContinue={handleAuthComplete} language={language} onLanguageChange={setLanguage} />
      )}
      <Toaster />
    </div>
  );
}

export default LegacyApp;
