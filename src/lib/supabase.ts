// =============================================
// Truss App - Supabase Client Configuration
// =============================================

import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/database.types';
import { getAppOrigin } from './app-origin';

// Environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';
const hasSupabaseEnv = Boolean(supabaseUrl && supabaseAnonKey);

// Create Supabase client
// Supabase JS v2.99 の GenericTable 互換性確保のため、database.types.ts 側で Db* Row に index signature を追加
export const supabase = createClient<Database>(
  hasSupabaseEnv ? supabaseUrl : 'http://localhost:54321',
  hasSupabaseEnv ? supabaseAnonKey : 'public-anon-key',
  {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storageKey: 'truss-app-auth',
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    flowType: 'pkce',
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
  }
);

// =============================================
// Auth Helper Functions
// =============================================

export async function signUp(email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${getAppOrigin()}/auth/callback`,
    },
  });
  return { data, error };
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  return { data, error };
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  return { error };
}

export async function getSession() {
  const { data, error } = await supabase.auth.getSession();
  return { session: data.session, error };
}

export async function getCurrentUser() {
  const { data: { user }, error } = await supabase.auth.getUser();
  return { user, error };
}

export async function resetPassword(email: string) {
  const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${getAppOrigin()}/auth/reset-password`,
  });
  return { data, error };
}

export async function updatePassword(newPassword: string) {
  const { data, error } = await supabase.auth.updateUser({
    password: newPassword,
  });
  return { data, error };
}

export async function sendMagicLink(email: string) {
  const { data, error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${getAppOrigin()}/auth/callback`,
    },
  });
  return { data, error };
}

const BUCKETS = {
  STUDENT_ID_IMAGES: 'student-id-images',
  EVENT_IMAGES: 'event-images',
  GALLERY_PHOTOS: 'gallery-photos',
  USER_AVATARS: 'user-avatars',
} as const;

export async function uploadStudentIdImage(userId: string, file: File) {
  const fileExt = file.name.split('.').pop();
  const fileName = `${userId}/student-id.${fileExt}`;

  const { error } = await supabase.storage
    .from(BUCKETS.STUDENT_ID_IMAGES)
    .upload(fileName, file, {
      upsert: true,
    });

  if (error) return { url: null, error };

  const { data: urlData } = await supabase.storage
    .from(BUCKETS.STUDENT_ID_IMAGES)
    .createSignedUrl(fileName, 60 * 60 * 24);

  return { url: urlData?.signedUrl || null, error: null };
}

export async function deleteStudentIdImage(userId: string) {
  const { error } = await supabase.storage
    .from(BUCKETS.STUDENT_ID_IMAGES)
    .remove([`${userId}/student-id.jpg`, `${userId}/student-id.png`, `${userId}/student-id.jpeg`]);
  return { error };
}

export async function uploadEventImage(eventId: number, file: File) {
  const fileExt = file.name.split('.').pop();
  const fileName = `event-${eventId}.${fileExt}`;

  const { error } = await supabase.storage
    .from(BUCKETS.EVENT_IMAGES)
    .upload(fileName, file, {
      upsert: true,
    });

  if (error) return { url: null, error };

  const { data: urlData } = supabase.storage
    .from(BUCKETS.EVENT_IMAGES)
    .getPublicUrl(fileName);

  return { url: urlData.publicUrl, error: null };
}

function inferGalleryImageContentType(file: File): string {
  if (file.type) return file.type;
  const ext = file.name.split('.').pop()?.toLowerCase();
  const byExt: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
    gif: 'image/gif',
    heic: 'image/heic',
    heif: 'image/heif',
  };
  return (ext && byExt[ext]) || 'image/jpeg';
}

export async function uploadGalleryPhoto(userId: string, eventId: number, file: File) {
  const fileExt = file.name.split('.').pop() || 'jpg';
  const timestamp = Date.now();
  const suffix =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10);
  const fileName = `${eventId}/${userId}-${timestamp}-${suffix}.${fileExt}`;

  const { error } = await supabase.storage.from(BUCKETS.GALLERY_PHOTOS).upload(fileName, file, {
    contentType: inferGalleryImageContentType(file),
    upsert: false,
  });

  if (error) return { url: null, error };

  const { data: urlData } = supabase.storage
    .from(BUCKETS.GALLERY_PHOTOS)
    .getPublicUrl(fileName);

  return { url: urlData.publicUrl, error: null };
}

export async function deleteGalleryPhoto(filePath: string) {
  const { error } = await supabase.storage
    .from(BUCKETS.GALLERY_PHOTOS)
    .remove([filePath]);
  return { error };
}

/** クロップ後は JPEG として `avatar.jpg` に保存（パス固定） */
export async function uploadUserAvatar(userId: string, file: File) {
  const fileName = `${userId}/avatar.jpg`;

  const { error } = await supabase.storage.from(BUCKETS.USER_AVATARS).upload(fileName, file, {
    upsert: true,
    contentType: "image/jpeg",
  });

  if (error) return { path: null as string | null, error };

  return { path: fileName, error: null };
}

export async function getAvatarSignedUrl(path: string, expiresIn = 3600) {
  const { data, error } = await supabase.storage
    .from(BUCKETS.USER_AVATARS)
    .createSignedUrl(path, expiresIn);
  return { url: data?.signedUrl ?? null, error };
}

export function subscribeToMessages(
  userId: string,
  callback: (payload: { new: Database['public']['Tables']['messages']['Row'] }) => void
) {
  return supabase
    .channel(`messages:${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `receiver_id=eq.${userId}`,
      },
      callback
    )
    .subscribe();
}

export function subscribeToNotifications(
  userId: string,
  callback: (payload: { new: Database['public']['Tables']['notifications']['Row'] }) => void
) {
  return supabase
    .channel(`notifications:${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`,
      },
      callback
    )
    .subscribe();
}

export function subscribeToEventParticipants(
  eventId: number,
  callback: (payload: {
    eventType: 'INSERT' | 'DELETE';
    new?: Database['public']['Tables']['event_participants']['Row'];
    old?: Database['public']['Tables']['event_participants']['Row'];
  }) => void
) {
  return supabase
    .channel(`event_participants:${eventId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'event_participants',
        filter: `event_id=eq.${eventId}`,
      },
      (payload) => {
        callback({
          eventType: payload.eventType as 'INSERT' | 'DELETE',
          new: payload.new as Database['public']['Tables']['event_participants']['Row'],
          old: payload.old as Database['public']['Tables']['event_participants']['Row'],
        });
      }
    )
    .subscribe();
}

export function unsubscribe(channel: ReturnType<typeof supabase.channel>) {
  supabase.removeChannel(channel);
}

export default supabase;
