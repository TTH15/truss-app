import type { User } from "../domain/types/app";

/**
 * イベント参加制限などに使う「プロフィールが実質そろったか」。
 * ProfilePage 保存時・Auth 更新時に DB の profile_completed と同期する。
 */
export function isProfileCompleteForParticipation(user: Pick<
  User,
  | "category"
  | "name"
  | "nickname"
  | "furigana"
  | "languages"
  | "birthCountry"
  | "country"
  | "phone"
  | "grade"
  | "major"
>): boolean {
  if (user.category === "exchange") return true;

  const country = (user.birthCountry ?? user.country ?? "").trim();
  const langs = user.languages ?? [];
  const hasLang = langs.some((l) => String(l).trim().length > 0);
  return (
    Boolean(user.name?.trim()) &&
    Boolean(user.nickname?.trim()) &&
    Boolean(user.furigana?.trim()) &&
    hasLang &&
    Boolean(country) &&
    Boolean(user.phone?.trim()) &&
    Boolean(user.grade?.trim()) &&
    Boolean(user.major?.trim())
  );
}
