# 作業ログ

## 2026-08-02 14:19 電話番号をハイフンなしに統一

- `packages/core/src/phone.ts` を新規追加: `normalizePhone()`（ハイフン・空白・括弧除去、全角→半角、先頭 `+` 保持）と `isValidPhone()`（正規化後 8〜15 桁）。`index.ts` から export。
- 保存経路2箇所で正規化を適用: 初期登録の行ビルダー（`packages/core/src/db/initial-registration.ts`）と `AuthContext.updateUser`（DB・ローカル state 両方に正規化後の値が入る）。
- `InitialRegistration` のローカルバリデーションを `isValidPhone` に置換。プレースホルダーを `090-1234-5678` → `09012345678` に変更（InitialRegistration / ProfileRegistration）。
- 既存データ用マイグレーション `supabase/migrations/031_truss_phone_normalize.sql` を追加（冪等な UPDATE）。
- 検証: `tsc --noEmit` 通過。lint エラーは変更前から存在する既存のもの（`react-hooks/set-state-in-effect`）のみ。正規化ロジックは node で動作確認済み。
- 残課題: マイグレーション 031 は未適用。Supabase Dashboard の SQL Editor で手動実行が必要。

## 2026-08-02 17:36 操作ガイドツアー・role・所属団体ナッジ・PWA導線

- **操作ガイドツアー**: driver.js を導入し `apps/web/src/lib/user-tour.ts`(日英ステップ定義)+ `src/styles/tour.css`(Truss デザイン上書き)を追加。Dashboard の下部ナビ5タブ+通知/言語/プロフィールに `data-tour` 属性を付与。承認済みユーザーの初回表示時に自動起動(localStorage `truss-user-tour-seen-v1`)、プロフィールメニューの「使い方ガイド」から再実行可。
- **users.role**: migration 032 で `role` カラム追加(member/officer/vice_president/president/advisor、CHECK 制約+自己変更防止トリガー)。`packages/core/src/roles.ts`(定義・ラベル)、`updateUserRoleRow`、DataContext `setUserRole`、管理画面 MemberDetailModal に役職 Select、名簿・プロフィール・詳細モーダルに `RoleBadge` 表示。現段階は肩書きのみで RLS 権限分岐なし(将来 admin_accounts を role に統合する方針)。
- **「他の所属団体」ナッジ**: approved かつ未入力のユーザーへホームに dismissible バナー(`truss-organizations-nudge-dismissed-v1`)、プロフィールへ誘導。
- **PWA 導線**: `app/manifest.ts` 追加、`public/icons/`(192/512/maskable/180 を Truss.svg から生成)、apple-touch-icon 差し替え。`PwaInstallBanner` で Android は beforeinstallprompt、iOS は手順ダイアログ。standalone 起動時・非対応環境では非表示。
- 検証: `tsc --noEmit` 通過、`next build` 成功(`/manifest.webmanifest` 生成確認)。新規ファイルの lint エラー 0(effect 内 setState は `useLocalStorageDismissal` フックで解消)。
- 残課題: マイグレーション **031・032 が未適用**(Dashboard SQL Editor で手動実行)。ツアー・PWA バナーの実機確認(特に iOS Safari)。role 権限マトリクスの設計は今後。

## 2026-08-03 01:05 ツアーの「戻る」ボタンを削除

- ユーザーフィードバック(誤タップ懸念・戻る需要が薄い)により、ガイドツアーを「次へ」のみの一方向に変更(`showButtons: ['next', 'close']`)。
- 「戻る」がグレーにならず「次へ」と同色になっていた CSS 特異性バグも、ボタン削除により解消(該当 CSS は削除)。
- 検証: `tsc --noEmit` 通過。preview で要再確認。

## 2026-08-03 01:35 ツアー操作改善・チャット刷新(モバイル準拠)・メールタブ直行

- **ツアー**: モーダル外タップを「次へ」に変更(`overlayClickBehavior: 'nextStep'`)。「×」を廃止し、最終ステップ以外に明示的な「スキップ」テキストボタンを追加(`onPopoverRender` でカスタムボタン挿入)。
- **チャット(MessagesPage)**: カテゴリチップ(問い合わせ/イベント相談/入会について/困りごと)を撤去し送信時の category 付与も停止(モバイル TrussEmbassyScreen に追従。DB の category 列と過去データは温存)。モバイルの添付メニューを参考に「+」ボタン → 写真/ファイル/イベント/思い出 のパネルを実装。イベント・ギャラリー写真のメンション送信に対応(`sendMessage` に mention オプション追加)。ボイスメッセージは方針どおり web では送信非対応(受信再生は既存のまま)。
- **下部ナビのメールタブ**: 通知一覧を挟まず運営チャットへ直行に変更(通知はヘッダーのベルに集約)。NotificationsPage 自体はベルの「すべての通知を見る」から引き続き到達可能。
- 検証: `tsc --noEmit`・`next build` 通過。新規 lint エラー 0(残存2件は変更前からの既存)。
- 残課題: preview での動作確認(添付メニュー・メンション送信・タブ直行)。運営側(AdminChatMessages)のカテゴリ表示は温存(過去メッセージ用)。

