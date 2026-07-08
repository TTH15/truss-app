import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import type { Session, User as SupabaseUser } from '@supabase/supabase-js';
import type { InitialRegistrationPayload, User as AppUser } from '@truss/core';
import { completeInitialRegistrationRow, queryUserByAuthId, uploadStudentIdImage } from '@truss/core';

import { signInWithGoogle as signInWithGoogleRequest } from '@/lib/google-auth';
import { MOCK_APP_USER, MOCK_SESSION } from '@/lib/mock-auth';
import { supabase } from '@/lib/supabase';

interface AuthContextType {
  session: Session | null;
  supabaseUser: SupabaseUser | null;
  user: AppUser | null;
  loading: boolean;
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signInWithGoogle: () => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
  completeInitialRegistration: (
    data: InitialRegistrationPayload,
    studentIdImageBlob?: Blob
  ) => Promise<{ error: Error | null }>;
  /** 開発用: Supabaseに繋がずタブ以下の画面を確認する。__DEV__ でのみ動作 */
  signInAsMockUser: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [supabaseUser, setSupabaseUser] = useState<SupabaseUser | null>(null);
  const [user, setUser] = useState<AppUser | null>(null);
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
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!mounted) return;
        setSession(session);
        setSupabaseUser(session?.user ?? null);
        if (session?.user) {
          const appUser = await queryUserByAuthId(session.user.id);
          if (mounted) setUser(appUser);
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
        setSupabaseUser(session?.user ?? null);
        if (event === 'TOKEN_REFRESHED') {
          setLoading(false);
          return;
        }
        if (session?.user) {
          // 同一ユーザーのセッション再確認（アプリ復帰時など）はローディング表示・再フェッチをスキップ
          if (session.user.id === previousAuthUserId && userRef.current) {
            setLoading(false);
            return;
          }
          setLoading(true);
          const appUser = await queryUserByAuthId(session.user.id);
          if (mounted) setUser(appUser);
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
        }
        setLoading(false);
      })();
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signUp = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signUp({ email, password });
      return { error: error ? new Error(error.message) : null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      return { error: error ? new Error(error.message) : null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signInWithGoogle = async () => {
    try {
      return await signInWithGoogleRequest();
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signOut = async () => {
    if (session?.access_token === MOCK_SESSION.access_token) {
      // モックセッションはSupabaseに存在しないため、ローカルの状態だけ落とす
      setSession(null);
      setSupabaseUser(null);
      setUser(null);
      return;
    }
    await supabase.auth.signOut();
    setUser(null);
  };

  const refreshUser = async () => {
    if (!supabaseUser) return;
    const appUser = await queryUserByAuthId(supabaseUser.id);
    setUser(appUser);
  };

  const completeInitialRegistration = async (
    data: InitialRegistrationPayload,
    studentIdImageBlob?: Blob
  ): Promise<{ error: Error | null }> => {
    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      const authUser = authData?.user;
      if (authError || !authUser) {
        return { error: authError ? new Error(authError.message) : new Error('サインインが確認できませんでした') };
      }

      let studentIdImagePath = data.studentIdImage;
      if (studentIdImageBlob) {
        const { path, error: uploadError } = await uploadStudentIdImage(studentIdImageBlob);
        if (uploadError || !path) {
          return { error: uploadError ? new Error(uploadError.message) : new Error('学生証画像のアップロードに失敗しました') };
        }
        studentIdImagePath = path;
      }

      const { error } = await completeInitialRegistrationRow(authUser.id, authUser.email ?? '', {
        ...data,
        studentIdImage: studentIdImagePath,
      });
      if (error) return { error };

      const appUser = await queryUserByAuthId(authUser.id);
      setUser(appUser);
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signInAsMockUser = () => {
    if (!__DEV__) return;
    setSession(MOCK_SESSION);
    setSupabaseUser(MOCK_SESSION.user);
    setUser(MOCK_APP_USER);
    setLoading(false);
  };

  const value: AuthContextType = {
    session,
    supabaseUser,
    user,
    loading,
    signUp,
    signIn,
    signInWithGoogle,
    signOut,
    refreshUser,
    completeInitialRegistration,
    signInAsMockUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
