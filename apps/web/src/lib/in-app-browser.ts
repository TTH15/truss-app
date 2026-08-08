/**
 * アプリ内ブラウザ（WebView）の検知。
 *
 * Google は WebView からの OAuth ログインをブロックする（disallowed_useragent）。
 * LINE やInstagram のトークから開いた画面では Google ログインが必ず失敗するため、
 * 事前に検知して外部ブラウザへ誘導する。判定は UA 文字列によるベストエフォート。
 */

export function isInAppBrowser(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  return (
    /Line\//i.test(ua) || // LINE
    /Instagram/i.test(ua) ||
    /FBAN|FBAV|FB_IAB/i.test(ua) || // Facebook / Messenger
    /TikTok/i.test(ua) ||
    /Twitter/i.test(ua)
  );
}

export function isLineInAppBrowser(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /Line\//i.test(navigator.userAgent);
}

/**
 * LINE 内ブラウザから外部ブラウザ（Safari / Chrome）で開き直すための URL。
 * `openExternalBrowser=1` は LINE 公式のパラメータで、LINE が自動的に外部ブラウザへ渡す。
 */
export function getLineEscapeUrl(): string {
  const url = new URL(window.location.href);
  url.searchParams.set('openExternalBrowser', '1');
  return url.toString();
}

/**
 * 共有用 URL に LINE 脱出パラメータを付ける。
 * トークに貼られたリンクをタップした時点で外部ブラウザが開くので、
 * ログインできない問題そのものが起きなくなる。LINE 以外の環境では単に無視される。
 */
export function withLineEscapeParam(url: string): string {
  try {
    const parsed = new URL(url);
    parsed.searchParams.set('openExternalBrowser', '1');
    return parsed.toString();
  } catch {
    return url;
  }
}
