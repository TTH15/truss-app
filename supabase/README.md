# Supabase（Truss App）

## `src/app-shell` はまだ必要か？

**はい、現状は必要です。**

- `src/app/page.tsx`・`/login`・`/dashboard`・`/admin`・`/profile` などが **`AppShell` → `LegacyApp`** を描画しています。
- `LegacyApp` が認証フロー・`currentPage` と URL の同期・`DataContext` 配下の画面切り替えを担っているため、**この層を消すには**:
  - 各ルートを App Router の `page.tsx` / `layout.tsx` に分割し、
  - 状態・データ取得をその構成に移す
  という追加移行が必要です。

名前の「legacy」は主に **`components/legacy`**（旧 Vite 由来 UI）の話で、`app-shell` は **Next 側のエントリ兼ルーター橋渡し**として残しています。

---

## マイグレーションの適用方法

### 方法 A: Supabase CLI（推奨）

```bash
# プロジェクトルートで（Supabase にログイン済み・プロジェクト紐付け済みの場合）
supabase db push
# またはローカル
supabase start
supabase db reset
```

初回は `supabase/migrations/20250320120000_truss_initial_schema.sql` が実行されます。

### 方法 B: Dashboard の SQL Editor

1. Supabase Dashboard → **SQL Editor**
2. `supabase/migrations/20250320120000_truss_initial_schema.sql` の内容を **まとめて**実行（新規プロジェクト向け）
3. 続けて **`ADMIN_SETUP.sql`** の手順（ダッシュボードでユーザ作成 → `public.users` への管理者行）は **手動**で実施

> **注意**: 既にテーブル／ENUM があるプロジェクトでは、そのまま流すと失敗します。差分が必要な場合は別マイグレーションに分割してください。

---

## ファイル

| ファイル | 内容 |
|----------|------|
| `migrations/20250320120000_truss_initial_schema.sql` | TrussApp の `PRODUCTION_SETUP.sql` 相当（＋ `is_admin()` エイリアス） |
| `ADMIN_SETUP.sql` | TrussApp の `PRODUCTION_ADMIN_SETUP.sql` 相当（管理者用・手順コメント） |

元ファイル: `TrussApp/supabase/PRODUCTION_SETUP.sql` / `PRODUCTION_ADMIN_SETUP.sql`

---

## アプリ側の環境変数

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

---

## セキュリティ

- 初期 SQL では **RLS が DISABLE** になっています。本番前にポリシー設計と有効化を推奨します。
- `ADMIN_SETUP.sql` に例示メール・パスワードが含まれる場合は、**必ず自分の値に差し替え**てください。
