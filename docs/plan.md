# Truss モバイル対応 移行計画

デザインコンセプトは [`design-concept.md`](./design-concept.md) を参照。本ドキュメントは「本番運用中のNext.jsアプリを壊さずに、モノレポ + React Native (Expo) 構成へ作り変える」ための技術計画。

## 0. 前提・ゴール

- **運営（Admin）画面**: 現行どおり Next.js のまま。`src/app/admin-z8x4m2q9r7` を中心に、Vercel でホストし続ける。
- **一般メンバー向けアプリ**: React Native (Expo) でネイティブアプリ化する。デザインコンセプト（Passport / Journey / Connections / Memories / Bottom Nav 5タブ）はネイティブ側で新規実装する。
- **本番を壊さない**: 現在 `trussapp-alpha.vercel.app` で稼働中。移行の各フェーズはデプロイ可能な状態を維持し、ロールバック可能な単位でPRを分割する。
- Web版の一般メンバー向け画面（`dashboard`配下、`LegacyApp` SPA）は、モバイルアプリのリリース後にどう扱うか（残す/縮小/リダイレクト）は本計画のフェーズ4以降で判断する。今は「共存」を前提にする。

## 1. 現状分析（コード調査結果）

- 単一の Next.js 15 プロジェクトがリポジトリ直下にある（`apps/`分割なし）。パッケージマネージャは npm（`package-lock.json`のみ、workspaces未設定）。
- `src/app/*/page.tsx` の多くは薄いラッパーで、実体は `src/app-shell/LegacyApp.tsx` という巨大なクライアントコンポーネント（SPAシェル）が `initialPage` によって画面を出し分けている。UIは Radix UI + Tailwind CSS。
- データアクセス層はサーバーAPIを介さず、**クライアントから `@supabase/supabase-js` を直接叩く**方式（`src/lib/supabase.ts` が生成する単一クライアント、`storage: window.localStorage`、`flowType: 'pkce'`）。ドメインロジックは `src/lib/db/queries/*`, `src/lib/db/mutations/*`, `src/domain/types/app.ts` に整理済み。
- サーバー側 API Route は `src/app/api/admin/login/route.ts` のみ（管理者ログイン専用）。それ以外は Supabase の RLS がアクセス制御の唯一の砦。
- 認証: メール/パスワード + Google OAuth（Supabase Auth, PKCE）。`AuthContext.tsx` がセッション管理とアプリ内ユーザー情報の同期を担当。
- Supabase: `supabase/migrations` に23件のマイグレーション。Storage bucket は `student-id-images`, `event-images`, `gallery-photos`, `user-avatars`。
- Vercel: `.vercel/project.json` でプロジェクト紐付け済み。Root Directory は現状リポジトリ直下。

この構造は**モバイル移行にとって好都合**：ビジネスロジック（`lib/db`, `domain/types`, Supabase クライアント設定）がUIから比較的分離されており、Supabase JS SDK は React Native でもそのまま動く（Storage を `AsyncStorage` に差し替えるだけ）。UI層（Radix/Tailwind/Canvas等）だけがWeb専用として残る。

## 2. ターゲット構成（モノレポ）

参考にした構成（NIPPOプロジェクト）に合わせつつ、Truss に不要な部分（`invoice/`, `sample/`）は持ち込まない。

```
truss-app/
├── apps/
│   ├── web/            # 現行Next.jsアプリをそのまま移設（admin + 既存member画面）
│   │   ├── src/
│   │   ├── public/
│   │   ├── next.config.ts
│   │   ├── package.json
│   │   └── AGENTS.md   # 現行AGENTS.mdの「Next.js breaking changes」注意書きはここに移す
│   └── mobile/          # 新規 Expo (React Native) アプリ
│       ├── app/         # Expo Router
│       ├── package.json
│       └── app.config.ts
├── packages/
│   ├── core/            # Web/Mobile共有: domain types, supabase client factory, db queries/mutations, 純粋なビジネスロジック
│   └── config/          # (任意) 共有 eslint/tsconfig/tailwind設定
├── docs/
├── scripts/
├── supabase/            # 現状維持（DBは1つ、アプリが増えても共通）
├── package.json         # workspaces ルート
└── AGENTS.md / CLAUDE.md
```

### `packages/core` に切り出すもの

