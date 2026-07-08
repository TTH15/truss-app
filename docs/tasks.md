# Truss モバイル対応 実行タスクリスト

詳細な背景・設計判断は [`plan.md`](./plan.md)、UI/世界観は [`design-concept.md`](./design-concept.md) を参照。本ドキュメントは「今何が終わっていて、次に何をやるか」を追うためのチェックリスト。モバイル各画面の「未検証」項目を実データで確認する手順は [`mobile-manual-testing.md`](./mobile-manual-testing.md) を参照。

進捗更新ルール: 着手したら `[ ]` → `[x]`。フェーズの並び順は依存関係の順（Phase 1が終わるまでPhase 2以降のコードは書かない）。

---

## 現在の状態（2026-07-07、新セッション引き継ぎ用）

- リポジトリを `~/Developer/truss-app` へ移行済み（旧パス `~/Documents/Kobe-u/Truss/truss-app` からの移行経緯は git履歴・過去セッション参照）。
- **Phase 1（モノレポ化）完了・コミット・push済み**（`apps/web`への移設、workspaces化、`.gitignore`修正、AGENTS.md分離）。Vercel Root Directoryは`apps/web`に変更済み（ユーザー側で実施）。
- **Phase 2（`packages/core`抽出）完了・コミット・push済み**（ドメイン型/Supabaseクライアントファクトリ/DBクエリ・ミューテーション/純粋ロジックを`packages/core`へ移動、`apps/web`は`@truss/core`経由で参照）。
- **Web版の不具合修正・小改善を実施・push済み**（この間にモバイル移行とは別に発見・依頼された案件）:
  - 掲示板管理画面のカードはみ出し（`CardTitle`の折り返し漏れ）
  - タブ切り替え時の毎回ローディング表示（ブラウザタブ復帰時の`SIGNED_IN`再送、放送履歴タブの無条件再取得）
  - 掲示板本文中URLの自動リンク化
  - チャットのタイムスタンプをLINE風の相対表示に変更（`apps/web/src/lib/chat-time.ts`新設）
  - 管理者アカウントが複数存在する場合にチャットのリアルタイム更新が届かない不具合を修正
- **「運営受信箱のシステムID化」完了・コミット・push済み**（下記横断タスク参照）。
- **Phase 3（`apps/mobile`新規作成）着手・スキャフォールドと認証・ナビゲーション基盤が完了**。iOS Simulator（Expo Go）上でのビルド・起動・フォント表示まで実機確認済み。詳細はPhase 3セクション参照。
- **Node.jsをv20.17.0→v22.23.1へアップグレード済み**（`nvm`をHomebrewで導入し`.zshenv`/`.zprofile`に初期化処理を追加、`nvm alias default 22`を設定）。リポジトリに`.nvmrc`（`22`）とルート`package.json`の`engines`フィールドを追加。EBADENGINE警告は解消し、`expo export --platform web`で発生していたNode 20起因のWebSocket欠如エラーも解消（Web出力は`output: "single"`に変更し、SSR起因の別エラーも回避）。
- **`apps/mobile/.env`セットアップ、Supabase Dashboard Redirect URL登録完了**（`truss://auth/callback`追加済み、Web用URLは維持）。Google Cloud Console側は変更不要（Supabase固定コールバックURLを既に使用中のため）。
- **今後の認証プランに追加**: 個人メール追加（Magic Link/OTP、大学メール失効後の恒久的な復旧手段）、Passkey追加（利便性向上目的、`@experimental`解除待ち）。詳細はPhase 3「認証移行まわり」参照。
- **Phase 4の主要画面（プロフィール登録フォーム・Passport・Journey・Truss Embassy・Memories・Connections）+ QRコードイベントチェックイン実装完了**。詳細はPhase 4セクション参照。
- **次にやること**: 実データでのE2E動作確認（各画面「未検証」項目、手順は[`mobile-manual-testing.md`](./mobile-manual-testing.md)参照）、またはTruss Embassyチャット強化（Phase 4セクション内、スキーマ変更のみで着手可）。

