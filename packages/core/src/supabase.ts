// =============================================
// Truss App - Supabase Client Factory
// =============================================

import { createClient, SupportedStorage } from '@supabase/supabase-js';
import type { Database } from './types/database.types';

export interface SupabaseClientOverrides {
  url?: string;
  anonKey?: string;
  storage?: SupportedStorage;
  storageKey?: string;
  detectSessionInUrl?: boolean;
  flowType?: 'pkce' | 'implicit';
}

// Supabase JS v2.99 の GenericTable 互換性確保のため、database.types.ts 側で Db* Row に index signature を追加
export function createSupabaseClient(overrides: SupabaseClientOverrides = {}) {
  const supabaseUrl = overrides.url ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  const supabaseAnonKey = overrides.anonKey ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';
  const hasSupabaseEnv = Boolean(supabaseUrl && supabaseAnonKey);

  return createClient<Database>(
    hasSupabaseEnv ? supabaseUrl : 'http://localhost:54321',
    hasSupabaseEnv ? supabaseAnonKey : 'public-anon-key',
    {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: overrides.detectSessionInUrl ?? true,
        storageKey: overrides.storageKey ?? 'truss-app-auth',
        storage: overrides.storage ?? (typeof window !== 'undefined' ? window.localStorage : undefined),
        flowType: overrides.flowType ?? 'pkce',
      },
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    }
  );
}

export const supabase = createSupabaseClient();

// =============================================
// Storage Helper Functions
// =============================================

const BUCKETS = {
  STUDENT_ID_IMAGES: 'student-id-images',
  EVENT_IMAGES: 'event-images',
  GALLERY_PHOTOS: 'gallery-photos',
  USER_AVATARS: 'user-avatars',
} as const;

/** ログイン中ユーザーの UID（Supabase Auth）配下へ保存。path の先頭は必ず auth.uid()（Storage RLS と一致） */
export async function uploadStudentIdImage(file: File) {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  const authUser = authData?.user;
  if (!authUser) {
    return {
      path: null as string | null,
      error: authError ?? new Error('Not signed in'),
    };
  }

  const fileName = `${authUser.id}/student-id.jpg`;

  const { error } = await supabase.storage
    .from(BUCKETS.STUDENT_ID_IMAGES)
    .upload(fileName, file, {
      upsert: true,
      contentType: 'image/jpeg',
    });

  if (error) return { path: null as string | null, error };
  return { path: fileName, error: null };
}

/** ログイン中ユーザーの学生証オブジェクトをまとめて削除（名前のゆらぎ対応） */
export async function deleteStudentIdImagesForAuthUser(userIdAuth: string) {
  const { error } = await supabase.storage
    .from(BUCKETS.STUDENT_ID_IMAGES)
    .remove([
      `${userIdAuth}/student-id.jpg`,
      `${userIdAuth}/student-id.png`,
      `${userIdAuth}/student-id.jpeg`,
      `${userIdAuth}/student-id.heic`,
      `${userIdAuth}/student-id.heif`,
    ]);
  return { error };
}

export async function deleteStudentIdImageByPath(path: string) {
  const { error } = await supabase.storage.from(BUCKETS.STUDENT_ID_IMAGES).remove([path]);
  return { error };
}

export async function getStudentIdSignedUrl(path: string, expiresIn = 3600) {
  const { data, error } = await supabase.storage
    .from(BUCKETS.STUDENT_ID_IMAGES)
    .createSignedUrl(path, expiresIn);
  return { url: data?.signedUrl ?? null, error };
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

export default supabase;
