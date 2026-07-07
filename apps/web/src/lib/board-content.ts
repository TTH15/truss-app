const URL_WITH_LINE_BREAKS = /https?:\/\/[A-Za-z0-9\-._~:/?#@!$&'()*+,;=%\[\]]+(?:\n[A-Za-z0-9\-._~:/?#@!$&'()*+,;=%\[\]]+)*/g;

export const normalizeBoardContent = (text: string) =>
  text.replace(URL_WITH_LINE_BREAKS, (match) => match.replace(/\n/g, ''));