- `src/domain/types/app.ts` → ドメイン型
- `src/lib/supabase.ts` → クライアント生成を関数化し、`storage`（localStorage / AsyncStorage）と `redirectTo` の解決方法だけ呼び出し側から注入できるようにする
- `src/lib/db/queries/*`, `src/lib/db/mutations/*` → Supabase呼び出しロジック（プラットフォーム非依存）
- `src/lib/profile-completion.ts`, `event-icons.ts`, `board-content.ts`, `event-map-link.ts` など、DOM/Canvasに依存しない純粋ロジック
- `database.types.ts`（Supabase生成型）

### Web専用に残すもの

- `app-shell/LegacyApp.tsx` とその配下（Radix UI, Tailwind前提）
- `mosaicCanvas.ts`, `student-id-image.ts` の Canvas/DOM API 依存部分（同等機能はモバイル側で `expo-image-manipulator` 等を使い再実装）
- Admin 画面一式（`admin-z8x4m2q9r7`）

### Mobile専用になるもの

- Expo Router によるナビゲーション（Bottom Tab: **確定** — Home / Journey / Memories / Connections / Passport の5タブ。ムードボード案（Home/Journey/Passport/Members/Menu）は採用しない）
- デザインコンセプトのPassport UI（スタンプ演出、水彩・手書き風ビジュアル）。ムードボードにより1ページ目=プロフィール、2ページ目以降=スタンプグリッド（1ページ最大10個）、間に写真/メモページを挟む構成が具体化されている（`design-concept.md`のビジュアルリファレンス参照）
- 将来: BLEスタンプ連携（`react-native-ble-plx` 等のネイティブモジュール）→ **Expo Go では動かないため、EAS の Custom Dev Client / Bare化が必要になる点は要注意**（フェーズ5でネイティブ機能の要否を確認してから判断する）

## 3. 認証まわりの移行方針

- Supabase Auth はそのまま共通利用。モバイルは `@supabase/supabase-js` + `@react-native-async-storage/async-storage` を `storage` に指定し、PKCEフローを維持。
- Google OAuth はモバイルでは `expo-auth-session` + Supabase の deep link (`myapp://auth/callback` 的なカスタムスキーム) redirect に切り替える必要がある。Web版の `getAppOrigin()` 相当をモバイル用に実装（`packages/core`側でプラットフォーム別に注入）。
- Supabase Dashboard の Redirect URLs にモバイルのカスタムスキームを追加登録する必要がある（本番影響なし、追加のみ）。
- localStorageキー（`truss-app-auth`, `truss-app-user-cache`）はプラットフォームごとにストレージが分離されるため衝突しないが、命名は揃えておく。

### 大学発行アカウント問題（要対応）

現状は email/password（`AuthContext.signIn`）と Google OAuth（`signInWithGoogle`）の両方が実装されている。どちらの経路でも、ユーザーが**大学発行のメール／Google Workspaceアカウント**（例: `*.ac.jp`）で登録してしまうケースがある。大学アカウントは卒業・帰国後に大学側で無効化されうるため、「Passportは一生有効」という方針と矛盾する（ログインできなくなる＝実質的にアカウントを失う）。

対応方針（3段構え）:
1. **サインアップ時のドメイン警告**: 登録メール（email/password）またはGoogleアカウントのメールアドレスが大学ドメイン（設定リストで判定、例 `*.ac.jp`）に一致する場合、ブロックはせず「卒業後も使うために個人のアカウント利用を推奨」という警告を表示する
2. **サブアカウントのリンク機能**: プロフィール設定から、個人のGoogleアカウントやメール/パスワードを追加でリンクできるようにする（Supabase Authの `linkIdentity` を利用）。卒業が近いメンバーへの通知（Truss Embassy経由 or 定期リマインド）とセットで訴求する
3. **運営による手動救済フロー**: `public.users.id`（アプリ内ID）と `users.auth_id`（Supabase Auth側ID）が分離されているため、大学アカウントが完全に失われても、本人確認の上で運営が `auth_id` を新しい個人アカウントに繋ぎ直せば履歴データは保持できる。この手順を運営向けドキュメントとして整備しておく

このうち1・2はモバイル移行を待たず、現行Web版にも先行実装できる。

#### 電話番号（SMS OTP）＋ Passkeyの検討（実装済みnode_modulesを調査）

`node_modules/@supabase/auth-js`（現行 v2.99.2）を実際に調査した結果:

