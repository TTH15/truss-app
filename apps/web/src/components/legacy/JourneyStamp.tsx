import { useId } from 'react';
import { getEventIconDefinition } from '@truss/core';
import type { Event } from '@truss/core';

/**
 * 参加したイベント1件を表す「スタンプ」。
 *
 * 表示要素（イベント名・日付・アイコン・色）はすべて運営がイベント作成時に入力済みのものを使うため、
 * スタンプ専用の入稿や編集画面は不要。全体を1つの SVG として描くので、
 * どのサイズでも文字が切れず、比率も崩れない。
 *
 * 名前は円弧に沿わせる都合で英語表記に固定する（和文だと字送りが不揃いになりやすいため）。
 */

/** 2026-07-21 → 2026.7.21（スタンプの見た目に合わせて単位を省く） */
function formatStampDate(date: string): string {
  const [y, m, d] = date.split('-');
  if (!y || !m || !d) return date;
  return `${y}.${Number(m)}.${Number(d)}`;
}

const OUTER_R = 47;
const INNER_R = 40;
/** 名前を載せる上側の弧 */
const TITLE_ARC = 'M 14,50 A 36,36 0 0 1 86,50';
/** 日付を載せる下側の弧（左→右に読める向き） */
const DATE_ARC = 'M 17,50 A 33,33 0 0 0 83,50';

export function JourneyStamp({
  event,
  size = 128,
  pressing = false,
  muted = false,
}: {
  event: Event;
  size?: number;
  /** 押印アニメーションを再生する */
  pressing?: boolean;
  /** 未獲得（これから押される）状態として控えめに描く */
  muted?: boolean;
}) {
  const gradientId = useId();
  const color = muted ? '#B7B2A6' : event.eventColor || '#49B1E4';
  const rawName = (event.titleEn || event.title).toUpperCase();
  // 長い名前は字形を潰さず文字サイズで収める（spacingAndGlyphs だと字が縦長に歪んで読めなくなる）
  const name = rawName.length > 40 ? `${rawName.slice(0, 39)}…` : rawName;
  const fontSize = name.length <= 14 ? 8 : name.length <= 24 ? 6.8 : name.length <= 34 ? 5.8 : 5.2;
  // 弧に沿って字間を広げる（スタンプらしさ）。長い名前では詰まって弧に収まる
  const titleLength = Math.min(104, Math.max(42, name.length * fontSize * 0.78));
  const icon = getEventIconDefinition(event.eventIconKey);
  const [iconWidth, iconHeight, , , iconPath] = icon.icon;
  const pathData = Array.isArray(iconPath) ? iconPath[0] : iconPath;

  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className={`shrink-0 ${pressing ? 'animate-truss-stamp' : ''}`}
      role="img"
      aria-label={`${name} ${formatStampDate(event.date)}`}
    >
      <title>{`${name} / ${formatStampDate(event.date)}`}</title>
      <defs>
        <path id={`${gradientId}-title`} d={TITLE_ARC} fill="none" />
        <path id={`${gradientId}-date`} d={DATE_ARC} fill="none" />
      </defs>

      <circle cx="50" cy="50" r={OUTER_R} fill="none" stroke={color} strokeWidth="2.6" opacity="0.9" />
      <circle cx="50" cy="50" r={INNER_R} fill="none" stroke={color} strokeWidth="0.8" opacity="0.5" />

      <text fill={color} fontSize={fontSize} fontWeight="600">
        <textPath
          href={`#${gradientId}-title`}
          startOffset="50%"
          textAnchor="middle"
          textLength={titleLength}
          lengthAdjust="spacing"
        >
          {name}
        </textPath>
      </text>

      <svg x="34" y="36" width="32" height="28" viewBox={`0 0 ${iconWidth} ${iconHeight}`} preserveAspectRatio="xMidYMid meet">
        <path d={pathData} fill={color} />
      </svg>

      <text fill={color} fontSize="7" opacity="0.9">
        <textPath href={`#${gradientId}-date`} startOffset="50%" textAnchor="middle">
          {formatStampDate(event.date)}
        </textPath>
      </text>
    </svg>
  );
}

/** まだ押されていない枠（Passport の空きスロット） */
export function EmptyStampSlot({ size = 128 }: { size?: number }) {
  return (
    <div
      className="shrink-0 rounded-full border-2 border-dashed border-[#D6D1C4]"
      style={{ width: size, height: size }}
    />
  );
}
