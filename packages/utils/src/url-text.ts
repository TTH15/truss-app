/**
 * URL を含むテキストの正規化・判定(純粋関数)
 */

const URL_WITH_LINE_BREAKS = /https?:\/\/[A-Za-z0-9\-._~:/?#@!$&'()*+,;=%\[\]]+(?:\n[A-Za-z0-9\-._~:/?#@!$&'()*+,;=%\[\]]+)*/g;

/** コピペ等で URL の途中に混入した改行を除去する(URL 以外の改行はそのまま残す) */
export const removeLineBreaksInUrls = (text: string) =>
  text.replace(URL_WITH_LINE_BREAKS, (match) => match.replace(/\n/g, ""));

/** LINE の招待/短縮 URL らしき文字列か(地図 URL 等との取り違え検出用) */
export function isLikelyLineInviteUrl(url: string): boolean {
  const s = url.trim().toLowerCase();
  if (!s) return false;
  try {
    const host = new URL(s).hostname;
    return host.includes("line.me") || host.includes("lin.ee");
  } catch {
    return /line\.(me|jp)/i.test(s) || /lin\.ee/i.test(s);
  }
}