## 2026-08-03 02:05 下部ナビのメッセージアイコンを吹き出しに変更

- 下部ナビ5番目のアイコンを `Mail`(封筒) → `MessageCircle`(吹き出し)に変更。チャットへ直行する導線になったため見た目を実態に合わせた。ナビの他4アイコンと同じ lucide の線画スタイルで統一。
- `Mail` は通知ポップオーバーのアイコン対応表で引き続き使用のため import は維持。
- 検証: `tsc --noEmit`・`next build` 通過。

## 2026-08-03 03:20 チャット画面のずれ修正・通知一覧ページ廃止・PWA案内をモバイル限定に

- **チャット画面のずれ修正**: Dashboard の `<main>` に `min-h-screen` が無条件で付いており、チャット時に「ヘッダー64px + 100vh」でドキュメントが縦に伸び、ページ全体が約60pxスクロール可能になっていた。初回の `scrollIntoView` がそのぶん window ごとスクロールさせ、チャットヘッダー(← 運営管理者)が隠れて下に空白が出る症状の原因。`min-h-screen` をチャット以外にのみ適用するよう変更。
- **通知一覧ページ(NotificationsPage)を廃止**: メッセージタブは運営チャット専用に。チャットの戻るボタンはホームへ。ベルのポップオーバーから「すべての通知を見る」ボタンを削除(ポップオーバー自体が全件スクロール表示のため)。会費ダイアログの「運営にメッセージを送る」もチャット直行に統一。`Page` 型・復元用 validPages から `notifications` を除去し、`NotificationsPage.tsx` を削除。
- 併せて、通知クリック時に `linkPage === 'admin-chat'` だと相手情報が未設定のまま遷移し空画面になり得たのを、チャット系は共通の `handleAdminChatClick()` を通すよう修正。
- NotificationsPage のみが読んでいた `interestedPosts` state が不要になったため削除。`BulletinBoard` の `onInterested` を optional 化。
- **PWA案内をモバイル限定に**: デスクトップ Chrome でも `beforeinstallprompt` が発火し「ホーム画面に追加できます」が出ていたため、主ポインタが粗い端末(`(pointer: coarse)`)のみ表示するよう変更。
- 検証: `tsc --noEmit`・`next build` 通過。新規 lint エラー 0。
- 残課題: preview でチャット表示位置・戻る導線・PWAバナー非表示(PC)を確認。チャット表示中は下部ナビが隠れる仕様のままなので、他タブへは戻るボタン経由になる。

## 2026-08-03 03:45 チャットの戻るボタン廃止・下部ナビ常時表示・運営画面のUUID非表示

- **チャットの戻るボタンを廃止**: 下部ナビから各画面へ移動できるため不要。`MessagesPage` の `onBack` prop と Dashboard の `handleBackFromMessages`・未使用だった `selectedMessage` state も削除。
- **下部ナビをチャット中も常時表示**: チャット時は Dashboard ルートを `h-dvh flex flex-col overflow-hidden` にし、ヘッダー(shrink-0) / チャット本体(flex-1 min-h-0) / ナビ(shrink-0・非 fixed)を縦フレックスで敷き詰める構成へ変更。マジックナンバー(100vh-4rem 等)に依存せず高さが決まるようになり、前回の「ずれ」も構造的に発生しなくなる。`h-dvh` によりモバイルのアドレスバー分の食い込みも回避。他画面は従来どおり(ページスクロール + fixed ナビ)。
- `MessagesPage` のルート高さは `h-[calc(100vh-64px)]` → `h-full`(親の flex-1 に追従)。
- **運営画面から UUID を非表示**: メンバー一覧(PC/モバイル両カード)の `ID: <uuid>` を学籍番号表示に置き換え(未登録なら非表示)。メンバー詳細モーダルからも ID 行を削除(学生番号は別項目で既に表示済み)。
- 検証: `tsc --noEmit`・`next build` 通過。新規 lint エラー 0。
- 残課題: preview でチャット時のナビ表示・入力欄の重なり・運営画面の一覧表示を確認。

## 2026-08-03 04:10 チャットを開くたびに最新まで高速スクロールする挙動を修正

- 症状: チャットを開くと一瞬だけ過去のメッセージ（先頭付近）が表示され、そこから最新まで高速スクロールする様子が毎回見えていた。
- 原因: 最新メッセージへの追従が常に `behavior: 'smooth'`（モバイルは `animated: true`）で、開いた直後の「先頭 → 最下部」の大きな移動までアニメーションしていたため。
- Web (`MessagesPage`): `useEffect` → `useLayoutEffect` に変更し描画前にスクロールを済ませることで、先頭が一瞬見える現象自体をなくした。加えてメッセージ一覧コンテナに ref を付け、更新後の最下部からの距離が 240px 未満のとき（＝開いたまま新着が届いたとき）だけ `smooth`、それ以外（＝画面を開いた直後）は即時移動に切り替え。
- モバイル (`TrussEmbassyScreen`): `onContentSizeChange` の `scrollToEnd` を、初回のみ `animated: false`、2回目以降は `animated: true` に変更。
- 検証: web/mobile とも `tsc --noEmit` 通過、`next build` 通過。新規 lint エラー 0。
- 残課題: preview（および Expo）で開いた瞬間に最新位置で表示されることを確認。添付画像の署名付きURL読み込みでコンテンツ高さが後から伸びるケースは従来どおり（今回の変更で悪化はしない）。

