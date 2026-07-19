import { createClient, type SupportedStorage } from "@supabase/supabase-js";

export interface SupabaseClientConfig {
  url?: string;
  anonKey?: string;
  storage?: SupportedStorage;
  /** 既存セッションと互換のキーをアプリが明示する(変更すると全ユーザーがログアウトされる) */
  storageKey?: string;
  detectSessionInUrl?: boolean;
  flowType?: "pkce" | "implicit";
  /** realtime のイベント流量上限(既定 10) */
  eventsPerSecond?: number;
}

/**
 * Supabase クライアント生成ファクトリ。アプリ側で一度だけ生成し、
 * 共有ロジックには引数(または live binding の差し替え)で注入する。
 * env 未設定時はローカル開発向けのダミー値で生成し、起動自体は落とさない。
 */
export function createSupabaseClient<Db = any>(config: SupabaseClientConfig = {}) {
  const supabaseUrl = config.url ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const supabaseAnonKey = config.anonKey ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
  const hasSupabaseEnv = Boolean(supabaseUrl && supabaseAnonKey);

  return createClient<Db>(
    hasSupabaseEnv ? supabaseUrl : "http://localhost:54321",
    hasSupabaseEnv ? supabaseAnonKey : "public-anon-key",
    {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: config.detectSessionInUrl ?? true,
        storageKey: config.storageKey ?? "app-auth",
        storage:
          config.storage ?? (typeof window !== "undefined" ? window.localStorage : undefined),
        flowType: config.flowType ?? "pkce",
      },
      realtime: {
        params: {
          eventsPerSecond: config.eventsPerSecond ?? 10,
        },
      },
    }
  );
}
