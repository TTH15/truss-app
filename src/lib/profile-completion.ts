import type { Language, User } from "../domain/types/app";

type ProfileCheckUser = Pick<
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
>;

type ProfileField =
  | "name"
  | "nickname"
  | "furigana"
  | "languages"
  | "country"
  | "phone"
  | "grade"
  | "major";

const FIELD_LABELS: Record<ProfileField, Record<Language, string>> = {
  name: { ja: "氏名", en: "Full Name" },
  nickname: { ja: "ニックネーム", en: "Nickname" },
  furigana: { ja: "フリガナ", en: "Furigana" },
  languages: { ja: "話せる言語", en: "Languages" },
  country: { ja: "出身国", en: "Birth Country" },
  phone: { ja: "電話番号", en: "Phone" },
  grade: { ja: "学年", en: "Grade" },
  major: { ja: "学部・学科", en: "Major" },
};

/**
 * イベント参加制限などに使う「プロフィールが実質そろったか」。
 * ProfilePage 保存時・Auth 更新時に DB の profile_completed と同期する。
 */
export function getMissingProfileFields(user: ProfileCheckUser): ProfileField[] {
  if (user.category === "exchange") return [];
  const country = (user.birthCountry ?? user.country ?? "").trim();
  const hasLang = (user.languages ?? []).some((l) => String(l).trim().length > 0);
  const missing: ProfileField[] = [];
  if (!user.name?.trim()) missing.push("name");
  if (!user.nickname?.trim()) missing.push("nickname");
  if (!user.furigana?.trim()) missing.push("furigana");
  if (!hasLang) missing.push("languages");
  if (!country) missing.push("country");
  if (!user.phone?.trim()) missing.push("phone");
  if (!user.grade?.trim()) missing.push("grade");
  if (!user.major?.trim()) missing.push("major");
  return missing;
}

export function isProfileCompleteForParticipation(user: ProfileCheckUser): boolean {
  return getMissingProfileFields(user).length === 0;
}

export function describeMissingProfileFields(
  missing: ProfileField[],
  language: Language
): string {
  return missing.map((f) => FIELD_LABELS[f][language]).join(language === "ja" ? "、" : ", ");
}
