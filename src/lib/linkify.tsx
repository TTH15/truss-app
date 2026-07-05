import React from 'react';

const URL_PATTERN = /https?:\/\/[^\s<>"']+/g;

const CLOSING_TO_OPENING: Record<string, string> = {
  ')': '(',
  '）': '（',
  ']': '[',
  '」': '「',
  '』': '『',
  '】': '【',
};
const ALWAYS_TRIM_TRAILING = new Set(['.', ',', '!', '?', ';', ':', '、', '。']);

// 文末の句読点や閉じ括弧は誤ってURLに含めない。ただしURL内で開き括弧と対応している閉じ括弧は残す
function splitTrailingPunctuation(url: string): [string, string] {
  let core = url;
  let trailing = '';

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

/**
 * 本文中のURL（Google Mapsのリンクなど）を自動でリンク化する。
 * 改行文字はそのまま残すので、呼び出し側は `whitespace-pre-wrap` 等と組み合わせて
 * 改行の表示を行うこと（改行によってリンクが分断されることはない）。
 */
export function linkifyText(text: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;
  let key = 0;

  for (const match of text.matchAll(URL_PATTERN)) {
    const start = match.index ?? 0;
    if (start > lastIndex) {
      nodes.push(text.slice(lastIndex, start));
    }
    const [core, trailing] = splitTrailingPunctuation(match[0]);
    if (core) {
      nodes.push(
        <a
          key={`linkify-${key++}`}
          href={core}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 underline break-all hover:text-blue-800"
        >
          {core}
        </a>
      );
    }
    if (trailing) nodes.push(trailing);
    lastIndex = start + match[0].length;
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }
  return nodes;
}
