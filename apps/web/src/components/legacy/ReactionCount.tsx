import { useEffect, useRef, useState } from 'react';

/**
 * いいね・興味ありの件数表示。
 * 値が変わったときだけ、新しい数字が下から入れ替わるように見せる。
 * (初回表示ではアニメーションさせない)
 */
export function ReactionCount({ value, className = '' }: { value: number; className?: string }) {
  const [animating, setAnimating] = useState(false);
  const previousRef = useRef(value);

  useEffect(() => {
    if (previousRef.current === value) return;
    previousRef.current = value;
    setAnimating(true);
  }, [value]);

  return (
    <span className={`inline-block overflow-hidden ${className}`}>
      <span
        key={value}
        className={animating ? 'inline-block animate-truss-count-roll' : 'inline-block'}
        onAnimationEnd={() => setAnimating(false)}
      >
        {value}
      </span>
    </span>
  );
}
