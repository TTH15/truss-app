# 作業ログ

## 2026-08-02 14:19 電話番号をハイフンなしに統一

- `packages/core/src/phone.ts` を新規追加: `normalizePhone()`（ハイフン・空白・括弧除去、全角→半角、先頭 `+` 保持）と `isValidPhone()`（正規化後 8〜15 桁）。`index.ts` から export。
- 保存経路2箇所で正規化を適用: 初期登録の行ビルダー（`packages/core/src/db/initial-registration.ts`）と `AuthContext.updateUser`（DB・ローカル state 両方に正規化後の値が入る）。
- `InitialRegistration` のローカルバリデーションを `isValidPhone` に置換。プレースホルダーを `090-1234-5678` → `09012345678` に変更（InitialRegistration / ProfileRegistration）。
- 既存データ用マイグレーション `supabase/migrations/031_truss_phone_normalize.sql` を追加（冪等な UPDATE）。
- 検証: `tsc --noEmit` 通過。lint エラーは変更前から存在する既存のもの（`react-hooks/set-state-in-effect`）のみ。正規化ロジックは node で動作確認済み。
- 残課題: マイグレーション 031 は未適用。Supabase Dashboard の SQL Editor で手動実行が必要。
