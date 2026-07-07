# Truss モバイル対応 実行タスクリスト

詳細な背景・設計判断は [`plan.md`](./plan.md)、UI/世界観は [`design-concept.md`](./design-concept.md) を参照。本ドキュメントは「今何が終わっていて、次に何をやるか」を追うためのチェックリスト。

進捗更新ルール: 着手したら `[ ]` → `[x]`。フェーズの並び順は依存関係の順（Phase 1が終わるまでPhase 2以降のコードは書かない）。

---

## 現在の状態（2026-07-07、新セッション引き継ぎ用）

- リポジトリを `~/Developer/truss-app` へ移行済み（旧パス `~/Documents/Kobe-u/Truss/truss-app` からの移行経緯は git履歴・過去セッション参照）。
- **Phase 1（モノレポ化）着手・大部分完了**:
  - `git mv` で `src/`, `public/`, `next.config.ts`, `package.json`, `tsconfig.json`, `postcss.config.mjs`, `eslint.config.mjs`, `scripts/`, `README.md` を `apps/web/` へ移動済み（`.env.local` は未追跡のため通常`mv`）。
  - ルートに workspaces 用 `package.json`（`"workspaces": ["apps/*", "packages/*"]`）を新設。`package-lock.json` はルート単一ファイルとして再生成。
  - `.gitignore` の `node_modules`/`.next`/`out`/`build` パターンからルート限定の先頭 `/` を除去し、ワークスペース配下にも効くよう修正。
  - ルート `AGENTS.md` をモノレポ全体向けに書き換え、旧内容は `apps/web/AGENTS.md` に複製。
  - ルートで `npm install` → `apps/web` で `npm run build`/`npm run dev`（HTTP 200）まで動作確認済み。
  - **未実施**: Vercel Project Settings → Root Directoryの`apps/web`変更（ダッシュボード操作が必要、ユーザー側で実施）、本番マージ・デプロイ確認。
  - まだコミットしていない（ユーザーの明示的な指示待ち）。
- **次にやること**: 上記コミット → Vercel Root Directory変更（Preview確認後、本番反映）→ 本番デプロイ確認 → Phase 2（`packages/core`抽出）着手。

---

## 0. 要確認事項（ブロッキング、未回答）

plan.md 6節より。ここが決まらないと着手できない/手戻りが出るタスクに影響。

- [ ] Web版の一般メンバー向け画面（`dashboard`/`LegacyApp`）: モバイル版リリース後も残すか、縮小するか
- [ ] モバイルの配布形態（TestFlight/内部テストのみ先行 or 一般公開までのスコープ）
- [ ] Truss Embassyチャット強化・Connection Bumpの詳細優先度（現在は推奨案を仮決定として記載、着手前に再確認要）
- [ ] Friends判定条件（別日カウント / 別イベントカウント / 回数のみ）
- [ ] 数年後通知の基準日（出会った日 / Friendsになった日 / 両方）

---

## Phase 0: 準備

- [ ] 本計画のレビュー・合意
- [ ] ツール選定の最終決定

## Phase 1: モノレポ化（既存Webアプリの移設のみ、機能変更なし）※最もリスクが高いフェーズ

- [x] `git mv` で `src/`, `public/`, `next.config.ts`, `package.json`, `tsconfig.json`, `postcss.config.mjs`, `eslint.config.mjs`, `.env.local` 等を `apps/web/` へ移動（履歴を保持）(`scripts/`, `README.md` も同様に移動)
- [x] ルートに workspaces 用 `package.json`（`"workspaces": ["apps/*", "packages/*"]`）を新設
- [x] ルート `next-env.d.ts` / `.next` / `tsconfig.tsbuildinfo` が `apps/web/` 側で再生成される前提で `.gitignore` を確認（`/node_modules`等のルート限定パターンを外し、ワークスペース配下にも効くよう修正）
- [x] ローカルで `npm install` → `npm run build` → `npm run dev` が `apps/web` で問題なく通ることを確認
- [ ] Vercel Project Settings → Root Directory を `apps/web` に変更（Preview環境で先に確認してから本番反映）
- [x] `AGENTS.md`（Next.js breaking changes注意書き）を `apps/web/AGENTS.md` に複製、ルートAGENTS.mdはモノレポ全体向けに書き換え
- [ ] 本番マージ・デプロイ確認

