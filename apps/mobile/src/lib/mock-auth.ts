// =============================================
// 開発用モックユーザー（__DEV__ 限定、本番ビルドには含まれない）
// =============================================
// Supabaseに繋がずタブ以下の画面を確認するためのダミーデータ。
// AuthContext.signInAsMockUser() からのみ使用する。

import type { Session, User as SupabaseUser } from '@supabase/supabase-js';
import type { User as AppUser } from '@truss/core';

export const MOCK_SUPABASE_USER: SupabaseUser = {
  id: 'mock-supabase-user-id',
  app_metadata: {},
  user_metadata: {},
  aud: 'authenticated',
  created_at: new Date(0).toISOString(),
  email: 'mock@example.com',
};

export const MOCK_SESSION: Session = {
  access_token: 'mock-access-token',
  refresh_token: 'mock-refresh-token',
  expires_in: 3600,
  token_type: 'bearer',
  user: MOCK_SUPABASE_USER,
};

export const MOCK_APP_USER: AppUser = {
  id: 'mock-app-user-id',
  email: 'mock@example.com',
  name: 'モック太郎',
  nickname: 'モック',
  furigana: 'モックタロウ',
  birthday: '2000-01-01',
  languages: ['ja'],
  birthCountry: 'Japan',
  category: 'japanese',
  approved: true,
  isAdmin: false,
  blocked: false,
  registrationStep: 'fully_active',
  emailVerified: true,
  initialRegistered: true,
  profileCompleted: true,
  feePaid: true,
  isRenewal: false,
  studentIdReuploadRequested: false,
  studentNumber: '2030123A',
  grade: '3',
  major: '工学部 電気電子工学科',
  phone: '09012345678',
};
