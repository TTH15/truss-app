/**
 * 本文中のURLを検出するための純粋な文字列処理(Web/モバイル共通)。
 * JSX化はプラットフォーム側(web: <a>, mobile: <Text onPress>)で行う。
 */

const URL_PATTERN = /https?:\/\/[^\s<>"']+/g;

const CLOSING_TO_OPENING: Record<string, string> = {
  ")": "(",
  "）": "（",
  "]": "[",
  "」": "「",
  "』": "『",
  "】": "【",
};
const ALWAYS_TRIM_TRAILING = new Set([".", ",", "!", "?", ";", ":", "、", "。"]);

// 文末の句読点や閉じ括弧は誤ってURLに含めない。ただしURL内で開き括弧と対応している閉じ括弧は残す
function splitTrailingPunctuation(url: string): [string, string] {
  let core = url;
  let trailing = "";

  while (core.length > 0) {
    const ch = core[core.length - 1];
    const opening = CLOSING_TO_OPENING[ch];
    if (opening) {
      const opens = core.split(opening).length - 1;
      const closes = core.split(ch).length - 1;
      if (opens >= closes) break;
      trailing = ch + trailing;
      core = core.slice(0, -1);
      continue;
    }
    if (ALWAYS_TRIM_TRAILING.has(ch)) {
      trailing = ch + trailing;
      core = core.slice(0, -1);
      continue;
    }
    break;
  }
  return [core, trailing];
}

export type TextSegment = { type: "text"; value: string } | { type: "url"; value: string };

/** テキストをURL部分とそれ以外に分割する。改行はtextセグメント内にそのまま残る */
export function splitTextWithUrls(text: string): TextSegment[] {
  const segments: TextSegment[] = [];
  let lastIndex = 0;

  for (const match of text.matchAll(URL_PATTERN)) {
    const start = match.index ?? 0;
    if (start > lastIndex) {
      segments.push({ type: "text", value: text.slice(lastIndex, start) });
    }
    const [core, trailing] = splitTrailingPunctuation(match[0]);
    if (core) segments.push({ type: "url", value: core });
    if (trailing) segments.push({ type: "text", value: trailing });
    lastIndex = start + match[0].length;
  }

  if (lastIndex < text.length) {
    segments.push({ type: "text", value: text.slice(lastIndex) });
  }
  return segments;
}
