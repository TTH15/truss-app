/**
 * OAuth・メール確認リンクの戻り先などに使う公開オリジン（スキーム + ホスト、パスなし）。
 *
 * - Vercel 本番などで URL を固定したい場合: `NEXT_PUBLIC_APP_URL`（末尾スラッシュなし）
 * - 未設定時: ブラウザでは `window.location.origin`（ローカルは http://localhost:3000）
 */
export function getAppOrigin(): string {
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, '');
  if (fromEnv) return fromEnv;
  if (typeof window !== 'undefined') return window.location.origin;
  return '';
}
