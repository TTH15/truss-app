# Truss モノレポ

npm workspaces によるモノレポ構成。

- `apps/web` — Next.js製Webアプリ（既存メンバー向けサービス）。Next.jsの破壊的変更に関する注意は [`apps/web/AGENTS.md`](./apps/web/AGENTS.md) を参照。
- `apps/mobile` — Expo製モバイルアプリ（予定、[`docs/tasks.md`](./docs/tasks.md) Phase 3以降）。
- `packages/core` — Web/モバイル共通のドメインロジック・Supabaseクエリ等（予定、Phase 2で `apps/web` から抽出）。
- `supabase/` — DBマイグレーション・運用SQL。全アプリ共通のためモノレポ直下に配置。
- `docs/` — [`plan.md`](./docs/plan.md)（設計判断）、[`tasks.md`](./docs/tasks.md)（進捗チェックリスト）、[`design-concept.md`](./docs/design-concept.md)（UI/世界観）、[`mobile-manual-testing.md`](./docs/mobile-manual-testing.md)（モバイル手動E2E確認手順）。

各ワークスペースの `package.json` にある `dev`/`build`/`lint` 等はルートから `npm run <script> --workspace=<name>` で実行するか、ルートの委譲スクリプト（例: `npm run dev` は `web` に委譲）を使う。

## 共有パッケージ @platform/* の規約(ADR-0002)

- `packages/utils` `packages/supabase-client` `packages/ui` は `~/Developer/packages/` からの vendor コピー。**直接編集禁止** — 原本を編集し `~/Developer/scripts/sync-packages.sh projects/truss-app <pkg>` で再配布する(各ディレクトリの `VENDORED.md` 参照)。
- `apps/web/src/components/ui/{utils,button,popover,calendar}.tsx` は `@platform/ui` への再エクスポートシム。実装をシムに書かない。
- **日付選択 UI は必ず `@platform/ui` の `DatePicker` を使う**(Popover + Calendar の手組みを新たに書かない)。実例: `apps/web/src/components/legacy/AdminEvents.tsx` の「日付」欄。
- 新しい汎用 UI プリミティブが必要になったら、まず原本 `~/Developer/packages/ui` に追加 → sync → 画面で import する。
- Supabase の `storageKey: 'truss-app-auth'` は変更禁止(変更 = 全ユーザーがログアウト)。
