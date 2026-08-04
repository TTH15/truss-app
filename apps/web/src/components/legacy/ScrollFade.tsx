import { useCallback, useEffect, useRef, useState, type ReactNode, type RefObject, type UIEvent } from 'react';

/**
 * スクロールできる領域の端をぼかして「まだ続きがある」ことを示すコンテナ。
 *
 * 上下それぞれ、その方向にまだ内容があるときだけ出す。端まで来たら消えるので、
 * 「もう終わり」も同時に伝わる。
 */
export function ScrollFade({
  children,
  className = '',
  /** ぼかしの色。内容の背景色と合わせる */
  fadeColor = '#ffffff',
  fadeHeight = 28,
  /** 呼び出し側でもスクロール要素を触りたい場合に渡す（自動スクロール等） */
  scrollRef: externalRef,
}: {
  children: ReactNode;
  className?: string;
  fadeColor?: string;
  fadeHeight?: number;
  scrollRef?: RefObject<HTMLDivElement | null>;
}) {
  const internalRef = useRef<HTMLDivElement>(null);
  const scrollRef = externalRef ?? internalRef;
  const [showTop, setShowTop] = useState(false);
  const [showBottom, setShowBottom] = useState(false);

  const measure = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const remaining = el.scrollHeight - el.scrollTop - el.clientHeight;
    setShowTop(el.scrollTop > 4);
    setShowBottom(remaining > 4);
  }, []);

  // 内容や高さが変わったときも測り直す（一覧の読み込み完了・ウィンドウのリサイズなど）。
  // 監視のコールバックから状態を更新する形にして、描画中の setState を避ける
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(() => measure());
    observer.observe(el);
    if (el.firstElementChild) observer.observe(el.firstElementChild);
    return () => observer.disconnect();
  }, [measure]);

  const handleScroll = (event: UIEvent<HTMLDivElement>) => {
    const el = event.currentTarget;
    const remaining = el.scrollHeight - el.scrollTop - el.clientHeight;
    setShowTop(el.scrollTop > 4);
    setShowBottom(remaining > 4);
  };

  return (
    <div className="relative h-full min-h-0">
      <div ref={scrollRef} onScroll={handleScroll} className={`h-full overflow-y-auto ${className}`}>
        <div>{children}</div>
      </div>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 transition-opacity duration-200"
        style={{
          height: fadeHeight,
          opacity: showTop ? 1 : 0,
          background: `linear-gradient(to bottom, ${fadeColor}, transparent)`,
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 transition-opacity duration-200"
        style={{
          height: fadeHeight,
          opacity: showBottom ? 1 : 0,
          background: `linear-gradient(to top, ${fadeColor}, transparent)`,
        }}
      />
    </div>
  );
}
