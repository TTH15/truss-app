import type { Language } from "@truss/core";

/** users.grade の値 → 表示ラベル（InitialRegistration の選択肢と同じ体系） */
export const GRADE_OPTIONS: Array<{ value: string; ja: string; en: string }> = [
  { value: '1', ja: 'B1 (学部1年)', en: 'B1 (1st Year)' },
  { value: '2', ja: 'B2 (学部2年)', en: 'B2 (2nd Year)' },
  { value: '3', ja: 'B3 (学部3年)', en: 'B3 (3rd Year)' },
  { value: '4', ja: 'B4 (学部4年)', en: 'B4 (4th Year)' },
  { value: 'M1', ja: 'M1 (修士1年)', en: 'M1 (Master 1st Year)' },
  { value: 'M2', ja: 'M2 (修士2年)', en: 'M2 (Master 2nd Year)' },
  { value: 'D1', ja: 'D1 (博士1年)', en: 'D1 (Doctoral 1st Year)' },
  { value: 'D2', ja: 'D2 (博士2年)', en: 'D2 (Doctoral 2nd Year)' },
  { value: 'D3', ja: 'D3 (博士3年)', en: 'D3 (Doctoral 3rd Year)' },
  { value: 'other', ja: 'その他', en: 'Other' },
];

export const gradeLabel = (value: string | undefined, language: Language) => {
  const option = GRADE_OPTIONS.find((o) => o.value === value);
  return option ? option[language] : value || '-';
};


export const PROFILE_LANGUAGE_OPTIONS = [
  { value: 'Japanese', ja: '日本語', en: 'Japanese', aliases: ['日本語', 'Japanese'] },
  { value: 'English', ja: '英語', en: 'English', aliases: ['英語', 'English'] },
  { value: 'Chinese', ja: '中国語', en: 'Chinese', aliases: ['中国語', '中文', 'Chinese'] },
  { value: 'Korean', ja: '韓国語', en: 'Korean', aliases: ['韓国語', '한국어', 'Korean'] },
  { value: 'Vietnamese', ja: 'ベトナム語', en: 'Vietnamese', aliases: ['ベトナム語', 'Vietnamese'] },
  { value: 'Thai', ja: 'タイ語', en: 'Thai', aliases: ['タイ語', 'Thai'] },
  { value: 'Indonesian', ja: 'インドネシア語', en: 'Indonesian', aliases: ['インドネシア語', 'Indonesian'] },
  { value: 'Spanish', ja: 'スペイン語', en: 'Spanish', aliases: ['スペイン語', 'Spanish'] },
  { value: 'French', ja: 'フランス語', en: 'French', aliases: ['フランス語', 'French'] },
  { value: 'German', ja: 'ドイツ語', en: 'German', aliases: ['ドイツ語', 'German'] },
  { value: 'Portuguese', ja: 'ポルトガル語', en: 'Portuguese', aliases: ['ポルトガル語', 'Portuguese'] },
  { value: 'Russian', ja: 'ロシア語', en: 'Russian', aliases: ['ロシア語', 'Russian'] },
];

export function profileLanguageOption(value: string) {
  return PROFILE_LANGUAGE_OPTIONS.find(option => option.aliases.some(alias => alias.toLowerCase() === value.trim().toLowerCase()));
}

export function profileLanguageLabel(value: string, language: Language): string {
  return profileLanguageOption(value)?.[language] ?? value;
}

export function uniqueProfileLanguages(values: string[]): string[] {
  const seen = new Set<string>();
  return values.map(value => value.trim()).filter(value => {
    if (!value) return false;
    const key = profileLanguageOption(value)?.value ?? value.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
