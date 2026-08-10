// =============================================
// Truss App - Auth Context (Supabase)
// =============================================

import { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { supabase } from '@truss/core';
import { getAppOrigin } from '../lib/app-origin';
import { Session, User as SupabaseUser } from '@supabase/supabase-js';
import type { User as AppUser } from '@truss/core';
import { isProfileCompleteForParticipation } from '@truss/core';
import { queryUserByAuthId } from '@truss/core';
import { updateUserProfileRow } from '@truss/core';
import { normalizePhone } from '@truss/core';

interface AuthContextType {
  session: Session | null;
  supabaseUser: SupabaseUser | null;
  user: AppUser | null;
  loading: boolean;
  signInWithGoogle: () => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  updateUser: (updates: Partial<AppUser>) => Promise<{ error: Error | null }>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const USER_CACHE_KEY = 'truss-app-user-cache';
const ADMIN_SESSION_KEY = 'truss-admin-session';

/**
 * プロフィールのローカルキャッシュ。
 * 必ず認証ユーザー(auth.users.id)と紐付けて保存する。紐付けが無いと、同じ端末で
 * 前に使ったアカウントのプロフィール(例: 運営アカウント=isAdmin)を別のアカウントが
 * そのまま拾ってしまい、一般会員の画面から運営画面へ遷移し得る。
 */
type CachedUserEntry = { authId: string; user: AppUser };

const getCachedEntry = (): CachedUserEntry | null => {
  if (typeof window === 'undefined') return null;
  try {
    const cached = localStorage.getItem(USER_CACHE_KEY);
    if (!cached) return null;
    const parsed = JSON.parse(cached) as Partial<CachedUserEntry>;
    // 旧形式(AppUser をそのまま保存)は認証ユーザーと結び付いていないため採用しない
    if (!parsed || typeof parsed.authId !== 'string' || !parsed.user) return null;
    return parsed as CachedUserEntry;
  } catch (_e) {}
  return null;
};

const setCachedUser = (user: AppUser | null, authId?: string | null) => {
  if (typeof window === 'undefined') return;
  try {
    if (user && authId) localStorage.setItem(USER_CACHE_KEY, JSON.stringify({ authId, user }));
    else localStorage.removeItem(USER_CACHE_KEY);
  } catch (_e) {}
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [supabaseUser, setSupabaseUser] = useState<SupabaseUser | null>(null);
  const [user, setUser] = useState<AppUser | null>(() => getCachedEntry()?.user ?? null);
  const [loading, setLoading] = useState(true);
  const userRef = useRef<AppUser | null>(user);
  const authUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  useEffect(() => {
    authUserIdRef.current = supabaseUser?.id ?? null;
  }, [supabaseUser]);

  useEffect(() => {
    let mounted = true;
    const initAuth = async () => {
      const cachedEntry = getCachedEntry();
      const adminSessionRaw = localStorage.getItem(ADMIN_SESSION_KEY);
      if (cachedEntry) setLoading(false);
      try {
        let { data: { session } } = await supabase.auth.getSession();

        // Admin login fallback:
        // If Supabase session is empty but we have locally saved admin tokens,
        // restore once to avoid re-login on reload.
        if (!session && adminSessionRaw) {
          try {
            const parsed = JSON.parse(adminSessionRaw) as { accessToken?: string; refreshToken?: string };
            if (parsed.accessToken && parsed.refreshToken) {
              const restored = await supabase.auth.setSession({
                access_token: parsed.accessToken,
                refresh_token: parsed.refreshToken,
              });
              session = restored.data.session ?? null;
            }
          } catch {
            // ignore broken local data
          }
        }

        if (!mounted) return;
        setSession(session);
        setSupabaseUser(session?.user || null);
        if (session?.user) {
          // 別アカウントのキャッシュを表示したまま進まない
          if (cachedEntry && cachedEntry.authId !== session.user.id) {
            setUser(null);
            setCachedUser(null);
          }
          const appUser = await queryUserByAuthId(session.user.id);
          if (mounted && appUser) {
            setUser(appUser);
            setCachedUser(appUser, session.user.id);
          } else if (mounted && cachedEntry?.authId !== session.user.id) {
            // 取得できず、手元にあるのが別アカウントのキャッシュなら何も表示しない
            setUser(null);
            setCachedUser(null);
          }
        } else {
          setCachedUser(null);
          if (mounted) setUser(null);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    initAuth();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      void (async () => {
        if (!mounted) return;
        if (event === 'INITIAL_SESSION') return;
        const previousAuthUserId = authUserIdRef.current;
        setSession(session);
        setSupabaseUser(session?.user || null);
        if (event === 'TOKEN_REFRESHED') {
          // トークン更新時は既存ユーザー情報を維持し、不要な user クリアを避ける
          setLoading(false);
          return;
        }
        if (session?.user) {
          // タブ復帰時のブラウザ側自動リフレッシュ等で同一ユーザーの SIGNED_IN が再送されることがある。
          // 別ユーザーへの切り替わりではない場合は再フェッチ・ローディング表示をスキップする
          if (session.user.id === previousAuthUserId && userRef.current) {
            setLoading(false);
            return;
          }
          // public.users の取得完了まで loading にしておく（未取得の一瞬で初期登録へ誤遷移しない）
          setLoading(true);
          const appUser = await queryUserByAuthId(session.user.id);
          if (appUser && mounted) {
            setUser(appUser);
            setCachedUser(appUser, session.user.id);
          } else if (mounted && getCachedEntry()?.authId !== session.user.id) {
            setUser(null);
            setCachedUser(null);
          }
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          setCachedUser(null);
          localStorage.removeItem(ADMIN_SESSION_KEY);
        }
        setLoading(false);
      })();
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signInWithGoogle = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${getAppOrigin()}/auth/callback`,
          queryParams: { access_type: 'offline' },
        },
      });
      return { error: error || null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setCachedUser(null);
    localStorage.removeItem(ADMIN_SESSION_KEY);
  };

  const updateUser = async (updates: Partial<AppUser>) => {
    if (!user) return { error: new Error('No user logged in') };
    if (updates.phone) updates = { ...updates, phone: normalizePhone(updates.phone) };
    try {
      const dbUpdates: Record<string, unknown> = {};
      if (updates.name !== undefined) dbUpdates.name = updates.name;
      if (updates.nickname !== undefined) dbUpdates.nickname = updates.nickname;
      if (updates.furigana !== undefined) dbUpdates.furigana = updates.furigana;
      if (updates.birthday !== undefined) dbUpdates.birthday = updates.birthday || null;
      if (updates.languages !== undefined) dbUpdates.languages = updates.languages;
      if (updates.birthCountry !== undefined) dbUpdates.country = updates.birthCountry;
      if (updates.category !== undefined) dbUpdates.category = updates.category;
      if (updates.approved !== undefined) dbUpdates.approved = updates.approved;
      if (updates.avatarPath !== undefined) dbUpdates.avatar_path = updates.avatarPath || null;
      if (updates.studentIdImage !== undefined) dbUpdates.student_id_image = updates.studentIdImage || null;
      if (updates.studentNumber !== undefined) dbUpdates.student_number = updates.studentNumber || null;
      if (updates.grade !== undefined) dbUpdates.grade = updates.grade || null;
      if (updates.gradeConfirmedFor !== undefined) dbUpdates.grade_confirmed_for = updates.gradeConfirmedFor;
      if (updates.major !== undefined) dbUpdates.major = updates.major || null;
      if (updates.phone !== undefined) dbUpdates.phone = updates.phone || null;
      if (updates.organizations !== undefined) dbUpdates.organizations = updates.organizations || null;
      if (updates.registrationStep !== undefined) dbUpdates.registration_step = updates.registrationStep;
      if (updates.emailVerified !== undefined) dbUpdates.email_verified = updates.emailVerified;
      if (updates.initialRegistered !== undefined) dbUpdates.initial_registered = updates.initialRegistered;
      if (updates.feePaid !== undefined) dbUpdates.fee_paid = updates.feePaid;
      if (updates.studentIdReuploadRequested !== undefined) dbUpdates.student_id_reupload_requested = updates.studentIdReuploadRequested;
      if (updates.reuploadReason !== undefined) dbUpdates.reupload_reason = updates.reuploadReason || null;

      const merged: AppUser = { ...user, ...updates };
      const computedComplete = isProfileCompleteForParticipation(merged);
      dbUpdates.profile_completed = computedComplete;

      const { error } = await updateUserProfileRow(user.id, dbUpdates);
      if (error) return { error };
      const updatedUser = { ...merged, profileCompleted: computedComplete };
      setUser(updatedUser);
      setCachedUser(updatedUser, authUserIdRef.current);
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const refreshUser = async () => {
    if (!supabaseUser) return;
    const appUser = await queryUserByAuthId(supabaseUser.id);
    setUser(appUser);
    if (appUser) setCachedUser(appUser, supabaseUser.id);
    else setCachedUser(null);
  };

  const value: AuthContextType = {
    session,
    supabaseUser,
    user,
    loading,
    signInWithGoogle,
    signOut,
    updateUser,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
