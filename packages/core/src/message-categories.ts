import type { Language } from "./types/app";
import type { MessageCategory } from "./types/app";

export const MESSAGE_CATEGORY_OPTIONS: { key: MessageCategory; labelJa: string; labelEn: string }[] = [
  { key: "inquiry", labelJa: "問い合わせ", labelEn: "Inquiry" },
  { key: "event_consult", labelJa: "イベント相談", labelEn: "Event Consultation" },
  { key: "membership", labelJa: "入会について", labelEn: "Membership" },
  { key: "trouble", labelJa: "困りごと", labelEn: "Trouble" },
];

export function getMessageCategoryLabel(
  category: MessageCategory | undefined,
  language: Language
): string | undefined {
  const found = MESSAGE_CATEGORY_OPTIONS.find((o) => o.key === category);
  if (!found) return undefined;
  return language === "ja" ? found.labelJa : found.labelEn;
}
