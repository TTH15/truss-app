# @platform/supabase-client

Supabase クライアント生成ファクトリのみ(出自: truss-app / app-starter)。

- **アプリが一度だけ生成し、共有ロジックへは注入で渡す**(ADR-0001。複数クライアントによる認証状態の分裂を防ぐ)。
- DB 型はアプリの `Database` 型を generics で注入する: `createSupabaseClient<Database>({...})`。
- `storageKey` は既存セッションと互換のキーをアプリが明示すること(変えると全ユーザーがログアウトされる)。
- `url`/`anonKey` 未指定時は `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` にフォールバック(Expo は環境変数のインライン化の都合上、必ず明示的に渡す)。
