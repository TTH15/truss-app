// 実体は @platform/utils へ昇格(ADR-0002)。既存 import 互換のための再エクスポート。
// Language 型は ./types/app のものが正(共有側は互換の "ja" | "en")。
export {
  parseMessageDate,
  toDateKey,
  formatDateLabel,
  formatMessageTime,
  formatRelativeListTime,
  // 昇格時に汎用名へ改名(イベントは業務名詞のため)。従来名で公開する。
  formatIsoDateJa as formatEventDateNoHyphen,
} from "@platform/utils";