---

## 0. 要確認事項（ブロッキング、未回答）

plan.md 6節より。ここが決まらないと着手できない/手戻りが出るタスクに影響。

- [ ] Web版の一般メンバー向け画面（`dashboard`/`LegacyApp`）: モバイル版リリース後も残すか、縮小するか
- [ ] モバイルの配布形態（TestFlight/内部テストのみ先行 or 一般公開までのスコープ）
- [ ] Truss Embassyチャット強化・Connection Bumpの詳細優先度（現在は推奨案を仮決定として記載、着手前に再確認要）
- [ ] Friends判定条件（別日カウント / 別イベントカウント / 回数のみ）
- [ ] 数年後通知の基準日（出会った日 / Friendsになった日 / 両方）
- [ ] **NFCタップ時のiOS標準「読み取り準備中」システムシートの扱い**（Core NFCの仕様上アプリ側で抑制不可。チケット画面=NFC待機画面という世界観と完全には整合しないため、見せ方を要検討。Androidは無透明に近い読み取りが可能で非対称）

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

- [x] Expo（最新SDK）+ Expo Router + TypeScript でスキャフォールド（SDK 57、`create-expo-app`。デモ用テンプレートコンテンツは削除済み）
- [x] `packages/core` を依存に追加、Supabaseクライアントのモバイル版ファクトリを実装
  - `metro.config.js` でモノレポのワークスペースルートを解決（`watchFolders`/`nodeModulesPaths`/`disableHierarchicalLookup`）
  - `packages/core/src/supabase.ts` の `supabase` を `const` → `let` にし、`setSupabaseClient()` を追加（ES Modulesのlive bindingで`db/queries`・`db/mutations`が参照する実体を呼び出し側から差し替え可能に。Web側は従来通りデフォルト挙動のまま変更不要）
  - `apps/mobile/src/lib/supabase.ts` で `AsyncStorage` を注入したクライアントを生成し `setSupabaseClient()` で登録
  - **既知の問題と回避策**: npm workspaces のhoistingで `expo-router` が `apps/mobile/node_modules` 止まりになり、`@expo/cli` 内部の非相対importが解決できず起動時エラーになった。ルート `package.json` に `expo-router` を明示依存として追加することでhoistingを強制し解消（`package.json`のコメントとしてこの理由を残せないため、ここに記録）
- [x] メール/パスワード認証を実装（`apps/mobile/src/contexts/AuthContext.tsx`、`LoginScreen`/`SignUpScreen`）
- [x] Google OAuth を `expo-auth-session` + カスタムスキームdeep linkで実装（`apps/mobile/src/lib/google-auth.ts`、PKCEフロー）。**未検証**: 実機での動作確認と、Supabase Dashboard側のRedirect URL登録が未実施（下記参照）
- [x] ログイン〜プロフィール登録の動線を疎通確認（`registrationStep !== 'fully_active'` で `ProfileRegistrationScreen` スタブへ遷移することを確認。フォーム本体はPhase 4で移植）
- [x] Bottom Navigation（Home / Journey / Memories / Connections / Passport）の空実装（`expo-router`の`Tabs`、アイコンは`@expo/vector-icons`の仮アイコン）
- [x] デザインコンセプトの基本トンマナを適用（クリーム背景`#F7F5F1`・Truss Blue`#6DB9E7`等 `docs/design-concept.md`確定パレット、Playfair Display/Noto Sans JP/Caveatフォントを`_layout.tsx`で読み込み）
- [x] iOS Simulator（Expo Go, SDK 57）上でのビルド・起動・フォント表示を実機確認（スクリーンショットで確認済み、Androidは未確認）

### 認証移行まわり（Phase 3と並行、一部はWeb版に先行実装可）

