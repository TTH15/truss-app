import { useState, useRef, useEffect } from 'react';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { ArrowLeft, Send, Pin, Flag } from 'lucide-react';
import type { Language, User, Message as AppMessage, MessageThread, ChatThreadMetadata } from '../../domain/types/app';
import { useData } from '../../contexts/DataContext';

interface MessagesPageProps {
  language: Language;
  user: User;
  recipientName: string;
  recipientAvatar: string;
  isAdmin?: boolean;
  onBack: () => void;
  messageHistory: MessageHistory;
  setMessageHistory: (history: MessageHistory | ((prev: MessageHistory) => MessageHistory)) => void;
  messageThreads: MessageThread;
  onUpdateMessageThreads: (threads: MessageThread) => void;
  chatThreadMetadata: ChatThreadMetadata;
  onUpdateChatThreadMetadata: (metadata: ChatThreadMetadata) => void;
}
interface Message { id: number; sender: 'user' | 'other'; text: string; time: string; pinned?: boolean; flagged?: boolean; isBroadcast?: boolean; broadcastSubject?: string; broadcastSubjectEn?: string; }
interface MessageHistory { [recipientId: string]: Message[]; }
const translations = { ja: { typeMessage: 'メッセージを入力...' }, en: { typeMessage: 'Type a message...' } };
const WEEKDAYS_JA = ['日', '月', '火', '水', '木', '金', '土'];
const WEEKDAYS_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const parseMessageDate = (raw: string) => {
  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) return parsed;
  const hm = raw.match(/^(\d{1,2}):(\d{2})$/);
  if (hm) {
    const now = new Date();
    now.setHours(Number(hm[1]), Number(hm[2]), 0, 0);
    return now;
  }
  return new Date();
};

const toDateKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

const formatDateLabel = (date: Date, language: Language) => {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfTarget = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.round((startOfToday.getTime() - startOfTarget.getTime()) / 86400000);
  if (diffDays === 0) return language === 'ja' ? '今日' : 'Today';
  if (diffDays === 1) return language === 'ja' ? '昨日' : 'Yesterday';
  const weekdays = language === 'ja' ? WEEKDAYS_JA : WEEKDAYS_EN;
  const weekday = weekdays[date.getDay()];
  if (date.getFullYear() < now.getFullYear()) {
    return language === 'ja'
      ? `${date.getFullYear()}年${String(date.getMonth() + 1).padStart(2, '0')}月${String(date.getDate()).padStart(2, '0')}日 ${weekday}`
      : `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')} ${weekday}`;
  }
  return `${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')} ${weekday}`;
};

const formatMessageTime = (raw: string) => {
  const parsed = parseMessageDate(raw);
  return `${String(parsed.getHours()).padStart(2, '0')}:${String(parsed.getMinutes()).padStart(2, '0')}`;
};

