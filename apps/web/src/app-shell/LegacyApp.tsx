import { useState, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import dynamic from 'next/dynamic';
import { usePathname, useRouter } from 'next/navigation';
import { InitialRegistration, InitialRegistrationData } from '@/components/legacy/InitialRegistration';
import { ProfileRegistration } from '../components/legacy/ProfileRegistration';
import { Dashboard } from '../components/legacy/Dashboard';
// 運営画面は一般会員には不要なので、開いたときだけ読み込む
const AdminPage = dynamic(
  () => import('../components/legacy/AdminPage').then((m) => m.AdminPage),
  { ssr: false }
);
import { AdminLogin } from '../components/legacy/AdminLogin';
import { LoginScreen } from '../components/legacy/LoginScreen';
import { Toaster, toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { supabase, uploadStudentIdImage, toLocalDateKey } from '@truss/core';
import {
  buildInitialRegistrationUserInsert,
  buildInitialRegistrationUserUpdate,
  queryWithdrawnRecord,
} from '@truss/core';
import { dataUrlToJpegFile } from '../lib/student-id-image';
import { notifyAdminsByPush } from '../lib/web-push';
import '../styles/globals.css';
import type { Event, Language, User } from '@truss/core';

const ADMIN_PATH = '/admin-z8x4m2q9r7';
const ADMIN_SESSION_KEY = 'truss-admin-session';
const SHARED_EVENT_TOKEN_KEY = 'truss-shared-event-token';
const STUDENT_ID_REUPLOAD_AUTOSTART_KEY = 'truss-student-id-reupload-autostart';
const STUDENT_ID_REUPLOAD_FLOW_KEY = 'truss-student-id-reupload-flow';

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
} from '@truss/core';

type PageState =
  | 'landing'
  | 'login'
  | 'admin-login'
  | 'initial-registration'
  | 'profile'
  | 'dashboard'
  | 'admin';

interface AppProps {
  initialPage?: PageState;
  standaloneAdmin?: boolean;
  sharedEventToken?: string;
}

function LegacyApp({ initialPage = 'landing', standaloneAdmin = false, sharedEventToken }: AppProps) {
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
    usersLoading,
    loading: dataLoading,
    createEvent,
    updateEvent,
    deleteEvent,
    registerForEvent,
    unregisterFromEvent,
    toggleEventLike,
    likedEventIds,
    approveUser,
    rejectUser,
    requestReupload,
    confirmFeePayment,
    setRenewalStatus,
    setUserRole,
    deleteUser,
    sendMessage,
    markMemberMessagesAsRead,
    uploadChatAttachment,
    sendBulkMessages,
    cancelBroadcast,
    notifyMembersByPush,
    markNotificationAsRead,
    dismissNotification,
    createBoardPost,
    addReply,
    toggleInterest,
    deleteBoardPost,
    togglePinBoardPost,
    reorderPinnedBoardPosts,
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

  // attendingEvents は eventParticipants から派生。DataContext が register/unregister 後に
  // fetchEventParticipants() を呼ぶ + Supabase realtime で event_participants の変更を購読しているため、
  // ローカルの楽観更新は不要。
  const attendingEvents = useMemo(() => {
    const result = new Set<number>();
    if (!user || !eventParticipants) return result;
    Object.entries(eventParticipants).forEach(([eventId, participants]) => {
      if (participants.some((p) => p.userId === user.id)) {
        result.add(parseInt(eventId));
      }
    });
    return result;
  }, [user, eventParticipants]);
  const [selectedChatUserId, setSelectedChatUserId] = useState<string | null>(null);
  const [adminActiveTab, setAdminActiveTab] = useState<'members' | 'events' | 'boards' | 'chat'>('members');
  // 共有イベントトークンは prop / localStorage の両ソースを束ねた状態。
  // - 初回マウント時は prop 優先、なければ localStorage から復元
  // - prop が後から変わった場合は during-render 比較で追従
  // - clearSharedEventToken() で明示的に null 化できる
  const [activeSharedEventToken, setActiveSharedEventToken] = useState<string | null>(() => {
    if (sharedEventToken) return sharedEventToken;
    if (typeof window === 'undefined') return null;
    try {
      return localStorage.getItem(SHARED_EVENT_TOKEN_KEY);
    } catch {
      return null;
    }
  });
  const [lastSharedEventTokenProp, setLastSharedEventTokenProp] = useState<string | null | undefined>(sharedEventToken);
  if (sharedEventToken && sharedEventToken !== lastSharedEventTokenProp) {
    setLastSharedEventTokenProp(sharedEventToken);
    setActiveSharedEventToken(sharedEventToken);
  }

  const routeMap: Partial<Record<PageState, string>> = {
    landing: '/',
    login: '/login',
    dashboard: '/dashboard',
    admin: ADMIN_PATH,
    profile: '/profile-setup',
  };

  /** URL → 画面状態（App Router と同期。未割当パスは触れない） */
  const pathToPage: Partial<Record<string, PageState>> = {
    '/': 'landing',
    '/login': 'login',
    '/dashboard': 'dashboard',
    [ADMIN_PATH]: 'admin',
    '/profile-setup': 'profile',
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

  // 共有トークンを localStorage に永続化する副作用のみ
  useEffect(() => {
    if (!sharedEventToken) return;
    try {
      localStorage.setItem(SHARED_EVENT_TOKEN_KEY, sharedEventToken);
    } catch {
      // ignore storage errors
    }
  }, [sharedEventToken]);

  const clearSharedEventToken = () => {
    setActiveSharedEventToken(null);
    try {
      localStorage.removeItem(SHARED_EVENT_TOKEN_KEY);
    } catch {
      // ignore storage errors
    }
  };

  // ブラウザの戻る/進む・直接 URL 入力で pathname が変わったら currentPage を追従させる。
  // 認証フローの仮画面は `/` 上で描画する性質があり、pathname 経由で landing に巻き戻したくないので除外。
  // pathname の変化は外部状態（URL）→ React state の同期なので during-render 比較で処理する。
  const [lastSyncedPathname, setLastSyncedPathname] = useState(pathname);
  if (!standaloneAdmin && pathname !== lastSyncedPathname) {
    setLastSyncedPathname(pathname);
    const next = pathToPage[pathname];
    const authFlowPages: PageState[] = ['initial-registration'];
    const reuploadFlowRequested =
      pathname === '/' &&
      typeof window !== 'undefined' &&
      sessionStorage.getItem(STUDENT_ID_REUPLOAD_FLOW_KEY) === '1';
    const blockedByAuthFlow =
      pathname === '/' && (authFlowPages.includes(currentPage) || reuploadFlowRequested);
    if (next && next !== currentPage && !blockedByAuthFlow) {
      setCurrentPage(next);
    }
  }

  const isOAuthCallback = () => {
    const hash = window.location.hash;
    const search = window.location.search;
    return hash.includes('access_token') ||
           hash.includes('error') ||
           search.includes('code=') ||
           search.includes('error=');
  };

  const currentPageRef = useRef(currentPage);
  useEffect(() => {
    currentPageRef.current = currentPage;
  }, [currentPage]);

  useEffect(() => {
    // 管理者専用画面は、ユーザー認証フローと分離しているため
    // ここでは「セッションが復元されている場合は admin に戻す」だけ行う。
    if (standaloneAdmin) {
      const run = async () => {
        if (authLoading) return;

        // セッションはあるが AppUser 復元待ちの短時間ではログアウト画面に落とさない
        if (!authUser && session?.user) return;

        if (!authUser) {
          setUser(null);
          setCurrentPage('admin-login');
          return;
        }

        if (!authUser.isAdmin) {
          setUser(null);
          setCurrentPage('admin-login');
          return;
        }

        // AuthContext が復元した AppUser をそのまま admin として採用する。
        // standaloneAdmin では users.auth_id と users.id の取り違えが起きやすいため、
        // 追加クエリせずに authUser を信頼する。
        setUser(authUser);
        setCurrentPage('admin');
      };

      void run();
      return;
    }

    if (authUser) {
      const reuploadFlowRequested =
        typeof window !== 'undefined' &&
        sessionStorage.getItem(STUDENT_ID_REUPLOAD_FLOW_KEY) === '1';
      if (reuploadFlowRequested) {
        // 認証コンテキスト (authUser) の変化に応じてフロー画面に振り分ける必要があり、
        // event handler 化が難しいので effect 内 setState を許可する
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setTempEmail(authUser.email);
        showAuthFlowPage('initial-registration');
        return;
      }
      setUser(authUser);
      if (isOAuthCallback()) {
        window.history.replaceState({}, document.title, window.location.pathname);
      }
      if (authUser.isAdmin) {
        // ログイン直後（認証フロー系の画面にいるとき）だけ運営画面へ振り分ける。
        // 運営も会員画面（dashboard / profile）を使えるようにするため、
        // すでに実画面を見ている場合はここでは動かさない
        const page = currentPageRef.current;
        const isOnContentPage = page === 'dashboard' || page === 'profile' || page === 'admin';
        if (!isOnContentPage) navigateTo('admin');
      } else if (!authUser.initialRegistered) {
        setTempEmail(authUser.email);
        showAuthFlowPage('initial-registration');
      } else {
        // 承認待ち・プロフィール未完了の案内は Dashboard 内のバナーで行う
        navigateTo('dashboard');
      }
    } else if (!authLoading && !session) {
      if (isOAuthCallback()) {
        console.log('🔄 OAuth callback detected, waiting for session...');
        return;
      }
      setUser(null);
      navigateTo(activeSharedEventToken ? 'login' : 'landing');
    }
  }, [authUser, authLoading, session, standaloneAdmin, activeSharedEventToken]);

  /**
   * Google OAuth 直後など: Supabase セッションはあるが public.users にまだ行がない場合は
   * 初期登録へ（描画前に currentPage を合わせてログイン画面の一瞬表示を防ぐ）
   */
  useLayoutEffect(() => {
    if (standaloneAdmin || authLoading || authUser) return;
    if (!session?.user) return;
    // OAuth 直後の遷移はセッション状態が確定した瞬間に1回だけ走るルーティングで、
    // ユーザー操作起点に変換できないため effect 内 setState を許可する
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setUser(null);
    setTempEmail(session.user.email ?? '');
    setCurrentPage('initial-registration');
    if (pathname !== '/') {
      router.replace('/');
    }
  }, [standaloneAdmin, authLoading, authUser, session?.user?.id, pathname, router]);

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
          avatar_path?: string | null;
        };
      };

      if (!accessToken || !refreshToken) {
        alert(language === 'ja' ? '管理者トークンの取得に失敗しました' : 'Failed to obtain admin token');
        return;
      }

      // リロード時の再ログインを避けるため、管理者トークンを補助保存する
      localStorage.setItem(
        ADMIN_SESSION_KEY,
        JSON.stringify({ accessToken, refreshToken })
      );

      const { error: sessionError } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
      if (sessionError) {
        // Fallback: sign in directly to ensure a usable client session.
        const { error: fallbackError } = await supabase.auth.signInWithPassword({ email, password });
        if (fallbackError) {
          localStorage.removeItem(ADMIN_SESSION_KEY);
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
        avatarPath: dbUser.avatar_path ?? undefined,
      };
      setUser(adminUser);
      navigateTo('admin');
    } catch (error) {
      console.error('Admin login error:', error);
      alert(language === 'ja' ? 'ログインエラーが発生しました' : 'Login error occurred');
    }
  };

  const handleGoogleLogin = async () => {
    toast.loading(language === 'ja' ? 'Googleで認証中...' : 'Authenticating with Google...');
    const { error } = await signInWithGoogle();
    if (error) {
      toast.dismiss();
      toast.error(language === 'ja' ? 'Google認証エラー' : 'Google auth error');
      return;
    }
    // リダイレクトが始まるまでトーストが残らないようにする
    toast.dismiss();
  };

  const handleInitialRegistrationComplete = async (data: InitialRegistrationData) => {
    try {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData?.user) {
        toast.error(`${language === 'ja' ? '認証エラー' : 'Auth error'}（SID-E08）`, { duration: 14000 });
        return;
      }

      let studentIdPath = data.studentIdImage;
      if (studentIdPath.startsWith('data:')) {
        let imageFile: File;
        try {
          imageFile = await dataUrlToJpegFile(studentIdPath);
        } catch (error) {
          console.error('dataUrlToJpegFile failed:', error);
          toast.error(
            `${language === 'ja'
              ? '学生証の写真を読み取れませんでした。ページを開き直して、もう一度写真を選んでください。'
              : "Couldn't read your student ID photo. Reload the page and pick the photo again."}（SID-E09）`,
            { duration: 18000 },
          );
          return;
        }

        const { path: uploadedPath, error: uploadError } = await uploadStudentIdImage(imageFile);
        if (uploadError || !uploadedPath) {
          console.error('uploadStudentIdImage failed:', uploadError);
          toast.error(
            `${language === 'ja'
              ? '学生証の写真をサーバーに送れませんでした。通信状況を確認し、ページを開き直してからもう一度試してください。それでもだめなときは、ログインし直すか運営にお問い合わせください。'
              : 'Could not save your student ID photo. Check your connection, reload the page and try again. If it still fails, sign in again or contact support.'}（SID-E07）`,
            { duration: 18000 },
          );
          return;
        }
        studentIdPath = uploadedPath;
      }

      const payload: InitialRegistrationData = { ...data, studentIdImage: studentIdPath };

      if (user && user.studentIdReuploadRequested) {
        const { error } = await updateAuthUser({
          studentIdImage: payload.studentIdImage,
          studentIdReuploadRequested: false,
          reuploadReason: undefined,
        });
        if (error) {
          toast.error(language === 'ja' ? 'エラーが発生しました' : 'An error occurred');
          return;
        }
        toast.success(language === 'ja' ? '学生証を再アップロードしました' : 'Student ID re-uploaded successfully');
        navigateTo('dashboard');
        return;
      }

      const requestedAt = toLocalDateKey();
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('auth_id', authData.user.id)
        .maybeSingle();
      const email = tempEmail || authData.user.email || '';
      // 退会時に auth_id を切り離すため、作り直しは必ずこの insert を通る。
      // 学籍番号で退会済みの記録を引き当て、会費の状況を引き継ぐ
      // （引き継がないと、未払いのまま退会して作り直せば記録が消えてしまう）
      const withdrawnRecord = existingUser ? null : await queryWithdrawnRecord(payload.studentNumber);
      const { error: saveError } = existingUser
        ? await supabase
            .from('users')
            .update(buildInitialRegistrationUserUpdate(payload, requestedAt))
            .eq('auth_id', authData.user.id)
        : await supabase
            .from('users')
            .insert(buildInitialRegistrationUserInsert(authData.user.id, email, payload, requestedAt, withdrawnRecord));
      if (saveError) {
        console.error('Error saving user:', saveError);
        toast.error(language === 'ja' ? 'ユーザー登録エラー' : 'User registration error');
        return;
      }
      await refreshUser();
      await refreshUsers();
      // 承認待ちが来たことを運営に知らせる（失敗しても申請自体は成功している）
      void (async () => {
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData.session?.access_token;
        if (token) await notifyAdminsByPush(token, { kind: 'new_application', detail: payload.name });
      })();
      toast.success(language === 'ja' ? '登録申請を送信しました' : 'Registration submitted');
      navigateTo('dashboard');
    } catch (error) {
      console.error('Registration error:', error);
      toast.error(`${language === 'ja' ? 'エラーが発生しました' : 'An error occurred'}（SID-E10）`, { duration: 14000 });
    }
  };

  const handleProfileComplete = async (updates: Partial<User>) => {
    // 会費が必要なのは日本人学生のみ（留学生は承認時に feePaid=true になる）。
    // 支払い済みの場合まで fee_payment に巻き戻さない
    const current = user ?? authUser;
    const needsFeePayment = current?.category === 'japanese' && !current?.feePaid;
    const { error } = await updateAuthUser({
      ...updates,
      profileCompleted: true,
      registrationStep: needsFeePayment ? 'fee_payment' : 'fully_active',
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
    const reopenEmail = user?.email || authUser?.email || tempEmail;
    if (reopenEmail) setTempEmail(reopenEmail);
    try {
      sessionStorage.setItem(STUDENT_ID_REUPLOAD_AUTOSTART_KEY, '1');
      sessionStorage.setItem(STUDENT_ID_REUPLOAD_FLOW_KEY, '1');
    } catch {
      // ignore storage errors
    }
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
    // 本人に承認を知らせる（運営名義のアプリ内メッセージ。sendMessage が購読済みならプッシュも送る）。
    // 受信者の言語設定は分からないため日英併記
    const approvalMessage =
      '登録が承認されました。Truss へようこそ！イベントへの参加や会員どうしの交流をお楽しみください。\n\n' +
      'Your registration has been approved. Welcome to Truss! Enjoy joining events and connecting with other members.';
    try {
      await sendMessage(userId, approvalMessage, true);
    } catch (error) {
      console.error('Approval notification failed (approval itself succeeded):', error);
    }
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
    const wasAttending = attendingEvents.has(eventId);
    try {
      if (wasAttending) {
        await unregisterFromEvent(eventId);
        toast.success(language === 'ja' ? '参加を取り消しました' : 'Registration cancelled');
      } else {
        await registerForEvent(eventId);
      }
      // attendingEvents は eventParticipants 派生なので、DataContext の refetch + realtime で自動反映
    } catch {
      toast.error(
        wasAttending
          ? (language === 'ja' ? '参加の取り消しに失敗しました' : 'Failed to cancel registration')
          : (language === 'ja' ? '参加登録に失敗しました' : 'Failed to register')
      );
      throw new Error('toggleAttending failed');
    }
  };
  // ハートの ON/OFF と件数は DataContext 側で即時反映される（DB 由来なのでリロードしても保持される）
  const toggleLike = async (eventId: number) => {
    if (!user) return;
    await toggleEventLike(eventId);
  };
  const handleCreateEvent = async (eventData: Omit<Event, 'id' | 'currentParticipants' | 'likes'>) => { await createEvent(eventData); };
  const handleUpdateEvent = async (eventId: number, eventData: Partial<Event>) => { await updateEvent(eventId, eventData); };
  const handleDeleteEvent = async (eventId: number) => {
    try {
      // attendingEvents / likedEventIds はいずれも DB 由来（event_likes は ON DELETE CASCADE）
      await deleteEvent(eventId);
    } catch (error) {
      console.error('Delete event failed in LegacyApp:', error);
      toast.error(language === 'ja' ? 'イベント削除に失敗しました' : 'Failed to delete event');
      throw error;
    }
  };
  const addEventParticipant = async (eventId: number, photoRefusal: boolean = false) => {
    if (!user) return;
    await registerForEvent(eventId, photoRefusal);
  };
  const handleSendBulkEmail = async (
    userIds: string[],
    subjectJa: string,
    subjectEn: string,
    messageJa: string,
    messageEn: string,
    sendInApp: boolean,
    sendEmail: boolean,
    // イベント参加者への案内は 'event'、それ以外の一斉連絡は 'announcement'。
    // 会員ごとの受信設定（users.notify_*）のどれで絞るかが変わる
    pushCategory: 'event' | 'announcement' = 'announcement',
  ) => {
    try {
      if (sendInApp) {
        for (const userId of userIds) {
          // プッシュはループ内で1人ずつ送らず、最後に全員分を1回にまとめる
          await sendMessage(userId, language === 'ja' ? messageJa : messageEn, true, { suppressPush: true });
        }
        void notifyMembersByPush(userIds, {
          title: subjectJa || subjectEn || '運営からのお知らせ',
          body: messageJa || messageEn,
          tag: pushCategory === 'event' ? 'truss-event' : 'truss-broadcast',
          category: pushCategory,
        });
      }
      // メール送信は未実装。実装するまで「送信した」と表示しない
      if (sendEmail) {
        console.warn('Email sending is not implemented; skipped.', { userIds });
      }
      if (sendInApp) {
        toast.success(
          language === 'ja'
            ? `${userIds.length}人に通知を送信しました`
            : `Sent notification to ${userIds.length} members`
        );
      }
    } catch (error) {
      console.error('Bulk send failed in LegacyApp:', error);
      toast.error(language === 'ja' ? '一斉送信に失敗しました' : 'Failed to send bulk messages');
    }
  };
  const handleSendBulkMessages = async (
    messages: Array<{ receiverId: string; text: string; isAdmin?: boolean; isBroadcast?: boolean; broadcastSubject?: string; broadcastSubjectEn?: string; broadcastId?: number | null }>
  ) => {
    await sendBulkMessages(messages);
  };

  // 管理者画面でもセッション復元が完了するまではローディング表示にする
  // （admin-login の一瞬表示による「自動ログアウトされたように見える」体験を防ぐ）
  const isLoadingUser = authLoading;
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
      {currentPage === 'login' && (
        <LoginScreen onLogin={handleGoogleLogin} onAdminLogin={() => navigateTo('admin-login')} language={language} onLanguageChange={setLanguage} />
      )}
      {currentPage === 'initial-registration' && (
        <InitialRegistration email={tempEmail} onComplete={handleInitialRegistrationComplete} language={language} onLanguageChange={setLanguage} onBack={() => setCurrentPage('landing')} existingUser={user || undefined} />
      )}
      {currentPage === 'profile' && (
        <ProfileRegistration onComplete={handleProfileComplete} language={language} onBack={() => navigateTo('dashboard')} existingUser={user || undefined} />
      )}
      {currentPage === 'dashboard' && user && (
        <Dashboard
          user={user} onLogout={handleLogout} language={language} onLanguageChange={setLanguage} onUpdateProfile={updateAuthUser} events={events}
          attendingEvents={attendingEvents} likedEvents={likedEventIds} onToggleAttending={toggleAttending} onToggleLike={toggleLike}
          onAddEventParticipant={addEventParticipant} onOpenProfile={handleOpenProfile} onOpenAdmin={user.isAdmin ? () => navigateTo('admin') : undefined} onReopenInitialRegistration={handleReopenInitialRegistration}
          onDismissReuploadNotification={handleDismissReuploadNotification} messageThreads={messageThreads}
          onUpdateMessageThreads={setMessageThreads} onSendMessage={sendMessage} chatThreadMetadata={chatThreadMetadata}
          onUpdateChatThreadMetadata={setChatThreadMetadata} notifications={notifications} onDismissNotification={handleDismissNotification}
          boardPosts={boardPosts} onUpdateBoardPosts={setBoardPosts} onCreateBoardPost={createBoardPost} onAddReply={addReply}
          onToggleInterest={toggleInterest} onDeleteBoardPost={deleteBoardPost} approvedMembers={approvedMembers}
          forceOpenEventToken={activeSharedEventToken ?? undefined}
          onForceOpenEventHandled={clearSharedEventToken}
        />
      )}
      {currentPage === 'admin' && user && (
        <AdminPage
          user={user} onLogout={handleLogout} language={language} onLanguageChange={setLanguage} events={events}
          eventParticipants={eventParticipants} onCreateEvent={handleCreateEvent} onUpdateEvent={handleUpdateEvent} onDeleteEvent={handleDeleteEvent}
          pendingUsers={pendingUsers} approvedMembers={approvedMembers} onApproveUser={handleApproveUser} onRejectUser={handleRejectUser}
          membersLoading={usersLoading}
          onRequestReupload={handleRequestReupload} onConfirmFeePayment={confirmFeePayment} onSetRenewalStatus={setRenewalStatus} onSetUserRole={setUserRole}
          onDeleteUser={deleteUser} messageThreads={messageThreads} onUpdateMessageThreads={setMessageThreads} onSendMessage={sendMessage}
          onMarkMemberMessagesAsRead={markMemberMessagesAsRead} onUploadChatAttachment={uploadChatAttachment}
          chatThreadMetadata={chatThreadMetadata} onUpdateChatThreadMetadata={setChatThreadMetadata} selectedChatUserId={selectedChatUserId}
          onOpenMemberChat={handleOpenMemberChat} onUpdateNotifications={setNotifications} boardPosts={boardPosts}
          onUpdateBoardPosts={setBoardPosts} onCreateBoardPost={createBoardPost} onDeleteBoardPost={deleteBoardPost} onTogglePinBoardPost={togglePinBoardPost} onReorderPinnedBoardPosts={reorderPinnedBoardPosts} onSendBulkEmail={handleSendBulkEmail}
          onSendBulkMessages={handleSendBulkMessages} onCancelBroadcast={cancelBroadcast}
          onSwitchToMemberView={() => navigateTo('dashboard')}
        />
      )}
      {currentPage === 'admin-login' && (
        <AdminLogin onLogin={handleAdminLogin} language={language} onBack={() => (standaloneAdmin ? setCurrentPage('admin-login') : navigateTo('landing'))} />
      )}
      <Toaster />
    </div>
  );
}

export default LegacyApp;