- [x] サインアップ時の大学ドメイン警告（`*.ac.jp`等、ブロックせず警告のみ）— モバイル側`SignUpScreen`に実装済み。Web版は未実装のまま
- [x] Supabase Dashboard の Redirect URLs にモバイル用カスタムスキーム（`truss://auth/callback`）を追加登録済み（Web用URLは維持したまま追加）
- [ ] **個人メールアドレスの追加（Magic LinkまたはOTP認証）** — 大学メールは卒業後失効するため、個人が卒業後も持ち続けられる恒久的な連絡先・復旧手段として個人メールを追加登録できるようにする。Supabase Authの `linkIdentity`（もしくは同一ユーザーへの2件目のメールOTP紐付け）で実現。大学メールを主要因子、個人メールを恒久的な復旧・連絡手段とする位置づけ
- [ ] Passkey（WebAuthn）の追加 — モバイル・個人メール導入後の利便性向上として。Supabase側のWebAuthn/Passkeyサポートは現状`@experimental`のため、`@experimental`解除のタイミングを見て着手（優先度中〜低。「確実な単一認証」ではなく「速い第二の鍵」という位置づけ、フォールバックは個人メールに委ねる）
- [ ] 運営による手動救済フロー（`auth_id` 付け替え）の運用ドキュメント整備
- [ ] 電話番号（SMS OTP）を大学非依存の主認証として追加 — 留学生の一時的な日本の電話番号は解約後に他人へ再割当されるリスクがあるため、恒久的な復旧手段としては上記の個人メールを優先する

## Phase 4: 機能移植（画面ごと、優先順位は要合意）

- [x] **プロフィール登録フォーム（初期登録）** — `apps/mobile/src/screens/InitialRegistrationScreen.tsx`。氏名/フリガナ/学籍番号/電話番号/学部/学科/学年/区分/学生証写真（任意）。Web版`InitialRegistration.tsx`のロジックを移植:
  - `FACULTIES`（学部・学科データ）を`packages/core/src/faculties.ts`に切り出し、Web/モバイル共有化
  - `packages/core`に`completeInitialRegistrationRow`（既存行があればupdate、なければinsert）を新設、`uploadStudentIdImage`の引数型を`File`→`Blob`に緩和（Web/モバイル両対応）
  - 学生証写真の選択・リサイズ・JPEG圧縮は`expo-image-picker`/`expo-image-manipulator`で実装（Web版の`FileReader`/`canvas`ベースの実装はブラウザ専用のため移植不可、モバイル向けに新規実装）
  - `registrationStep`に応じた画面振り分け（未登録→本フォーム、承認待ち等の中間状態→`RegistrationStatusScreen`、`fully_active`→タブナビゲーション）を`_layout.tsx`に実装
  - **未検証**: 実際のサインアップ〜フォーム送信までのE2E動作確認（本番Supabaseにテストデータが残るため未実施。tsc/lint/Metroバンドル成功とコードレビューのみで確認）
- [x] **Passport（1ページ目 + スタンプグリッド）** — `apps/mobile/src/screens/PassportScreen.tsx`。プロフィールヘッダー（Name/Furigana/区分）、Passport No./Member Since/Journey/Connectionsの統計行、Journey Stamps（参加イベント数ぶんのアイコン付きスタンプ、最大10件）:
  - `apps/mobile/src/contexts/DataContext.tsx`を新設（`queryEvents`/`queryEventParticipantsGrouped`を`packages/core`から利用、`fully_active`到達後のみ`DataProvider`でラップ）
  - Passport Noは`users.id`から決定的に導出した表示専用の値（DBには永続化しない）。Member Sinceは`membershipYear`を使用（`createdAt`は既存の`queryUserByAuthId`実装で未マッピングのため使用不可）
  - スタンプ用アイコンはFontAwesome（`event-icons.ts`）→Ionicons名への簡易マッピング（`apps/mobile/src/lib/event-icon-map.ts`）で表示
  - **未実装**: Connections数（Connection Bump未実装のため常に0）、写真/メモページ挟み込み、Contributions/Current Roles（対応するスキーマが存在しないため。設計合意が必要）、10件超のスタンプのページ送りUI（現状は先頭10件のみ表示）
  - **未検証**: 実データでの表示確認（本番Supabaseの認証込みE2Eは未実施。モックログイン経由でDataContextのクエリ発火・0件時のレンダリングは実機ログで確認済み）