- **Passkey (WebAuthn)**: `supabase.auth.webauthn.*`（`enroll`/`register`/`authenticate`/`verify`）が実装済み。ただし**`mfa.enroll`ベースの多要素認証（MFA）の追加ファクターとして設計されており、まだ`@experimental`**。つまり現状は「既に何らかの第一認証を通過した後に追加する、二段目の鍵」であり、**Passkey単体を大学非依存の主認証にすることはまだできない**
- **電話番号（SMS OTP）**: `supabase.auth.signInWithOtp({ phone })` は安定版APIで、**単独の第一認証として利用可能**。`users.phone` は既に必須項目のため、データは既に揃っている

これを踏まえ、方針を以下のように具体化する:
- **電話番号（SMS OTP）を、Google/大学メールと並ぶ「大学に依存しない主認証」として追加する**。9節の緊急連絡用SMS基盤（Twilio等）とインフラを共用でき、実装コストの重複がない。卒業前に「個人の連絡先に電話番号を最新化しておく」ことを促す運用とセットにする（本人が日本の番号を解約する可能性はあるため、これ単体で100%解決するわけではない点は留意）
- **Passkeyは、電話番号やメールでログイン済みの状態に追加登録できる「速くて安全な二段目の鍵」として将来的に導入**。UX向上が主目的で、大学非依存問題の根本解決は電話番号側に担わせる。Supabase側の`@experimental`が外れるタイミングも見ながら導入時期を判断する

## 4. 段階移行計画

本番を壊さないよう、**フェーズ1（モノレポ化）が最もリスクが高い**。ここだけ慎重に進める。

### Phase 0: 準備（このドキュメント作成含む）
- 本計画のレビュー・合意
- ツール選定の最終決定（要確認事項は後述）

### Phase 1: モノレポ化（既存Webアプリの移設のみ、機能変更なし）
1. `git mv` で `src/`, `public/`, `next.config.ts`, `package.json`, `tsconfig.json`, `postcss.config.mjs`, `eslint.config.mjs`, `.env.local` 等を `apps/web/` へ移動（履歴を保持）
2. ルートに workspaces 用 `package.json`（`"workspaces": ["apps/*", "packages/*"]`）を新設
3. ルート `next-env.d.ts` / `.next` / `tsconfig.tsbuildinfo` はビルド成果物なので `apps/web/` 側で再生成、`.gitignore` を確認
4. **ローカルで `npm install` → `npm run build` → `npm run dev` が `apps/web` で問題なく通ることを確認**
5. Vercel の Project Settings → General → Root Directory を `apps/web` に変更。Preview環境で先に確認してから本番反映
6. `AGENTS.md` の「This is NOT the Next.js you know」の注意書きは `apps/web/AGENTS.md` に複製し、ルートAGENTS.mdはモノレポ全体向けに書き換え
7. 問題なければ本番マージ・デプロイ確認

このフェーズが完了するまで、他フェーズのコードは書かない（依存関係が変わるため）。

### Phase 2: `packages/core` の抽出
- 上記「切り出すもの」を `packages/core` に移動し、`apps/web` からはその参照に置き換える（動作は変えない、importパスのリファクタのみ）
- 既存のテスト（vitest）がある場合はこの時点で通ることを確認

### Phase 3: `apps/mobile` の新規作成
- Expo (最新SDK) + Expo Router + TypeScript でスキャフォールド
- `packages/core` を依存として追加、Supabaseクライアントのモバイル版ファクトリを実装
- 認証（メール/パスワード, Google OAuth）を実装し、ログイン〜プロフィール登録の動線を疎通させる
- Bottom Navigation（Home / Journey / Memories / Connections / Passport）の空実装 + デザインコンセプトに沿った基本トンマナ（クリーム背景、Truss Blue、手書き風フォント）を先に当てる

### Phase 4: 機能移植（画面ごとに順次）
優先順位案（要合意）:
1. Passport（プロフィール1ページ目 + スタンプ一覧）
2. Journey（イベント一覧・詳細・参加）
3. Memories（ギャラリー閲覧・投稿）
4. Connections（出会った人一覧、外部SNS導線） ※「Connection Bump」自体はPhase 5で実装、ここでは一覧・Friends表示のみ
5. Truss Embassy（運営とのチャット）→ 詳細は「7. Truss Embassyチャット強化」を参照

