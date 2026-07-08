import { useState, useRef, useEffect, type Dispatch, type SetStateAction } from 'react';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { ArrowLeft, Send, Pin, Flag, Image as ImageIcon, X } from 'lucide-react';
import type { Language, User, Message as AppMessage, MessageThread, ChatThreadMetadata, MessageCategory } from '@truss/core';
import { formatDateLabel, formatMessageTime, getChatAttachmentSignedUrl, getMessageCategoryLabel, MESSAGE_CATEGORY_OPTIONS, parseMessageDate, toDateKey } from '@truss/core';
import { useData } from '../../contexts/DataContext';
import { toast } from 'sonner';

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
  onUpdateMessageThreads: Dispatch<SetStateAction<MessageThread>>;
  chatThreadMetadata: ChatThreadMetadata;
  onUpdateChatThreadMetadata: Dispatch<SetStateAction<ChatThreadMetadata>>;
}
interface Message { id: number; sender: 'user' | 'other'; text: string; time: string; pinned?: boolean; flagged?: boolean; isBroadcast?: boolean; broadcastSubject?: string; broadcastSubjectEn?: string; read?: boolean; category?: MessageCategory; attachmentPath?: string; }
interface MessageHistory { [recipientId: string]: Message[]; }
const translations = { ja: { typeMessage: 'メッセージを入力...' }, en: { typeMessage: 'Type a message...' } };

