// =============================================
// Truss App (mobile) - Supabase Client
// =============================================
// packages/core の db/queries・db/mutations は内部で `supabase`（packages/core/src/supabase.ts の
// live binding）を直接参照するため、このファイルを他のどのモジュールより先に評価させ、
// setSupabaseClient() でモバイル向けクライアントに差し替えておく必要がある。
// このモジュールは src/app/_layout.tsx の先頭でimportすること。

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createSupabaseClient, setSupabaseClient } from '@truss/core';

export const supabase = createSupabaseClient({
  url: process.env.EXPO_PUBLIC_SUPABASE_URL,
  anonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  storage: AsyncStorage,
  // モバイルはブラウザのURLからセッションを検出する必要がない（OAuthはカスタムスキームdeep linkで処理）
  detectSessionInUrl: false,
});

setSupabaseClient(supabase);
