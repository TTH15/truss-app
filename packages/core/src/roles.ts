/**
 * ユーザーの役職(role)
 *
 * users.role カラムに対応。現段階では「肩書き」(バッジ表示・名簿)として使い、
 * 権限制御(RLS の分岐)は将来段階的に追加する。
 * 将来的には admin_accounts による運営ログインを role ベースの権限に統合していく方針。
 */

/** UI（メンバー詳細の役職セレクト）から選べる役職 */
export const USER_ROLES = [
  "non_member",
  "member",
  "officer",
  "vice_president",
  "president",
  "advisor",
] as const;

/**
 * システム管理者（アプリの開発・保守者）。代表と同じ全権限を持つ。
 * UI からは付与・変更できず、SQL でのみ設定する（migration 045）
 */
export const SYSTEM_ROLE_SE = "se" as const;

export type UserRole = (typeof USER_ROLES)[number] | typeof SYSTEM_ROLE_SE;

/** 新規登録者は年会費未払いなので非会員から始まる */
export const DEFAULT_USER_ROLE: UserRole = "non_member";

export const USER_ROLE_LABELS: Record<UserRole, { ja: string; en: string }> = {
  non_member: { ja: "非会員", en: "Non-member" },
  member: { ja: "部員", en: "Member" },
  officer: { ja: "役職者", en: "Officer" },
  vice_president: { ja: "副代表", en: "Vice President" },
  president: { ja: "代表", en: "President" },
  advisor: { ja: "顧問教員", en: "Advisor" },
  se: { ja: "SE", en: "SE" },
};

/**
 * `non_member` ⇄ `member` は年会費の支払い状況（`fee_paid`）に連動して
 * DB トリガーが自動更新する（migration 035）。運営が手で選ぶ意味があるのは役職側だけ。
 */
export function isFeeDerivedRole(role: UserRole | undefined): boolean {
  return role === "non_member" || role === "member";
}

/** バッジ表示など「部員以外だけ目立たせたい」場面の判定 */
export function isPrivilegedRole(role: UserRole | undefined): boolean {
  return !!role && role !== "member" && role !== "non_member";
}

/**
 * 上位役職（代表・副代表・顧問・SE）。保護文書（規約・ポリシー等）の改定はここに限定される。
 * DB 側の判定は is_senior_admin_safe()（migration 042 → 045。両者は同じ集合を指すこと）
 */
export function isSeniorRole(role: UserRole | undefined): boolean {
  return role === "president" || role === "vice_president" || role === "advisor" || role === "se";
}

/**
 * 名簿で役職者を上に出すときの序列（小さいほど先頭）。
 * 代表 → 副代表 → 役職者 → 顧問教員 の順。部員・非会員は同列で、通常の並び替えに従う。
 */
export const ROLE_LIST_PRIORITY: Record<UserRole, number> = {
  president: 0,
  vice_president: 1,
  officer: 2,
  advisor: 3,
  se: 4,
  member: 10,
  non_member: 10,
};