### Phase 5: BLE基盤機能（Electronic Stamp ＋ Connection Bump）
- Electronic Stamp（木製BLEスタンプ）と Connection Bump（端末を振って繋がる）は、どちらも「近くのBLE端末を検知する」という同じネイティブ基盤が必要なため、まとめて1フェーズで扱う
- Expo Go非対応（`react-native-ble-plx`等のネイティブモジュールが必要）のため、このフェーズの入り口で Dev Client / EAS Build への切り替えを行う
- 詳細は「8. Connections: Connection Bump ＆ Friends機能」を参照
- **Electronic Stampのプロトコル**（ムードボードのハード仕様シートより判明）: スタンプデバイス（直径60mm、ESP32-C3、USB-C充電）は固定のデバイスIDをBLEでadvertiseするだけ。「そのデバイスIDが今どのイベントのスタンプか」はデバイス側ではなく**サーバー側のマッピングテーブル（device_id × 日付範囲 → event_id）で管理**する。そのため実装は「BLEでデバイスID受信→サーバーに問い合わせてevent_id解決→Passportにスタンプ記録」というシンプルな流れになり、イベントごとにデバイスを再プログラムする必要がない

### Phase 6: リリース準備
- EAS Build設定、App Store / Google Play 提出、TestFlight/内部テストトラック配布
- クラッシュ計測・アナリティクス方針の検討

### Phase 7: Print & Send（ロードマップ入り確定・実装はMVP後）
- 卒業後、貯めたスタンプをPDFの冊子にまとめ、支援者・メンターへの感謝メッセージを添えて印刷・郵送できる機能。「支援すること」への感謝を物理的な形で返す、Trussの将来構想の一つとして正式にロードマップに含める
- 実装方式は未確定（PDF生成をどう行うか、印刷・配送を自前でやるか外部印刷サービスのAPIを使うか等）。MVPスコープには含めず、Phase 6（リリース）以降に詳細設計する

## 5. リスクと対策

| リスク | 対策 |
|---|---|
| Vercel Root Directory変更時に本番デプロイが壊れる | Preview環境で先に確認、変更はPhase 1のみに限定して他の変更と混ぜない |
| モノレポ化でimportパス崩れ・ビルド設定漏れ | `git mv`後すぐに`npm run build`をローカルで確認してからPR化 |
| RLSに依存した権限設計がモバイル特有の呼び出し方で想定外の穴を作る | 新規クエリ追加時もRLSポリシーを正とし、クライアント側チェックだけに頼らない（既存方針を踏襲） |
| Google OAuthのリダイレクト設定変更でWeb版ログインが壊れる | モバイル用スキームは「追加」のみ行い、既存Web用Redirect URLは変更しない |
| BLE連携でExpo Go運用ができなくなる | Phase 5で影響範囲を確認してからDev Client移行を判断、Phase 3-4はExpo Goで開発継続 |

## 6. 要確認事項（ユーザーに要相談）

- Web版の一般メンバー向け画面（`dashboard`/`LegacyApp`）は、モバイル版が揃った後も残すか、段階的に縮小するか
- モバイルの配布形態（TestFlight/内部テストのみ先行 or 一般公開までのスコープ）
- 7・8節（Truss Embassyチャット強化、Connection Bump）の詳細項目は一度質問したが応答がなかったため、**推奨案を仮決定として記載**している。実装着手前に必ず再確認すること
- Friends判定条件（別日カウント / 別イベントカウント / 回数のみ）
- 数年後通知の基準日（出会った日 / Friendsになった日 / 両方）

### 確定事項（2026-07-03）
- カラーパレットはパステル・ジャーナル系（Blue `#6DB9E7` / Green `#B7D8C1` / Peach `#F3C7B6` / Navy `#3D4756`、クリーム背景）を採用。ヴィンテージ・レザー系は不採用
- ボトムナビは v0.3案どおり Home / Journey / Memories / Connections / Passport の5タブで確定
- Print & Send（卒業後の物理Passport郵送）はロードマップに正式採用（Phase 7、実装時期はMVP後）

補足: パッケージマネージャは npm workspaces のみで開始する方針を採用（Turborepoは規模が大きくなってから追加で導入可能なため、現時点では見送り）。

## 7. Truss Embassyチャット強化

現状は `messages` テーブルによる 1:1 テキストチャットのみ（`sender_id`/`receiver_id`, `is_admin`, `read`, `pinned`, `flagged`）。運営側の受信箱は「承認済みの最初の管理者アカウント」に集約される仕組み（`get_staff_inbox_user_id()`）。デザインコンセプトにあるカテゴリ分け（問い合わせ/イベント相談/入会/困りごと）はまだデータ上存在しない。

