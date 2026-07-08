import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';

import { supabase } from '@/lib/supabase';

// OAuthのブラウザセッションが正しく閉じられるようにする（Expo公式推奨のセットアップ）
WebBrowser.maybeCompleteAuthSession();

/**
 * カスタムスキームdeep link（truss://auth/callback）でGoogle OAuthを行う。
 * Supabase Dashboard の Authentication > URL Configuration > Redirect URLs に
 * `truss://auth/callback` を追加登録しておく必要がある（Web用のURLは変更しない）。
 */
export async function signInWithGoogle(): Promise<{ error: Error | null }> {
  const redirectTo = AuthSession.makeRedirectUri({ scheme: 'truss', path: 'auth/callback' });

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
      skipBrowserRedirect: true,
    },
  });
  if (error || !data?.url) {
    return { error: error ? new Error(error.message) : new Error('認証URLを取得できませんでした') };
  }

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type !== 'success' || !result.url) {
    return { error: new Error('サインインがキャンセルされました') };
  }

  const code = new URL(result.url).searchParams.get('code');
  if (!code) {
    return { error: new Error('認証コードを取得できませんでした') };
  }

  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
  return { error: exchangeError ? new Error(exchangeError.message) : null };
}
