import type { Message } from './types/app';

const AUTOMATIC_PREFIXES = [
  '登録が承認されました。Truss へようこそ！',
  'Your registration has been approved. Welcome to Truss!',
  '学生証の再アップロードをお願いします。',
  'Please re-upload your student ID card.',
  'Please re-upload your student ID. Reason:',
];

/** 旧データの定型通知も扱う。会員の発言は同じ文面でも通知扱いにしない。 */
export function isAutomatedAdminMessage(message: Message): boolean {
  return message.isAdmin && (message.isAutomated === true || message.isBroadcast === true || AUTOMATIC_PREFIXES.some((prefix) => message.text.startsWith(prefix)));
}

export function needsChatReply(messages: Message[]): boolean {
  let latest: Message | undefined;
  for (const message of messages) {
    if (isAutomatedAdminMessage(message)) continue;
    const time = Date.parse(message.time) || 0;
    const latestTime = latest ? Date.parse(latest.time) || 0 : 0;
    if (!latest || time > latestTime || (time === latestTime && message.id > latest.id)) latest = message;
  }
  return latest !== undefined && !latest.isAdmin;
}
