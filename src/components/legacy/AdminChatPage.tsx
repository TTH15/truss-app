import { useState, useRef, useEffect } from 'react';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { ArrowLeft, Send, Pin, Flag, Mail } from 'lucide-react';
import type { Language, User } from '../../domain/types/app';
import { useData } from '../../contexts/DataContext';
import { toast } from 'sonner';

interface AdminChatPageProps { language: Language; user: User; onBack: () => void; }
interface Message { id: number; sender: 'user' | 'admin'; text: string; time: string; pinned?: boolean; flagged?: boolean; subject?: string; }

const translations = { ja: { adminName: '運営', typeMessage: 'メッセージを入力...' }, en: { adminName: 'Admin', typeMessage: 'Type a message...' } };
const initialAdminMessages: Message[] = [{ id: 1, sender: 'admin', subject: '【重要】春の交流会について', text: '春の交流会の開催日程が決定しました。', time: '10:30' }];

export function AdminChatPage({ language, user, onBack }: AdminChatPageProps) {
  const t = translations[language];
  const { messageThreads, sendMessage, markAllMessagesAsReadForUser, approvedMembers } = useData();
  const adminUserId = approvedMembers.find((member) => member.isAdmin)?.id ?? null;
  useEffect(() => { if (user.id) markAllMessagesAsReadForUser(user.id); }, [user.id, markAllMessagesAsReadForUser]);
  const getMessagesFromSupabase = (): Message[] => {
    const thread = messageThreads[user.id];
    if (thread && thread.length > 0) return thread.map((msg) => ({ id: msg.id, sender: msg.isAdmin ? 'admin' : 'user', text: msg.text, time: msg.time, pinned: msg.pinned, flagged: msg.flagged, subject: msg.isBroadcast ? msg.broadcastSubject : undefined }));
    return initialAdminMessages;
  };

  const [messages, setMessages] = useState<Message[]>(getMessagesFromSupabase());
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  useEffect(() => { const updated = getMessagesFromSupabase(); if (updated.length > 0) setMessages(updated); }, [messageThreads, user.id]);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const handleSendMessage = async () => {
    if (!(newMessage.trim() && !isSending)) return;
    if (!adminUserId) {
      toast.error(language === 'ja' ? '運営アカウントが見つかりませんでした' : 'Admin account was not found');
      return;
    }
    setIsSending(true);
    try {
      await sendMessage(adminUserId, newMessage, false);
      setMessages((prev) => [...prev, { id: Date.now(), sender: 'user', text: newMessage, time: new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }) }]);
      setNewMessage('');
    } finally { setIsSending(false); }
  };
  const togglePin = (messageId: number) => setMessages(messages.map((m) => m.id === messageId ? { ...m, pinned: !m.pinned } : m));
  const toggleFlag = (messageId: number) => setMessages(messages.map((m) => m.id === messageId ? { ...m, flagged: !m.flagged } : m));
  const pinnedMessages = messages.filter((m) => m.pinned);
  const regularMessages = messages.filter((m) => !m.pinned);

  const renderMessage = (message: Message) => (
    <div key={message.id} className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'} group`}>
      <div className={`max-w-[75%] ${message.sender === 'user' ? 'order-2' : 'order-1'} relative`}>
        <div className={`rounded-2xl px-4 py-2 relative ${message.sender === 'user' ? 'bg-[#49B1E4] text-white' : 'bg-white text-[#3D3D4E]'} ${message.pinned ? 'ring-2 ring-[#FFD700]' : ''}`}>
          {message.flagged && <Flag className="w-3 h-3 text-red-500 absolute -top-1 -right-1 fill-red-500" />}
          {message.pinned && <Pin className="w-3 h-3 text-yellow-500 absolute -top-1 -left-1 fill-yellow-500" />}
          {message.sender === 'admin' && message.subject && <div className="font-semibold mb-2 pb-2 border-b border-gray-200">{message.subject}</div>}
          <p className="wrap-break-word whitespace-pre-wrap">{message.text}</p>
        </div>
        <div className={`flex items-center gap-1 mt-1 ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
          <p className="text-xs text-[#6B6B7A]">{message.time}</p>
          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 ml-2">
            <button onClick={() => togglePin(message.id)} className={`p-1 rounded hover:bg-[#E8E4DB] transition-colors ${message.pinned ? 'text-yellow-500' : 'text-gray-400'}`}><Pin className="w-3 h-3" /></button>
            <button onClick={() => toggleFlag(message.id)} className={`p-1 rounded hover:bg-[#E8E4DB] transition-colors ${message.flagged ? 'text-red-500' : 'text-gray-400'}`}><Flag className="w-3 h-3" /></button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-screen bg-[#F5F1E8]">
      <div className="fixed top-0 left-0 right-0 bg-white border-b px-4 py-3 flex items-center gap-3 shadow-sm z-50">
        <Button variant="ghost" size="sm" onClick={onBack} className="p-2"><ArrowLeft className="w-5 h-5" /></Button>
        <Avatar className="w-10 h-10 bg-[#49B1E4]"><AvatarFallback className="bg-[#49B1E4] text-white"><Mail className="w-5 h-5" /></AvatarFallback></Avatar>
        <div className="flex-1"><h2 className="font-semibold text-[#3D3D4E]">{t.adminName}</h2></div>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 mt-[73px] mb-[73px]">
        {pinnedMessages.length > 0 && <div className="bg-yellow-50 rounded-lg p-3 mb-4 border border-yellow-200"><div className="space-y-3">{pinnedMessages.map(renderMessage)}</div></div>}
        {regularMessages.map(renderMessage)}
        <div ref={messagesEndRef} />
      </div>
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t px-4 py-3 z-50">
        <div className="flex gap-2">
          <Input value={newMessage} onChange={(e) => setNewMessage(e.target.value)} onKeyPress={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }} placeholder={t.typeMessage} className="flex-1 bg-[#EEEBE3] border-0" />
          <Button onClick={handleSendMessage} disabled={!newMessage.trim() || isSending} className="bg-[#49B1E4] hover:bg-[#3A9BD4] px-6"><Send className="w-4 h-4" /></Button>
        </div>
      </div>
    </div>
  );
}