## 2026-08-03 05:00 いいね/興味ありの二重加算・状態消失を修正、カレンダーをスワイプ対応

- **ギャラリーのいいねが増え続けるバグを修正**: 原因は2つ重なっていた。(1) `likeGalleryPhotoRow` が `gallery_photos.likes` を無条件に +1 するだけで、解除時に減算する処理が無かった。(2) 表示側が `photo.likes + (isLiked ? 1 : 0)` とローカル分を上乗せしていたため、サーバ値と二重計上され見かけ +2 になっていた。結果、1往復ごとに DB のカウントが +1 ずつ増え続けていた。
- 実は `gallery_photo_likes` テーブル・RLS ポリシー・`increment_photo_likes`/`decrement_photo_likes` RPC は初期スキーマから存在しており、アプリ側が使っていなかっただけだった。**新規マイグレーションは不要**。`toggleGalleryPhotoLikeForUser()` を追加し、`event_likes` / `board_post_interests` と同じ「中間テーブル + RPC」方式に統一。表示の上乗せも撤去。
- **イベントのいいね状態がリロードで消える問題も修正**: `likedEvents` は LegacyApp のローカル state のみで DB から復元していなかったため、再読み込み後にハートが未いいね表示になり、そこを押すと既存の行が削除されてカウントが減る状態だった。`queryLikedEventIds()` を追加し DataContext で保持するよう変更。
- **反応系をすべて楽観的更新に**: ギャラリーのいいね・掲示板の興味あり・イベントのいいねは、通信完了+全件再取得を待ってから画面に反映していたため反応が鈍かった。先に画面を更新してから通信し、失敗時のみ元に戻す方式へ変更。
- 掲示板の手アイコンに ON/OFF 表示（自分が押していれば塗りつぶし+ブルー）を追加。`queryInterestedBoardPostIds()` を追加し DataContext で保持。
- **イベントカレンダーを横スワイプ対応**: 指の動きに追従して平行移動し、56px 以上で「スライドアウト → 月切替 → 反対側からスライドイン」(各200ms)。縦方向優勢の場合はページスクロールを優先。スワイプ直後のクリックでイベント詳細が開かないよう抑止。左右の矢印ボタンも同じアニメーションを通すよう統一。
- 検証: `tsc --noEmit`・`next build` 通過。新規 lint エラー 0。
- 残課題: preview で連打時のカウント整合・掲示板/イベントのハート即時反映・カレンダーのスワイプ操作感を確認。既存の `gallery_photos.likes` には過去の水増し分が残っている（誰が押したか復元できないため据え置き。必要なら手動リセット）。

## 2026-08-03 13:40 反応カウントが追従しない問題と、手アイコンの塗り潰し崩れを修正

- **数字が正しく追従しない問題**: 楽観更新で即座に数字を変えても、裏で走る全件再取得(realtime 由来・掲示板は明示的な `await fetchBoardPosts()`)が「サーバ側のカウンタがまだ更新される前の値」で画面を上書きしていた。カウンタ列(`events.likes`/`board_posts.interested`/`gallery_photos.likes`)の更新は中間テーブルへの書き込みとは別トランザクションで数百ms遅れて確定するため、その隙間に再取得が挟まると古い数字に戻り、以降イベントが来ないと戻らないままになる。画面ごとに挙動が違ったのは、掲示板=直後に明示的再取得、ギャラリー=realtime のみ、イベント=localStorage キャッシュ(TTL60秒)経由、と上書き経路が異なっていたため。
- 対策として DataContext に「未確定の反応差分」(`pendingCountDeltas`)を導入。トグル開始時に差分を積み、サーバ応答が返るまでの間は全件再取得の結果にこの差分を重ねてから state に入れる(`withPendingDeltas`)。応答後は差分を戻してサーバ値を正とする。3画面とも同じ経路になり、キャッシュ読み出し時にも適用される。連打しても辻褄が合うよう差分は加算で管理。
- 掲示板の余分な `await fetchBoardPosts()` を削除(realtime で十分)。
- **手のアイコンの塗り潰し崩れを修正**: lucide の `Hand` は線画アイコンなので `fill-current` を当てると指の間まで塗られて塊に見えていた。塗りのグリフである Font Awesome の `faHand` に差し替え、ON/OFF は色 + 薄い背景ピルで表現(グローバル規約のアイコン方針にも沿う)。
- ギャラリーのハートに押下時の縮小と、いいね時のわずかな拡大を追加。
- 検証: `tsc --noEmit`・`next build` 通過。新規 lint エラー 0(既存3件のみ)。
- 残課題: preview で3画面の数字の追従とハート/手の見た目を確認。
