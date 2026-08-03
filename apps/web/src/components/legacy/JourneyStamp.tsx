import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { getEventIconDefinition, formatEventDateNoHyphen } from '@truss/core';
import type { Event, Language } from '@truss/core';

/**
 * 参加したイベント1件を表す「スタンプ」。
 *
 * 表示に必要な要素（イベント名・日付・アイコン・色）はすべて運営がイベント作成時に
 * 入力済みのものを使うため、スタンプ専用の入稿や編集画面は不要。
 * 枠はコードで描くので、拡大しても崩れずアニメーションもそのまま効く。
 *
 * モバイルの Passport 画面（Journey Stamps）と同じ「参加登録済み = 押印済み」の定義。
 */
export function JourneyStamp({
  event,
  language,
  size = 128,
  pressing = false,
}: {
  event: Event;
  language: Language;
  size?: number;
  /** 押印アニメーションを再生する（参加登録の完了時のみ） */
  pressing?: boolean;
}) {
  const color = event.eventColor || '#49B1E4';
  const title = language === 'ja' ? event.title : (event.titleEn || event.title);
  const dateLabel = formatEventDateNoHyphen(event.date);

  return (
    <div
      className={`relative shrink-0 ${pressing ? 'animate-truss-stamp' : ''}`}
      style={{ width: size, height: size }}
      title={`${title} / ${dateLabel}`}
    >
      {/* 二重丸の枠。インクの乗りを表すため少しだけ透過させる */}
      <div
        className="absolute inset-0 rounded-full border-[3px] flex items-center justify-center"
        style={{ borderColor: color, opacity: 0.9 }}
      >
        <div
          className="absolute rounded-full border"
          style={{ inset: size * 0.06, borderColor: color, opacity: 0.55 }}
        />
        <div
          className="flex flex-col items-center justify-center text-center leading-tight"
          style={{ color, width: size * 0.74 }}
        >
          <span className="truncate w-full" style={{ fontSize: size * 0.1 }}>
            {title}
          </span>
          <FontAwesomeIcon
            icon={getEventIconDefinition(event.eventIconKey)}
            style={{ fontSize: size * 0.3, margin: `${size * 0.04}px 0` }}
          />
          <span style={{ fontSize: size * 0.088, opacity: 0.85 }}>{dateLabel}</span>
        </div>
      </div>
    </div>
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
