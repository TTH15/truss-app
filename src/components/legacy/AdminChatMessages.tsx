import { useState, useRef, useEffect } from 'react';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { ScrollArea } from '../ui/scroll-area';
import { MessageCircle, Send, Pin, Flag, ArrowLeft } from 'lucide-react';
import type { Language, MessageThread, User as UserType, Message, ChatThreadMetadata } from '../../domain/types/app';

interface AdminChatMessagesProps {
  language: Language;
  messageThreads: MessageThread;
  onUpdateMessageThreads: (threads: MessageThread) => void;
  onSendMessage?: (receiverId: string, text: string, isAdmin?: boolean) => Promise<void>;
  approvedMembers?: UserType[];
  pendingUsers?: UserType[];
  chatThreadMetadata: ChatThreadMetadata;
  onUpdateChatThreadMetadata: (metadata: ChatThreadMetadata) => void;
  selectedChatUserId?: string | null;
  onOpenMemberChat?: (userId: string) => void;
}

const translations = {
  ja: { noMessages: 'まだメッセージがありません', typeMessage: 'メッセージを入力...', selectUser: 'ユーザーを選択してください', pinThread: 'スレッドをピン留め', unpinThread: 'ピンを外す', flagThread: 'スレッドにフラグ', unflagThread: 'フラグを外す' },
  en: { noMessages: 'No messages yet', typeMessage: 'Type a message...', selectUser: 'Select a user', pinThread: 'Pin thread', unpinThread: 'Unpin thread', flagThread: 'Flag thread', unflagThread: 'Unflag thread' }
};