## Phase 2: `packages/core` の抽出（importパスのリファクタのみ、動作は変えない）

現状確認済み（2026-07-06）: `page.tsx`は完全に薄いラッパー、`components/legacy/*`もSupabase直接呼び出しゼロでロジック分離は良好。ただし以下の積み残しがあり、`packages/core`へそのまま移すには事前整理が必要。

- [x] **`AuthContext.tsx` の直接Supabase呼び出しを `lib/db/queries|mutations` に切り出す**（`queryUserByAuthId`/`updateUserProfileRow`として抽出、AuthContextからは`supabase.auth.*`のみ残す）
- [x] **未使用の `src/hooks/useSupabase.ts`（1198行）の要否を判断**（全エクスポート・全フックとも参照ゼロ、かつ含まれるApp↔DBマッピングロジックは`lib/db/mutations/events.ts`等に独立して再実装済みと確認。削除済み）
- [x] `lib/db/queries/` の手薄さを解消（`public-reads.ts`を`events.ts`/`events-participation.ts`/`users.ts`/`messages.ts`/`notifications.ts`/`board.ts`/`gallery.ts`にドメイン別分割、`mutations/`と1:1対応する構成に）
- [x] `src/domain/types/app.ts` → ドメイン型を移動（`packages/core/src/types/app.ts`）
- [x] `src/lib/supabase.ts` をファクトリ化し、`storage`（localStorage/AsyncStorage）を呼び出し側から注入可能にする（`createSupabaseClient(overrides)`として`packages/core/src/supabase.ts`に配置。未使用だった`signUp`/`signIn`/`signOut`等12個のdead code関数は削除、実際に使われているStorageヘルパーのみ移動）
- [x] `src/lib/db/queries/*`, `src/lib/db/mutations/*` を移動（`packages/core/src/db/`）
- [x] `src/lib/profile-completion.ts`, `event-icons.ts`, `board-content.ts`, `event-map-link.ts` 等の純粋ロジックを移動
- [x] `database.types.ts`（Supabase生成型）を移動（`RegistrationStep`がドメイン型と名前衝突するため`packages/core/src/index.ts`で明示的に named export）
- [x] `apps/web` からの参照をpackages/core経由に置き換え（`next.config.ts`に`transpilePackages: ["@truss/core"]`追加、`npm run build`/`dev`（HTTP 200）/`lint`で新規エラーなしを確認）
- [ ] 既存テスト（vitest等があれば）が通ることを確認 — 現状テストランナー未導入のため該当なし

## Phase 3: `apps/mobile` の新規作成

- [ ] Expo（最新SDK）+ Expo Router + TypeScript でスキャフォールド
- [ ] `packages/core` を依存に追加、Supabaseクライアントのモバイル版ファクトリを実装
- [ ] メール/パスワード認証を実装
- [ ] Google OAuth を `expo-auth-session` + カスタムスキームdeep linkで実装
- [ ] ログイン〜プロフィール登録の動線を疎通確認
- [ ] Bottom Navigation（Home / Journey / Memories / Connections / Passport）の空実装
- [ ] デザインコンセプトの基本トンマナを適用（クリーム背景、Truss Blue、手書き風フォント）

### 認証移行まわり（Phase 3と並行、一部はWeb版に先行実装可）

- [ ] サインアップ時の大学ドメイン警告（`*.ac.jp`等、ブロックせず警告のみ）— Web版先行実装可
- [ ] サブアカウントのリンク機能（Supabase Authの `linkIdentity`）— Web版先行実装可
- [ ] 運営による手動救済フロー（`auth_id` 付け替え）の運用ドキュメント整備
- [ ] Supabase Dashboard の Redirect URLs にモバイル用カスタムスキームを追加登録
- [ ] 電話番号（SMS OTP）を大学非依存の主認証として追加
- [ ] Passkey（WebAuthn, 現状 `@experimental`）を二段目の鍵として将来導入（優先度低、`@experimental`解除のタイミングを見て判断）