以下を段階的に追加する（**優先度は未確認、下記は提案順**）:

1. **相談カテゴリ分け**: `messages` に `category` 列（`inquiry` / `event_consult` / `membership` / `trouble` 等の enum）を追加。ユーザーが最初のメッセージ送信時にカテゴリを選ぶ、または運営側が後から分類する
2. **対応ステータス管理**: スレッド単位（ユーザー×運営）で `open` / `in_progress` / `resolved` を持たせる。既存はメッセージ単位のテーブルしかないため、`chat_threads`（user_id, category, status, assigned_admin_id, updated_at）を新設し、`messages.thread_id` で紐付ける設計に寄せる
3. **既読表示**: 既存の `read` フラグ（受信者視点のみ）に加え、`read_at` タイムスタンプを追加。双方向（ユーザーが運営メッセージを読んだか／運営がユーザーメッセージを読んだか）で使えるようにする
4. **画像・ファイル添付**: `event-images`等と同様の命名規則で `chat-attachments` Storage bucketを新設し、`messages.attachment_path` を追加
5. **プッシュ通知**: モバイル移行に伴い実質必須。Expo Push Notifications + Supabase Edge Function（`messages` insertトリガー）で新着メッセージ通知

これらはWeb管理画面（`AdminChatMessages.tsx`等）とモバイル双方の改修が必要。スキーマ変更はマイグレーションを追加するだけで本番に影響しない形で進められるため、Phase 2（`packages/core`抽出）の前後どちらでも着手可能。

## 8. Connections: Connection Bump ＆ Friends機能

会員同士が実際に出会った瞬間に端末を振って「縁」を記録する新機能。電子スタンプ（Electronic Stamp）と同じBLE近接検知の基盤を使う。

### 検知方式（確定: BLEでの候補検出 ＋ 両者の相互確認で確定）

BLEの近接（RSSI）だけでは「本当に会って話したか」は証明できない（会場にいるだけで多数の端末が近距離判定されうる）ため、**BLEは候補を絞り込むだけに使い、最終的な成立は両者の相互確認（ダブルオプトイン）で決める**方式にする。

1. 両者が同時に端末を振る（`expo-sensors`のAccelerometerでシェイクジェスチャーを検知）
2. シェイクした瞬間だけ短時間BLEでadvertise/scanし、「±1〜2秒以内にシェイクし、かつRSSIが近距離閾値（目安 -50〜-60dBm）を満たす」端末を候補として抽出（複数候補がヒットしてもよい＝この時点では絞りきらない）
3. 候補ペアごとに `connection_events` を `status='pending'` で作成し、両者へ確認プッシュ通知（「〇〇さんと出会った可能性があります。記録しますか？」）を送る
4. **両方が「はい」をタップして初めて `status='confirmed'`** になり、`occurred_at`（＝シェイクした瞬間）が記録される。片方でも否認・無視のまま失効すればそのまま破棄
5. 確認プロンプトは一定時間（数時間〜当日中）で自動失効させ、記憶があいまいなまま誤タップされるのを防ぐ
6. 同一ユーザー間の再シェイクにクールダウンを設け、候補の連打・水増しを防ぐ

Expo Goでは動作しない（ネイティブBLEモジュールが必要）ため、Electronic Stampと合わせて Phase 5 で Dev Client / EAS Build に移行する前提。

### データモデル（案）
- `connection_events`: `id`, `user_id_a`, `user_id_b`（`user_id_a < user_id_b` で正規化して重複ペアを防ぐ）, `method`（'bump' 固定、将来拡張用）, `event_id`（nullable、参加中のJourneyがあれば紐付け）, `occurred_at`, `status`（'pending' | 'confirmed' | 'declined' | 'expired'）, `confirmed_by_a_at`, `confirmed_by_b_at`
- `connections`（`status='confirmed'`の行から集計するビュー or テーブル）: `user_id_a`, `user_id_b`, `first_met_at`, `distinct_day_count`, `status`（'connection' | 'friend'）, `friend_since`
- Friends昇格ロジック: `connection_events`（`status='confirmed'`のみ）を日付（`occurred_at::date`）でユニーク化し、異なる日付が3件以上になった時点で `status = 'friend'`, `friend_since = 3件目のoccurred_at` を設定するトリガー or バッチ処理

