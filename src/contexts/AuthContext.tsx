// =============================================
// Truss App - Auth Context (Supabase)
// =============================================

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { getAppOrigin } from '../lib/app-origin';
import { Session, User as SupabaseUser } from '@supabase/supabase-js';
import type { User as AppUser, RegistrationStep } from '../domain/types/app';

interface AuthContextType {
  session: Session | null;
  supabaseUser: SupabaseUser | null;
  user: AppUser | null;
  loading: boolean;
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signInWithGoogle: () => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  updateUser: (updates: Partial<AppUser>) => Promise<{ error: Error | null }>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const USER_CACHE_KEY = 'truss-app-user-cache';
const ADMIN_SESSION_KEY = 'truss-admin-session';

const getCachedUser = (): AppUser | null => {
  if (typeof window === 'undefined') return null;
  try {
    const cached = localStorage.getItem(USER_CACHE_KEY);
    if (cached) return JSON.parse(cached);
  } catch (_e) {}
  return null;
};

const setCachedUser = (user: AppUser | null) => {
  if (typeof window === 'undefined') return;
  try {
    if (user) localStorage.setItem(USER_CACHE_KEY, JSON.stringify(user));
    else localStorage.removeItem(USER_CACHE_KEY);
  } catch (_e) {}
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [supabaseUser, setSupabaseUser] = useState<SupabaseUser | null>(null);
  const [user, setUser] = useState<AppUser | null>(() => getCachedUser());
  const [loading, setLoading] = useState(true);

  const fetchAppUser = async (authId: string): Promise<AppUser | null> => {
    try {
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Query timeout after 15s')), 15000);
      });
      const queryPromise = supabase.from('users').select('*').eq('auth_id', authId).maybeSingle();
      const { data, error } = await Promise.race([queryPromise, timeoutPromise]);
      if (error || !data) return null;
      return {
        id: data.id,
        email: data.email,
        name: data.name || '',
        nickname: data.nickname || '',
        furigana: data.furigana || '',
        birthday: data.birthday || '',
        languages: data.languages || [],
        birthCountry: data.country || '',
        category: data.category,
        approved: data.approved,
        isAdmin: data.is_admin,
        studentIdImage: data.student_id_image || undefined,
        studentNumber: data.student_number || undefined,
        grade: data.grade || undefined,
        major: data.major || undefined,
        phone: data.phone || undefined,
        organizations: data.organizations || undefined,
        blocked: data.blocked,
        registrationStep: data.registration_step as RegistrationStep,
        emailVerified: data.email_verified,
        initialRegistered: data.initial_registered,
        profileCompleted: data.profile_completed,
        feePaid: data.fee_paid,
        membershipYear: data.membership_year || undefined,
        isRenewal: data.is_renewal || false,
        studentIdReuploadRequested: data.student_id_reupload_requested,
        reuploadReason: data.reupload_reason || undefined,
        requestedAt: data.requested_at || undefined,
      };
    } catch (_error) {
      return null;
    }
  };

  useEffect(() => {
    let mounted = true;
    const initAuth = async () => {
      const cachedUser = getCachedUser();
      const adminSessionRaw = localStorage.getItem(ADMIN_SESSION_KEY);
      if (cachedUser) setLoading(false);
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
          const appUser = await fetchAppUser(session.user.id);
          if (mounted && appUser) {
            setUser(appUser);
            setCachedUser(appUser);
          } else if (mounted) {
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
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;
      if (event === 'INITIAL_SESSION') return;
      setSession(session);
      setSupabaseUser(session?.user || null);
      if (event === 'TOKEN_REFRESHED') return;
      if (session?.user) {
        const appUser = await fetchAppUser(session.user.id);
        if (appUser && mounted) {
          setUser(appUser);
          setCachedUser(appUser);
        } else if (mounted) {
          setUser(null);
          setCachedUser(null);
        }
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setCachedUser(null);
        localStorage.removeItem(ADMIN_SESSION_KEY);
      }
      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signUp = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: getAppOrigin() },
      });
      return { error: error || null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      return { error: error || null };
    } catch (error) {
      return { error: error as Error };
    }
  };

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
      if (updates.studentIdImage !== undefined) dbUpdates.student_id_image = updates.studentIdImage || null;
      if (updates.studentNumber !== undefined) dbUpdates.student_number = updates.studentNumber || null;
      if (updates.grade !== undefined) dbUpdates.grade = updates.grade || null;
      if (updates.major !== undefined) dbUpdates.major = updates.major || null;
      if (updates.phone !== undefined) dbUpdates.phone = updates.phone || null;
      if (updates.organizations !== undefined) dbUpdates.organizations = updates.organizations || null;
      if (updates.registrationStep !== undefined) dbUpdates.registration_step = updates.registrationStep;
      if (updates.emailVerified !== undefined) dbUpdates.email_verified = updates.emailVerified;
      if (updates.initialRegistered !== undefined) dbUpdates.initial_registered = updates.initialRegistered;
      if (updates.profileCompleted !== undefined) dbUpdates.profile_completed = updates.profileCompleted;
      if (updates.feePaid !== undefined) dbUpdates.fee_paid = updates.feePaid;
      if (updates.studentIdReuploadRequested !== undefined) dbUpdates.student_id_reupload_requested = updates.studentIdReuploadRequested;
      if (updates.reuploadReason !== undefined) dbUpdates.reupload_reason = updates.reuploadReason || null;

      const { error } = await supabase.from('users').update(dbUpdates).eq('id', user.id);
      if (error) return { error };
      const updatedUser = { ...user, ...updates };
      setUser(updatedUser);
      setCachedUser(updatedUser);
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const refreshUser = async () => {
    if (!supabaseUser) return;
    const appUser = await fetchAppUser(supabaseUser.id);
    setUser(appUser);
    if (appUser) setCachedUser(appUser);
    else setCachedUser(null);
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