- [x] **Journey（イベント一覧・詳細・参加）** — `apps/mobile/src/screens/JourneyScreen.tsx`。開催予定/開催済みのカード一覧、詳細モーダル（Google Maps連携、いいね、参加ボタン）、参加登録フロー（確認モーダル→顔写真アップロード拒否チェック→完了モーダルでLINEグループ導線）。Web版`EventsPage.tsx`のロジック（プロフィール未完了/年会費未納時の複数イベント参加制限、`registerEventParticipant`/`unregisterEventParticipant`/`toggleEventLikeForUser`）をそのまま移植:
  - `DataContext`に`registerForEvent`/`unregisterFromEvent`/`toggleEventLike`を追加（Web版`DataContext.tsx`と同じ設計）
  - Web版はカレンダーグリッドUIだが、モバイルはリスト表示に変更（RN向けにカレンダーライブラリを新規導入するコストを避けるための簡略化）
  - いいね済みかどうかの表示はWeb版と同じくローカルstateのみ（DBに「誰がいいねしたか」を問い合わせる仕組みが元々ないため、リロードで消える点もWeb版と同じ挙動）
  - 説明文のURL自動リンク化は未対応（Web版の`linkifyText`はReact要素を返す実装でモバイル非対応、当面プレーンテキスト表示）
  - **未検証**: 実データでの参加登録フロー全体（本番SupabaseでのE2Eは未実施）。カード表示・詳細モーダル表示は一時的なモックデータ注入により実機で確認済み
- [x] **Truss Embassy（運営とのチャット）** — `apps/mobile/src/screens/TrussEmbassyScreen.tsx`。5タブには含めず、Homeタブ（`index.tsx`）のカードから全画面モーダルで開く形にした（Web版もタブ/専用ページではなくDashboard内の通知経由アクセスのため、モバイルもタブ枠を増やさず同等の位置付けとした）:
  - `chat-time.ts`（LINE風の日付・時刻フォーマット）を`apps/web/src/lib/chat-time.ts`から`packages/core/src/chat-time.ts`へ移動しWeb/モバイル共有化（Web側の参照2箇所も更新）
  - `DataContext`に`messageThreads`/`chatThreadMetadata`/`staffInboxUserId`/`sendMessageToStaff`/`markStaffThreadAsRead`を追加。`queryStaffInboxUserId`（運営受信箱システムID）・`queryMessageThreadsAndMetadata`・`sendMessageRow`・`markAllMessagesAsReadForUserRow`はすべて`packages/core`の既存関数をそのまま利用
  - メッセージのrealtime購読（`receiver_id`/`is_broadcast`フィルタ）はWeb版`DataContext.tsx`の非admin購読ロジックと同じ
  - Homeタブに未読件数バッジを表示
  - **未実装**: ピン留め/フラグ機能（Web版もローカルstateのみで実質未使用の機能のため意図的に省略）
  - **未検証**: 実データでの送受信フロー全体（本番SupabaseでのE2Eは未実施）。吹き出し・日付区切り表示は一時的なモックデータ注入により実機で確認済み
