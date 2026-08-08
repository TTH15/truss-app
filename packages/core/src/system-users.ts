/**
 * システムユーザー（実在の人ではない users 行）の判定。
 *
 * 例: 運営受信箱「Truss運営事務局」（staff-inbox@system.truss.internal, migration 024）。
 * 会員→運営のチャット宛先を個人アカウントから切り離すための行で、auth_id が NULL のため
 * ログインは不可能だが、users には並ぶ。名簿など「人の一覧」には出さないこと。
 */
export const SYSTEM_USER_EMAIL_DOMAIN = "@system.truss.internal";

export function isSystemUser(user: { email: string }): boolean {
  return user.email.endsWith(SYSTEM_USER_EMAIL_DOMAIN);
}
