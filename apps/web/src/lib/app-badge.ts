/**
 * アプリアイコンのバッジ（未読件数）。
 *
 * Badging API はホーム画面に追加した PWA で動く。iOS も 16.4 以降の Safari で対応。
 * 非対応の環境では何もしない（例外も投げない）ので、呼び出し側で分岐する必要はない。
 */
export function setAppBadge(count: number): void {
  if (typeof navigator === 'undefined') return;
  const nav = navigator as Navigator & {
    setAppBadge?: (count?: number) => Promise<void>;
    clearAppBadge?: () => Promise<void>;
  };
  try {
    if (count > 0) void nav.setAppBadge?.(count);
    else void nav.clearAppBadge?.();
  } catch {
    // 非対応環境。バッジが出ないだけなので握り潰す
  }
}
