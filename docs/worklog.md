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