- [x] **Memories（ギャラリー閲覧・投稿）** — `apps/mobile/src/screens/MemoriesScreen.tsx`。承認済み写真の2カラムグリッド、いいねボタン、FABから写真追加（イベント選択＋複数枚選択＋アップロード）。Web版`GalleryPage.tsx`のロジックを移植:
  - Web版はMasonryレイアウトだが、モバイルは固定アスペクト比の2カラムグリッドに簡略化（Masonryライブラリ新規導入を避けるため）
  - 写真の選択・リサイズ・JPEG圧縮は`expo-image-picker`（複数選択）/`expo-image-manipulator`で実装（`apps/mobile/src/lib/gallery-image.ts`、学生証写真と同じ方式）
  - **アーキテクチャ変更**: `packages/core`の`uploadGalleryPhoto`/`uploadGalleryPhotoRow`/`isGalleryPhotoMimeAllowed`の引数を`File`依存から`Blob`+明示メタデータ（`fileName`/`contentType`）に変更（Web`File`は`.name`/`.type`を持つが、モバイルの`fetch(uri).then(r=>r.blob())`はどちらも持たないため）。Web側の呼び出し元3箇所（`GalleryPage.tsx`/`AdminGallery.tsx`）を`{ blob: file, fileName: file.name, contentType: file.type }`形式に更新、動作は変わらない
  - 未承認ユーザーはWeb版と同様ギャラリー非表示
  - **未実装**: 管理者承認フロー（Web版`AdminGallery.tsx`相当）はモバイルでは対象外（運営は当面Web管理画面を使用する想定）
  - **未検証**: 実データでのアップロードフロー全体（本番SupabaseでのE2Eは未実施）。グリッド表示・アップロードモーダルは一時的なモックデータ注入により実機で確認済み
- [x] **Connections** — `apps/mobile/src/screens/ConnectionsScreen.tsx`。Web版に参照実装なし（新規機能）。design-concept.mdの定義（友達一覧ではなく「人生で出会った人」の記録、DM機能は持たずLINE/WhatsApp/Instagram等の外部連絡先に繋ぐのみ）に沿って実装。実際の「出会い」を記録するConnection Bump（BLE）はPhase 5でまだ存在しないため、今回は完成度の高い空状態画面のみ（データ取得なし、DataContext変更なし）。Phase 5でConnection Bumpのスキーマが決まり次第、一覧表示ロジックを追加する
- 実機確認: 空状態表示は一時的なモックログインで確認済み

### イベント参加チェックイン（QRコード、MVP必須機能）

電子スタンプ（Phase 5, NFC）を持ってくるのを忘れた場合の受け皿ではなく、機種非依存で確実な**主経路**として位置づける。Dev Client/EAS Build（Phase 5の前提）を待たずExpo Goでも先行実装可能なため、電子スタンプより先に着手できる。

- [x] チケット画面裏面（タップで裏返り）にQRコードを表示 — `apps/mobile/src/components/EventTicket.tsx`。`Animated`のrotateYフリップ、`react-native-qrcode-svg`でQR描画。Journeyのイベント詳細（参加登録済み・開催予定のイベントのみ）から「チケットを表示」で開く
- [x] QRペイロード設計 — `packages/core/src/event-checkin.ts`。署名なしの`truss-checkin:v1:{eventId}:{userId}`プレーンテキスト。`event_participants.attended`の更新は既存のRLS（`event_participants_update_admin_only`、migration 015で追加済み）で管理者のみに制限済みのため、QR自体に暗号署名を持たせる必要はないと判断（対面スキャンという運用上、DB側のRLSが最終防衛線になっていれば十分）。`event_participants`への新規カラム追加なしで実現
- [x] 運営側スキャナー画面（カメラでQR読み取り → `event_participants.attended` を確定） — `apps/mobile/src/screens/CheckinScannerScreen.tsx`（`expo-camera`の`CameraView`バーコードスキャン）。`user.isAdmin`の場合のみHomeタブに入口カードを表示。スキャン→即座に確定ではなく、参加者名・イベント名を確認カードで表示してから明示的に「出席を確認する」をタップして確定する2段階フロー（一発確定を避けてほしいというフィードバックを反映）。イベント開催日と本日の日付が一致しない場合は警告表示（延期時は毎回警告が出て煩わしくなりうるが、「以後表示しない」チェックボックスのような追加の状態管理を持たせるよりも、延期時はWeb管理画面でイベントの開催日自体を更新する方がシンプルという判断で見送り。警告はブロッキングではなく、そのまま確定も可能）。既に出席確認済みの場合も警告表示
  - Web管理画面のイベント参加者一覧は`event_participants`テーブルのrealtime購読により自動反映される（追加対応不要）
  - **未検証**: 実機カメラでの実際のQR読み取り（シミュレータには実カメラがないため、権限画面・確認カード・結果カードの表示は一時的なモックデータ注入で確認済みだが、実際のスキャン動作は未確認）

