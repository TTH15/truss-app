// 実体は @platform/utils へ昇格(ADR-0002)。既存 import 互換のための再エクスポート。
export { splitTextWithUrls } from "@platform/utils";
export type { TextSegment } from "@platform/utils";
