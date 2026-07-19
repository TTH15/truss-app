import React from 'react';
import { splitTextWithUrls } from '@truss/core';

/**
 * 本文中のURL（Google Mapsのリンクなど）を自動でリンク化する。
 * 改行文字はそのまま残すので、呼び出し側は `whitespace-pre-wrap` 等と組み合わせて
 * 改行の表示を行うこと（改行によってリンクが分断されることはない）。
 */
export function linkifyText(text: string): React.ReactNode[] {
  return splitTextWithUrls(text).map((segment, index) => {
    if (segment.type === 'text') return segment.value;
    return (
      <a
        key={`linkify-${index}`}
        href={segment.value}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-600 underline break-all hover:text-blue-800"
      >
        {segment.value}
      </a>
    );
  });
}