### Truss Embassyチャット強化（スキーマ変更のみで本番影響なし、Phase 2前後どちらでも着手可）

- [ ] `messages` に `category` 列追加（`inquiry`/`event_consult`/`membership`/`trouble`）
- [ ] `chat_threads` テーブル新設（user_id, category, status, assigned_admin_id, updated_at）+ `messages.thread_id` 紐付け
- [ ] `read_at` タイムスタンプ追加（双方向既読対応）
- [ ] `chat-attachments` Storage bucket新設 + `messages.attachment_path`
- [ ] Expo Push Notifications + Supabase Edge Function（`messages` insertトリガー）

## Phase 5: Electronic Stamp（NFC） + Connection Bump（BLE）

Electronic StampはBLEではなくNFCを採用（当初案から変更）。タップという明確な動作を要求するため、BLEのRSSI距離判定より「その場に確実にいた」ことの担保が強く、ハードも電池不要の受動タグで安価。Connection Bumpは近接検知という性質上BLEを継続。

- [ ] Dev Client / EAS Build への切り替え（Expo Go非対応のため、このフェーズの入り口で実施）
- [ ] Electronic Stamp: NFC受動タグ（工場出荷UIDまたは書き込んだNDEFを`device_id`相当として使用）にタップ → サーバーの device_id×日付範囲→event_id マッピングに問い合わせ → Passportにスタンプ記録
- [ ] タグ→イベントのマッピング検証はサーバー側（Edge Function等）で行い、クライアントの自己申告だけで`attended`を確定しないようにする（なりすまし防止）
- [ ] チケット画面表示中はNFC待機状態として振る舞う（iOSの標準システムシート表示については本ドキュメント冒頭「0. 要確認事項」参照、要検討）
- [ ] QRチェックイン（Phase 4で実装済みの想定）をNFC非対応機種・タグ紛失時等の汎用フォールバックとして継続運用
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

## 横断タスク: 運営受信箱のシステムID化（着手中）

現状、メンバーが運営に送るメッセージは `get_staff_inbox_user_id()`（最古の承認済み管理者の`users.id`）宛に固定される設計。運営は個人アカウント+ロール（`is_admin`）で運用しており、これ自体は問題ない。ただし `messages.sender_id`/`receiver_id` は `users(id) ON DELETE CASCADE` のため、**運営交代時にそのアカウントの行を削除すると、その人が受信箱だった間のチャット履歴が丸ごと消える**リスクがある。個人に紐付かないシステムIDへ切り離す。

- [ ] 運営交代の運用ルールを明文化（当面の緩和策: アカウント削除ではなく `is_admin`/`approved` を外すのみに留める）
- [ ] 個人に紐付かない「システム上の運営受信箱ID」を導入し、`messages.receiver_id`（運営宛分）をそちらに固定
- [ ] `get_staff_inbox_user_id()` RPCを新しいシステムID返却に更新
- [ ] 既存の運営宛メッセージ（実在の管理者user.id宛）をシステムIDへ移行するマイグレーション
- [ ] 運営側チャットUI（`AdminChatMessages.tsx`等）が新しいシステムIDでも問題なく動作することを確認

---

## Phase 1実施時の注意点（リスク対策）

- [ ] Vercel Root Directory変更はPreview環境で先に確認、他の変更と混ぜない
- [ ] `git mv` 直後に `npm run build` をローカルで確認してからPR化
- [ ] 新規クエリ追加時もRLSポリシーを正とし、クライアント側チェックだけに頼らない
- [ ] Google OAuthリダイレクト設定はモバイル用スキームを「追加」のみ、既存Web用Redirect URLは変更しない