export function MessagesPage({ language, user, recipientName, recipientAvatar, isAdmin = false, onBack, messageHistory, setMessageHistory, messageThreads, onUpdateMessageThreads }: MessagesPageProps) {
  const t = translations[language];
  const { markAllMessagesAsReadForUser, sendMessage, uploadChatAttachment, approvedMembers, staffInboxUserId } = useData();
  const hasMarkedAsRead = useRef(false);
  useEffect(() => { if (isAdmin && user.id && !hasMarkedAsRead.current) { hasMarkedAsRead.current = true; markAllMessagesAsReadForUser(user.id); } }, [isAdmin, user.id, markAllMessagesAsReadForUser]);
  const getInitialMessage = () => ({ id: 1, sender: 'other' as const, text: language === 'ja' ? 'こんにちは！リアクションありがとうございます。' : 'Hello! Thanks for your reaction.', time: '14:30' });
  const recipientId = recipientName;
  const [messages, setMessages] = useState<Message[]>(messageHistory[recipientId] || [getInitialMessage()]);
  const [newMessage, setNewMessage] = useState('');
  const [category, setCategory] = useState<MessageCategory>('inquiry');
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingPreviewUrl, setPendingPreviewUrl] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  useEffect(() => { setMessages(messageHistory[recipientId] || [getInitialMessage()]); }, [recipientId, isAdmin, language]);
  useEffect(() => {
    if (!(isAdmin && messageThreads[user.id])) return;
    const threadMessages = messageThreads[user.id];
    const converted: Message[] = threadMessages.map((msg) => ({ id: msg.id, sender: msg.isAdmin ? 'other' : 'user', text: msg.text, time: msg.time, pinned: msg.pinned, flagged: msg.flagged, isBroadcast: msg.isBroadcast, broadcastSubject: msg.broadcastSubject, broadcastSubjectEn: msg.broadcastSubjectEn, read: msg.read, category: msg.category, attachmentPath: msg.attachmentPath }));
    setMessages(converted);
    setMessageHistory((prev) => ({ ...prev, [recipientId]: converted }));
    if (threadMessages.some((msg) => msg.isAdmin && !msg.read)) onUpdateMessageThreads({ ...messageThreads, [user.id]: threadMessages.map((msg) => ({ ...msg, read: true })) });
  }, [messageThreads, user.id, isAdmin, recipientId, setMessageHistory, onUpdateMessageThreads]);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);
  useEffect(() => {
    const missing = messages.filter((m) => m.attachmentPath && !signedUrls[m.attachmentPath]).map((m) => m.attachmentPath as string);
    if (missing.length === 0) return;
    void (async () => {
      const entries = await Promise.all(missing.map(async (path) => [path, (await getChatAttachmentSignedUrl(path)).url] as const));
      setSignedUrls((prev) => {
        const next = { ...prev };
        for (const [path, url] of entries) if (url) next[path] = url;
        return next;
      });
    })();
  }, [messages, signedUrls]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setPendingFile(file);
    setPendingPreviewUrl(URL.createObjectURL(file));
  };
  const clearPendingFile = () => {
    if (pendingPreviewUrl) URL.revokeObjectURL(pendingPreviewUrl);
    setPendingFile(null);
    setPendingPreviewUrl(null);
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() && !pendingFile) return;
    const text = newMessage;
    const adminUserId = staffInboxUserId ?? approvedMembers.find((member) => member.isAdmin)?.id;
    if (!adminUserId) {
      toast.error(language === 'ja' ? '運営アカウントが見つかりませんでした' : 'Admin account was not found');
      return;
    }
    setSending(true);
    try {
      let attachmentPath: string | undefined;
      let attachmentType: string | undefined;
      if (pendingFile) {
        const fileExt = pendingFile.name.split('.').pop() || 'jpg';
        const { path, error } = await uploadChatAttachment(pendingFile, { fileExt, contentType: pendingFile.type });
        if (error || !path) throw error ?? new Error('attachment upload failed');
        attachmentPath = path;
        attachmentType = pendingFile.type;
      }
      await sendMessage(adminUserId, text || '（添付ファイル）', false, { category, attachmentPath, attachmentType });
      setNewMessage('');
      clearPendingFile();
    } catch {
      toast.error(language === 'ja' ? 'メッセージ送信に失敗しました' : 'Failed to send message');
    } finally {
      setSending(false);
    }
  };
  const togglePin = (id: number) => { const updated = messages.map((m) => m.id === id ? { ...m, pinned: !m.pinned } : m); setMessages(updated); setMessageHistory((prev) => ({ ...prev, [recipientId]: updated })); };
  const toggleFlag = (id: number) => { const updated = messages.map((m) => m.id === id ? { ...m, flagged: !m.flagged } : m); setMessages(updated); setMessageHistory((prev) => ({ ...prev, [recipientId]: updated })); };
  const renderMessage = (message: Message) => {
    const categoryLabel = message.sender === 'user' ? getMessageCategoryLabel(message.category, language) : undefined;
    const attachmentUrl = message.attachmentPath ? signedUrls[message.attachmentPath] : undefined;
    return (
      <div key={message.id} className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'} group`}>
        <div className={`max-w-[75%] ${message.sender === 'user' ? 'order-2' : 'order-1'} relative`}>
          {categoryLabel && (
            <div className="flex justify-end mb-1"><span className="text-xs bg-[#49B1E4]/15 text-[#49B1E4] px-2 py-0.5 rounded-full">{categoryLabel}</span></div>
          )}
          <div className={`rounded-2xl px-4 py-2 relative ${message.sender === 'user' ? 'bg-[#49B1E4] text-white' : 'bg-white text-[#3D3D4E]'} ${message.pinned ? 'ring-2 ring-[#FFD700]' : ''}`}>
            {message.flagged && <Flag className="w-3 h-3 text-red-500 absolute -top-1 -right-1 fill-red-500" />}
            {message.pinned && <Pin className="w-3 h-3 text-yellow-500 absolute -top-1 -left-1 fill-yellow-500" />}
            {attachmentUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={attachmentUrl} alt="添付画像" className="max-w-[220px] rounded-lg mb-1" />
            )}
            {message.text && message.text !== '（添付ファイル）' && <p className="wrap-break-word whitespace-pre-wrap">{message.text}</p>}
          </div>
          <div className={`flex items-center gap-1 mt-1 ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
            <p className="text-xs text-[#6B6B7A]">
              {formatMessageTime(message.time)}
              {message.sender === 'user' && message.read ? `　${language === 'ja' ? '既読' : 'Read'}` : ''}
            </p>
            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 ml-2">
              <button onClick={() => togglePin(message.id)} className={`p-1 rounded hover:bg-[#E8E4DB] ${message.pinned ? 'text-yellow-500' : 'text-gray-400'}`}><Pin className="w-3.5 h-3.5" /></button>
              <button onClick={() => toggleFlag(message.id)} className={`p-1 rounded hover:bg-[#E8E4DB] ${message.flagged ? 'text-red-500' : 'text-gray-400'}`}><Flag className="w-3.5 h-3.5" /></button>
            </div>
          </div>
        </div>
      </div>
    );
  };

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
      <div className="bg-white border-t border-[#E8E4DB] px-4 py-2 flex flex-wrap gap-1.5 shrink-0">
        {MESSAGE_CATEGORY_OPTIONS.map((option) => (
          <button
            key={option.key}
            onClick={() => setCategory(option.key)}
            className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${category === option.key ? 'bg-[#49B1E4] border-[#49B1E4] text-white' : 'border-[#E8E4DB] text-[#6B6B7A] hover:bg-[#F5F1E8]'}`}
          >
            {language === 'ja' ? option.labelJa : option.labelEn}
          </button>
        ))}
      </div>
      {pendingPreviewUrl && (
        <div className="bg-white px-4 py-2 flex items-center gap-2 shrink-0 border-t border-[#E8E4DB]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={pendingPreviewUrl} alt="添付プレビュー" className="w-12 h-12 rounded-lg object-cover" />
          <button onClick={clearPendingFile} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
        </div>
      )}
      <div className="bg-white border-t border-[#E8E4DB] px-4 py-3 flex items-center gap-2 shrink-0 sticky bottom-0">
        <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
        <button onClick={() => fileInputRef.current?.click()} className="p-2 rounded-full hover:bg-[#F5F1E8] text-[#6B6B7A] shrink-0" title={language === 'ja' ? '画像を添付' : 'Attach image'}>
          <ImageIcon className="w-5 h-5" />
        </button>
        <Input value={newMessage} onChange={(e) => setNewMessage(e.target.value)} onKeyPress={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }} placeholder={t.typeMessage} className="flex-1" />
        <Button onClick={handleSendMessage} disabled={(!newMessage.trim() && !pendingFile) || sending} className="bg-[#49B1E4] hover:bg-[#3A9FD3] px-4"><Send className="w-4 h-4" /></Button>
      </div>
    </div>
  );
}
