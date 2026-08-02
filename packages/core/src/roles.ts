/**
 * ユーザーの役職(role)
 *
 * users.role カラムに対応。現段階では「肩書き」(バッジ表示・名簿)として使い、
 * 権限制御(RLS の分岐)は将来段階的に追加する。
 * 将来的には admin_accounts による運営ログインを role ベースの権限に統合していく方針。
 */

export const USER_ROLES = [
  "member",
  "officer",
  "vice_president",
  "president",
  "advisor",
] as const;

export type UserRole = (typeof USER_ROLES)[number];

export const DEFAULT_USER_ROLE: UserRole = "member";

export const USER_ROLE_LABELS: Record<UserRole, { ja: string; en: string }> = {
  member: { ja: "部員", en: "Member" },
  officer: { ja: "役職者", en: "Officer" },
  vice_president: { ja: "副代表", en: "Vice President" },
  president: { ja: "代表", en: "President" },
  advisor: { ja: "顧問教員", en: "Advisor" },
};

/** バッジ表示など「部員以外だけ目立たせたい」場面の判定 */
export function isPrivilegedRole(role: UserRole | undefined): boolean {
  return !!role && role !== "member";
}
