# Truss モノレポ

npm workspaces によるモノレポ構成。

- `apps/web` — Next.js製Webアプリ（既存メンバー向けサービス）。Next.jsの破壊的変更に関する注意は [`apps/web/AGENTS.md`](./apps/web/AGENTS.md) を参照。
- `apps/mobile` — Expo製モバイルアプリ（予定、[`docs/tasks.md`](./docs/tasks.md) Phase 3以降）。
- `packages/core` — Web/モバイル共通のドメインロジック・Supabaseクエリ等（予定、Phase 2で `apps/web` から抽出）。
- `supabase/` — DBマイグレーション・運用SQL。全アプリ共通のためモノレポ直下に配置。
- `docs/` — [`plan.md`](./docs/plan.md)（設計判断）、[`tasks.md`](./docs/tasks.md)（進捗チェックリスト）、[`design-concept.md`](./docs/design-concept.md)（UI/世界観）。

各ワークスペースの `package.json` にある `dev`/`build`/`lint` 等はルートから `npm run <script> --workspace=<name>` で実行するか、ルートの委譲スクリプト（例: `npm run dev` は `web` に委譲）を使う。