export function MessagesPage({ language, user, recipientName, recipientAvatar, isAdmin = false, onBack, messageHistory, setMessageHistory, messageThreads, onUpdateMessageThreads }: MessagesPageProps) {
  const t = translations[language];
  const { markAllMessagesAsReadForUser } = useData();
  const hasMarkedAsRead = useRef(false);
  useEffect(() => { if (isAdmin && user.id && !hasMarkedAsRead.current) { hasMarkedAsRead.current = true; markAllMessagesAsReadForUser(user.id); } }, [isAdmin, user.id, markAllMessagesAsReadForUser]);
  const getInitialMessage = () => ({ id: 1, sender: 'other' as const, text: language === 'ja' ? 'こんにちは！リアクションありがとうございます。' : 'Hello! Thanks for your reaction.', time: '14:30' });
  const recipientId = recipientName;
  const [messages, setMessages] = useState<Message[]>(messageHistory[recipientId] || [getInitialMessage()]);
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  useEffect(() => { setMessages(messageHistory[recipientId] || [getInitialMessage()]); }, [recipientId, isAdmin, language]);
  useEffect(() => {
    if (!(isAdmin && messageThreads[user.id])) return;
    const threadMessages = messageThreads[user.id];
    const converted: Message[] = threadMessages.map((msg) => ({ id: msg.id, sender: msg.isAdmin ? 'other' : 'user', text: msg.text, time: msg.time, pinned: msg.pinned, flagged: msg.flagged, isBroadcast: msg.isBroadcast, broadcastSubject: msg.broadcastSubject, broadcastSubjectEn: msg.broadcastSubjectEn }));
    setMessages(converted);
    setMessageHistory((prev) => ({ ...prev, [recipientId]: converted }));
    if (threadMessages.some((msg) => msg.isAdmin && !msg.read)) onUpdateMessageThreads({ ...messageThreads, [user.id]: threadMessages.map((msg) => ({ ...msg, read: true })) });
  }, [messageThreads, user.id, isAdmin, recipientId, setMessageHistory, onUpdateMessageThreads]);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const handleSendMessage = () => {
    if (!newMessage.trim()) return;
    const message: Message = { id: messages.length + 1, sender: 'user', text: newMessage, time: new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }) };
    const updated = [...messages, message];
    setMessages(updated); setNewMessage('');
    setMessageHistory((prev) => ({ ...prev, [recipientId]: updated }));
    if (isAdmin) {
      const appMessage: AppMessage = { id: Date.now(), senderId: user.id, senderName: user.name, text: newMessage, time: message.time, isAdmin: false };
      onUpdateMessageThreads({ ...messageThreads, [user.id]: [...(messageThreads[user.id] || []), appMessage] });
    }
  };
  const togglePin = (id: number) => { const updated = messages.map((m) => m.id === id ? { ...m, pinned: !m.pinned } : m); setMessages(updated); setMessageHistory((prev) => ({ ...prev, [recipientId]: updated })); };
  const toggleFlag = (id: number) => { const updated = messages.map((m) => m.id === id ? { ...m, flagged: !m.flagged } : m); setMessages(updated); setMessageHistory((prev) => ({ ...prev, [recipientId]: updated })); };
  const renderMessage = (message: Message) => (
    <div key={message.id} className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'} group`}>
      <div className={`max-w-[75%] ${message.sender === 'user' ? 'order-2' : 'order-1'} relative`}>
        <div className={`rounded-2xl px-4 py-2 relative ${message.sender === 'user' ? 'bg-[#49B1E4] text-white' : 'bg-white text-[#3D3D4E]'} ${message.pinned ? 'ring-2 ring-[#FFD700]' : ''}`}>
          {message.flagged && <Flag className="w-3 h-3 text-red-500 absolute -top-1 -right-1 fill-red-500" />}
          {message.pinned && <Pin className="w-3 h-3 text-yellow-500 absolute -top-1 -left-1 fill-yellow-500" />}
          <p className="wrap-break-word whitespace-pre-wrap">{message.text}</p>
        </div>
        <div className={`flex items-center gap-1 mt-1 ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
          <p className="text-xs text-[#6B6B7A]">{formatMessageTime(message.time)}</p>
          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 ml-2">
            <button onClick={() => togglePin(message.id)} className={`p-1 rounded hover:bg-[#E8E4DB] ${message.pinned ? 'text-yellow-500' : 'text-gray-400'}`}><Pin className="w-3.5 h-3.5" /></button>
            <button onClick={() => toggleFlag(message.id)} className={`p-1 rounded hover:bg-[#E8E4DB] ${message.flagged ? 'text-red-500' : 'text-gray-400'}`}><Flag className="w-3.5 h-3.5" /></button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col bg-[#F5F1E8] h-[calc(100vh-64px)]">
      <div className="bg-white border-b border-[#E8E4DB] px-4 py-3 flex items-center gap-3 shrink-0">
        <button onClick={onBack} className="p-1 hover:bg-[#E8E4DB] rounded-full"><ArrowLeft className="w-5 h-5 text-[#3D3D4E]" /></button>
        <Avatar className="w-10 h-10"><AvatarFallback className="bg-[#49B1E4] text-white">{recipientAvatar}</AvatarFallback></Avatar>
        <div className="flex-1"><h2 className="text-[#3D3D4E]">{recipientName}</h2>{isAdmin && <p className="text-xs text-[#6B6B7A]">{language === 'ja' ? '運営' : 'Admin'}</p>}</div>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
        {messages.map((message, index) => {
          const currentDate = parseMessageDate(message.time);
          const prevDate = index > 0 ? parseMessageDate(messages[index - 1].time) : null;
          const shouldShowDate = !prevDate || toDateKey(currentDate) !== toDateKey(prevDate);
          return (
            <div key={message.id}>
              {shouldShowDate && (
                <div className="flex justify-center my-4">
                  <span className="text-xs text-[#6B6B7A] bg-[#EEEBE3] px-3 py-1 rounded-full">
                    {formatDateLabel(currentDate, language)}
                  </span>
                </div>
              )}
              {renderMessage(message)}
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>
      <div className="bg-white border-t border-[#E8E4DB] px-4 py-3 flex items-center gap-2 shrink-0 sticky bottom-0">
        <Input value={newMessage} onChange={(e) => setNewMessage(e.target.value)} onKeyPress={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }} placeholder={t.typeMessage} className="flex-1" />
        <Button onClick={handleSendMessage} disabled={!newMessage.trim()} className="bg-[#49B1E4] hover:bg-[#3A9FD3] px-4"><Send className="w-4 h-4" /></Button>
      </div>
    </div>
  );
}