export function AdminChatMessages({ language, messageThreads, onUpdateMessageThreads, onSendMessage, approvedMembers = [], pendingUsers = [], chatThreadMetadata, onUpdateChatThreadMetadata, selectedChatUserId }: AdminChatMessagesProps) {
  const t = translations[language];
  const [selectedUserId, setSelectedUserId] = useState<string | null>(selectedChatUserId || null);
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [selectedUserId, messageThreads]);

  useEffect(() => {
    if (!selectedChatUserId) return;
    setSelectedUserId(selectedChatUserId);
    if (!messageThreads[selectedChatUserId]) onUpdateMessageThreads({ ...messageThreads, [selectedChatUserId]: [] });
    const messages = messageThreads[selectedChatUserId] || [];
    if (messages.some((m) => !m.isAdmin && !m.read)) onUpdateMessageThreads({ ...messageThreads, [selectedChatUserId]: messages.map((m) => m.isAdmin ? m : { ...m, read: true }) });
    const currentMetadata = chatThreadMetadata[selectedChatUserId] || {};
    if (currentMetadata.unreadCount && currentMetadata.unreadCount > 0) onUpdateChatThreadMetadata({ ...chatThreadMetadata, [selectedChatUserId]: { ...currentMetadata, unreadCount: 0 } });
  }, [selectedChatUserId]);

  const allUserIds = new Set<string>();
  approvedMembers.forEach((member) => allUserIds.add(member.id));
  Object.keys(messageThreads).forEach((userId) => allUserIds.add(userId));
  const usersWithMessages = Array.from(allUserIds).map((userId) => {
    const messages = messageThreads[userId] || [];
    const lastMessage = messages[messages.length - 1];
    const user = approvedMembers.find((m) => m.id === userId) || pendingUsers?.find((m) => m.id === userId);
    const metadata = chatThreadMetadata[userId] || {};
    return { userId, userName: user?.name || 'Unknown User', userAvatar: user?.nickname ? user.nickname.charAt(0).toUpperCase() : 'U', lastMessage: lastMessage?.text || '', lastMessageTime: lastMessage?.time || '', unreadCount: messages.filter((m) => !m.isAdmin && !m.read).length, pinned: metadata.pinned || false, flagged: metadata.flagged || false };
  });
  const sortedUsers = [...usersWithMessages].sort((a, b) => (a.pinned === b.pinned ? 0 : a.pinned ? -1 : 1));
  const selectedUser = selectedUserId ? usersWithMessages.find((u) => u.userId === selectedUserId) : null;
  const currentMessages = selectedUserId ? (messageThreads[selectedUserId] || []) : [];

  const handleSelectUser = (userId: string) => {
    setSelectedUserId(userId);
    const messages = messageThreads[userId] || [];
    if (messages.some((m) => !m.isAdmin && !m.read)) onUpdateMessageThreads({ ...messageThreads, [userId]: messages.map((m) => m.isAdmin ? m : { ...m, read: true }) });
    const currentMetadata = chatThreadMetadata[userId] || {};
    if (currentMetadata.unreadCount && currentMetadata.unreadCount > 0) onUpdateChatThreadMetadata({ ...chatThreadMetadata, [userId]: { ...currentMetadata, unreadCount: 0 } });
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedUserId) return;
    if (onSendMessage) await onSendMessage(selectedUserId, newMessage, true);
    else {
      const message: Message = { id: Date.now(), senderId: 'admin-001', senderName: language === 'ja' ? '運営管理者' : 'Admin', text: newMessage, time: new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }), isAdmin: true, read: false };
      onUpdateMessageThreads({ ...messageThreads, [selectedUserId]: [...(messageThreads[selectedUserId] || []), message] });
      const currentMetadata = chatThreadMetadata[selectedUserId] || {};
      onUpdateChatThreadMetadata({ ...chatThreadMetadata, [selectedUserId]: { ...currentMetadata } });
    }
    setNewMessage('');
  };

  const togglePin = (messageId: number) => { if (!selectedUserId) return; onUpdateMessageThreads({ ...messageThreads, [selectedUserId]: (messageThreads[selectedUserId] || []).map((m) => m.id === messageId ? { ...m, pinned: !m.pinned } : m) }); };
  const toggleFlag = (messageId: number) => { if (!selectedUserId) return; onUpdateMessageThreads({ ...messageThreads, [selectedUserId]: (messageThreads[selectedUserId] || []).map((m) => m.id === messageId ? { ...m, flagged: !m.flagged } : m) }); };
  const toggleThreadPin = (userId: string, e: React.MouseEvent) => { e.stopPropagation(); const currentMetadata = chatThreadMetadata[userId] || {}; onUpdateChatThreadMetadata({ ...chatThreadMetadata, [userId]: { ...currentMetadata, pinned: !currentMetadata.pinned } }); };
  const toggleThreadFlag = (userId: string, e: React.MouseEvent) => { e.stopPropagation(); const currentMetadata = chatThreadMetadata[userId] || {}; onUpdateChatThreadMetadata({ ...chatThreadMetadata, [userId]: { ...currentMetadata, flagged: !currentMetadata.flagged } }); };
  const pinnedMessages = currentMessages.filter((m) => m.pinned);
  const regularMessages = currentMessages.filter((m) => !m.pinned);

  const renderMessage = (message: Message) => (
    <div key={message.id} className={`flex ${message.isAdmin ? 'justify-end' : 'justify-start'} group`}>
      <div className={`max-w-[75%] ${message.isAdmin ? 'order-2' : 'order-1'}`}>
        <div className={`rounded-2xl px-4 py-2 relative overflow-visible ${message.isAdmin ? 'bg-[#3D3D4E] text-white' : 'bg-gray-100 text-[#3D3D4E]'} ${message.pinned ? 'ring-2 ring-[#FFD700]' : ''}`}>
          {message.flagged && <Flag className="w-3 h-3 text-red-500 absolute -top-1 -right-1 fill-red-500" />}
          {message.pinned && <Pin className="w-3 h-3 text-yellow-500 absolute -top-1 -left-1 fill-yellow-500" />}
          <p className="wrap-break-word">{message.text}</p>
        </div>
        <div className={`flex items-center gap-2 mt-1 ${message.isAdmin ? 'justify-end' : 'justify-start'}`}>
          <p className="text-xs text-gray-400">{message.time}</p>
          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
            <button onClick={() => togglePin(message.id)} className={`p-1 rounded hover:bg-gray-200 transition-colors ${message.pinned ? 'text-yellow-500' : 'text-gray-400'}`}><Pin className="w-3.5 h-3.5" /></button>
            <button onClick={() => toggleFlag(message.id)} className={`p-1 rounded hover:bg-gray-200 transition-colors ${message.flagged ? 'text-red-500' : 'text-gray-400'}`}><Flag className="w-3.5 h-3.5" /></button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-[600px] gap-4">
      <div className={`w-full md:w-80 bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col ${selectedUserId ? 'hidden md:flex' : 'flex'}`}>
        <div className="flex-1 overflow-hidden">
          <ScrollArea className="h-full">
            {sortedUsers.length === 0 ? <div className="p-4 text-center text-gray-500 text-sm">{t.noMessages}</div> : (
              <div>{sortedUsers.map((user) => (
                <div key={user.userId} className={`relative w-full text-left hover:bg-gray-50 transition-colors border-b border-gray-200 group ${selectedUserId === user.userId ? 'bg-blue-50 border-l-4 border-[#49B1E4]' : ''}`}>
                  <button onClick={() => handleSelectUser(user.userId)} className="w-full p-4 text-left relative">
                    <div className="flex items-start gap-3">
                      <div className="shrink-0 relative">
                        <Avatar className="w-10 h-10"><AvatarFallback className="bg-[#49B1E4] text-white">{user.userAvatar}</AvatarFallback></Avatar>
                        <div className="absolute -right-1 top-0 flex flex-col gap-0.5">{user.pinned && <Pin className="w-3 h-3 text-yellow-500 fill-yellow-500" />}{user.flagged && <Flag className="w-3 h-3 text-red-500 fill-red-500" />}</div>
                      </div>
                      <div className="flex-1 min-w-0"><p className="font-medium text-gray-900 truncate">{user.userName}</p><p className="text-xs text-gray-500 truncate">{user.lastMessage}</p><div className="flex items-center gap-2 mt-1"><p className="text-xs text-gray-400">{user.lastMessageTime}</p>{user.unreadCount > 0 && <div className="bg-red-500 text-white text-xs rounded-full h-4 min-w-[16px] px-1.5 flex items-center justify-center font-medium">{user.unreadCount}</div>}</div></div>
                    </div>
                  </button>
                  <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={(e) => toggleThreadPin(user.userId, e)} className="p-1 rounded hover:bg-gray-200 text-gray-600 hover:text-yellow-600 transition-colors" title={user.pinned ? t.unpinThread : t.pinThread}><Pin className="w-3.5 h-3.5" /></button>
                    <button onClick={(e) => toggleThreadFlag(user.userId, e)} className="p-1 rounded hover:bg-gray-200 text-gray-600 hover:text-red-600 transition-colors" title={user.flagged ? t.unflagThread : t.flagThread}><Flag className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
              ))}</div>
            )}
          </ScrollArea>
        </div>
      </div>

      <div className={`flex-1 bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col overflow-hidden ${!selectedUserId ? 'hidden md:flex' : 'flex'}`}>
        {selectedUser ? (
          <>
            <div className="p-4 border-b border-gray-200 flex items-center gap-3 shrink-0">
              <button onClick={() => setSelectedUserId(null)} className="md:hidden p-1 hover:bg-gray-100 rounded-full transition-colors"><ArrowLeft className="w-5 h-5 text-[#3D3D4E]" /></button>
              <Avatar className="w-10 h-10"><AvatarFallback className="bg-[#49B1E4] text-white">{selectedUser.userAvatar}</AvatarFallback></Avatar>
              <div><h3 className="font-medium text-gray-900">{selectedUser.userName}</h3></div>
            </div>
            <div className="flex-1 overflow-hidden">
              <ScrollArea className="h-full">
                <div className="space-y-4 p-4">
                  {pinnedMessages.length > 0 && <>{pinnedMessages.map(renderMessage)}{regularMessages.length > 0 && <div className="relative py-4"><div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-300"></div></div><div className="relative flex justify-center text-xs"><span className="px-3 bg-white text-gray-500">{language === 'ja' ? 'ピン済みメッセージ ↑' : 'Pinned Messages ↑'}</span></div></div>}</>}
                  {regularMessages.map(renderMessage)}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>
            </div>
            <div className="p-4 border-t border-gray-200 shrink-0">
              <div className="flex items-center gap-2">
                <Input value={newMessage} onChange={(e) => setNewMessage(e.target.value)} onKeyPress={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }} placeholder={t.typeMessage} className="flex-1" />
                <Button onClick={handleSendMessage} disabled={!newMessage.trim()} className="bg-[#49B1E4] hover:bg-[#3A9BD4] px-4"><Send className="w-4 h-4" /></Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-400"><div className="text-center"><MessageCircle className="w-16 h-16 mx-auto mb-4 opacity-50" /><p>{t.selectUser}</p></div></div>
        )}
      </div>
    </div>
  );
}