### Friends判定条件（仮決定: 別日カウント、定例イベント活用案あり）
- 同日中に何度振っても1カウント。異なる日に3回出会って初めてFriendsになる（懇親会中の連打によるFriends化を防止）
- 相互確認（両者の同意）が既に1回ごとに必要なため、水増し耐性はこの時点でかなり高い。別日カウントは「短時間に3回連続確認して即Friends化する」ケースへの追加の歯止め
- **活用アイデア**: LECのような週次の定例イベントで、参加者同士に毎回シェイクを促す（「会って話した証拠」として）。3週参加すれば自然に3回・別日の条件を満たしFriendsになる。Journey（イベント参加記録）とConnection Bumpの相性が良い具体例
- **未解決の論点（ユーザー指摘・要検討）**: Truss以前からの知り合い・既存の友人関係はこの仕組みでは拾えない（3回シェイクしていなければFriendsにならない）。これは技術的に厳密な解決が難しい問題。**現時点の意見**: 無理に現実の友人関係全てを再現しようとせず、「TrussのFriendsバッジ＝Trussでの体験を通じて育った縁」と割り切るのが良さそう（デザインコンセプトの「イベント参加ではなくJourney」という思想とも整合する）。もし既存の友人関係も可視化したいなら、バッジ付与とは別に「すでに知り合いです」という軽量な相互承認リンク（儀式性なし、単なる表示上の紐付け）を後日追加する案もあるが、優先度は低い

### 数年後通知（仮決定: 初めて出会った日基準）
- `first_met_at` の年単位の記念日（1年後、3年後など）が今日と一致する `connections` 行を毎日バッチで検索し、既存の `notifications` テーブル + Expo Push で両者に通知
- 実装は pg_cron か Supabase Edge Function の日次スケジュール実行。Web版が使っている `subscribeToNotifications` の仕組みをそのまま流用できる
- 拡張として「Friendsになった日（`friend_since`）」基準の通知も同じ仕組みで後から追加可能

### 未確定・要再確認
- Friends判定条件（別日カウント / 別イベントカウント / 回数のみ）
- 通知基準日（出会った日 / Friendsになった日 / 両方）
- BLE候補検出のRSSI閾値・時間窓は実機検証しながらのチューニングが必要（数値は仮の目安）
- 既存の友人関係をFriendsとして拾うか（上記「未解決の論点」参照、優先度低）

## 9. 運営からの通知・当日緊急連絡

現状、`admin_broadcasts`（一斉送信、email/inApp、送信取り消し対応）と `users.phone`（電話番号、必須項目としてNOT NULL済み）は既に存在する。これをベースに以下を追加する。

### 個別の緊急連絡（直電）: 確定・低コストで実現可能
- 運営画面の会員詳細に電話番号表示 + 「番号をコピー」ボタン、加えて `tel:` リンクを併設する
- **`tel:` はWindows/Macのブラウザからだと動作が環境依存**（Macは iPhoneとの連携=Continuity Callsが有効な場合のみ自動発信、Windowsは「スマホ同期」等と連携していないと無反応）。運営はPCの管理画面から使うことが多い想定のため、**確実に使えるのはコピー機能の方**。`tel:`は動けば便利な「おまけ」程度の位置づけにする
- 無断欠席の確認・安全確認など1対1の緊急連絡に使う。モバイル移行を待たず、現行Web管理画面にそのまま追加できる（独立した小さな変更として先行実装も可能）

### 当日の一斉緊急連絡: SMS追加を提案
- 現状の `admin_broadcasts.notification_type`（`email` / `inApp` / `both`）は即時性が弱い（メールは確認が遅れがち、アプリ内通知は開いていないと気づかない）
- **`sms` を新しい notification_type として追加**し、外部SMS API（Twilio等）経由で `users.phone` 宛に送信する。コストが発生するため、日常の連絡はメール/アプリ内通知のまま、「集合場所変更」「荒天中止」等の**当日・緊急のものだけSMSを使う**運用を想定
- モバイルアプリのプッシュ通知が実装されれば（7節参照）、緊急連絡の主軸はプッシュ通知に寄せつつ、SMSは「アプリが開かれていない・通知がオフ」な人への確実な保険として位置づける

### 要検討
- `users.phone` が必ずしも日本国内で通話・SMS受信可能な番号とは限らない（留学生・海外メンバーは自国の番号を登録している可能性がある）。SMS/直電が届かないケースのフォールバック（メール強調表示、WhatsApp等）を検討する必要がある
- SMS送信のコスト管理（緊急連絡に限定する運用ルールづくり）