## Phase 4: 機能移植（画面ごと、優先順位は要合意）

- [ ] Passport（プロフィール1ページ目 + スタンプグリッド、1ページ最大10個、写真/メモページ挟み込み）
- [ ] Journey（イベント一覧・詳細・参加）
- [ ] Memories（ギャラリー閲覧・投稿）
- [ ] Connections（出会った人一覧・Friends表示のみ。Connection Bump自体はPhase 5）
- [ ] Truss Embassy（運営とのチャット）— 詳細は次項

### Truss Embassyチャット強化（スキーマ変更のみで本番影響なし、Phase 2前後どちらでも着手可）

- [ ] `messages` に `category` 列追加（`inquiry`/`event_consult`/`membership`/`trouble`）
- [ ] `chat_threads` テーブル新設（user_id, category, status, assigned_admin_id, updated_at）+ `messages.thread_id` 紐付け
- [ ] `read_at` タイムスタンプ追加（双方向既読対応）
- [ ] `chat-attachments` Storage bucket新設 + `messages.attachment_path`
- [ ] Expo Push Notifications + Supabase Edge Function（`messages` insertトリガー）

## Phase 5: BLE基盤機能（Electronic Stamp + Connection Bump）

- [ ] Dev Client / EAS Build への切り替え（Expo Go非対応のため、このフェーズの入り口で実施）
- [ ] Electronic Stamp: BLEでデバイスID受信 → サーバーの device_id×日付範囲→event_id マッピングに問い合わせ → Passportにスタンプ記録
- [ ] Connection Bump: `expo-sensors` Accelerometerでシェイクジェスチャー検知
- [ ] シェイク時のみ短時間BLE advertise/scan、RSSI閾値（目安-50〜-60dBm）+ 時間窓（±1〜2秒）で候補抽出
- [ ] `connection_events` テーブル（`status='pending'`）作成 + 両者へ確認プッシュ通知
- [ ] 両者「はい」で `status='confirmed'`、`occurred_at` 記録。片方拒否/無視で失効
- [ ] 確認プロンプトの自動失効（数時間〜当日中）、同一ユーザー間シェイクのクールダウン実装
- [ ] Friends昇格ロジック（`status='confirmed'`を日付ユニーク化、異なる日3件で `status='friend'`）のトリガー/バッチ
- [ ] 数年後通知バッチ（`first_met_at` 記念日、pg_cron or Edge Function日次実行 + 既存 `notifications`/Expo Push流用）

## Phase 6: リリース準備

- [ ] EAS Build設定
- [ ] App Store / Google Play 提出
- [ ] TestFlight / 内部テストトラック配布
- [ ] クラッシュ計測・アナリティクス方針の検討

## Phase 7: Print & Send（ロードマップ確定、実装はMVP後）

- [ ] PDF生成方式の検討
- [ ] 印刷・配送方式の検討（自前 or 外部印刷サービスAPI）

---

## 横断タスク: 運営からの通知・緊急連絡（モバイル移行を待たず先行実装可）

- [ ] 会員詳細画面に電話番号表示 + コピー機能 + `tel:` リンク（コピーを主、`tel:`はおまけ）
- [ ] `admin_broadcasts.notification_type` に `sms` を追加、外部SMS API（Twilio等）連携
- [ ] 海外番号（留学生等）向けのフォールバック検討（メール強調表示、WhatsApp等）
- [ ] SMS送信コスト管理（緊急連絡限定の運用ルール）

---

## Phase 1実施時の注意点（リスク対策）

- [ ] Vercel Root Directory変更はPreview環境で先に確認、他の変更と混ぜない
- [ ] `git mv` 直後に `npm run build` をローカルで確認してからPR化
- [ ] 新規クエリ追加時もRLSポリシーを正とし、クライアント側チェックだけに頼らない
- [ ] Google OAuthリダイレクト設定はモバイル用スキームを「追加」のみ、既存Web用Redirect URLは変更しない
