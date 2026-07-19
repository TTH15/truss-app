import { useState, useRef, useEffect, type Dispatch, type SetStateAction } from 'react';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { ScrollArea } from '../ui/scroll-area';
import { MessageCircle, Send, Pin, Flag, ArrowLeft, Image as ImageIcon, Images, Calendar, Clock, MapPin, X, FileText } from 'lucide-react';
import type { Language, MessageThread, User as UserType, Message, ChatThreadMetadata } from '@truss/core';
import { formatDateLabel, formatMessageTime, formatRelativeListTime, getChatAttachmentSignedUrl, getMessageCategoryLabel, parseMessageDate, splitTextWithUrls, toDateKey, updateMessageFlagsRow } from '@truss/core';
import { toast } from 'sonner';
import { linkifyText } from '../../lib/linkify';
import { LinkPreviewCard } from './LinkPreviewCard';

interface AdminChatMessagesProps {
  language: Language;
  messageThreads: MessageThread;
  onUpdateMessageThreads: Dispatch<SetStateAction<MessageThread>>;
  onSendMessage?: (
    receiverId: string,
    text: string,
    isAdmin?: boolean,
    options?: { attachmentPath?: string; attachmentType?: string }
  ) => Promise<void>;
  onMarkMemberMessagesAsRead?: (memberUserId: string) => Promise<void>;
  onUploadChatAttachment?: (blob: Blob, meta: { fileExt: string; contentType: string }) => Promise<{ path: string | null; error: unknown }>;
  approvedMembers?: UserType[];
  pendingUsers?: UserType[];
  chatThreadMetadata: ChatThreadMetadata;
  onUpdateChatThreadMetadata: Dispatch<SetStateAction<ChatThreadMetadata>>;
  selectedChatUserId?: string | null;
  onOpenMemberChat?: (userId: string) => void;
  onOpenEventDetail?: (eventId: number) => void;
}

const translations = {
  ja: { noMessages: 'まだメッセージがありません', typeMessage: 'メッセージを入力...', selectUser: 'ユーザーを選択してください', pinThread: 'スレッドをピン留め', unpinThread: 'ピンを外す', flagThread: 'スレッドにフラグ', unflagThread: 'フラグを外す' },
  en: { noMessages: 'No messages yet', typeMessage: 'Type a message...', selectUser: 'Select a user', pinThread: 'Pin thread', unpinThread: 'Unpin thread', flagThread: 'Flag thread', unflagThread: 'Unflag thread' }
};
export function AdminChatMessages({ language, messageThreads, onUpdateMessageThreads, onSendMessage, onMarkMemberMessagesAsRead, onUploadChatAttachment, approvedMembers = [], pendingUsers = [], chatThreadMetadata, onUpdateChatThreadMetadata, selectedChatUserId, onOpenEventDetail }: AdminChatMessagesProps) {
  const t = translations[language];
  const [selectedUserId, setSelectedUserId] = useState<string | null>(selectedChatUserId || null);
  const [newMessage, setNewMessage] = useState('');
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingPreviewUrl, setPendingPreviewUrl] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [selectedUserId, messageThreads]);

  // 通知等からの遷移でselectedChatUserIdが指定された場合、選択状態に反映する
  // （既読処理自体は下のselectedUserId用effectがmessageThreadsの変化にも反応して行う）
  useEffect(() => {
    if (!selectedChatUserId) return;
    setSelectedUserId(selectedChatUserId);
  }, [selectedChatUserId]);

  useEffect(() => {
    const allMessages = Object.values(messageThreads).flat();
    const missing = allMessages.filter((m) => m.attachmentPath && !signedUrls[m.attachmentPath]).map((m) => m.attachmentPath as string);
    if (missing.length === 0) return;
    void (async () => {
      const entries = await Promise.all(missing.map(async (path) => [path, (await getChatAttachmentSignedUrl(path)).url] as const));
      setSignedUrls((prev) => {
        const next = { ...prev };
        for (const [path, url] of entries) if (url) next[path] = url;
        return next;
      });
    })();
  }, [messageThreads, signedUrls]);

  const allUserIds = new Set<string>();
  approvedMembers.forEach((member) => { if (!member.isAdmin) allUserIds.add(member.id); });
  Object.keys(messageThreads).forEach((userId) => allUserIds.add(userId));
  const usersWithMessages = Array.from(allUserIds).map((userId) => {
    const messages = messageThreads[userId] || [];
    const lastMessage = messages[messages.length - 1];
    const user = approvedMembers.find((m) => m.id === userId) || pendingUsers?.find((m) => m.id === userId);
    const metadata = chatThreadMetadata[userId] || {};
    const rawTime = lastMessage?.time || '';
    return {
      userId,
      userName: user?.name || 'Unknown User',
      userAvatar: user?.nickname ? user.nickname.charAt(0).toUpperCase() : 'U',
      lastMessage: lastMessage?.text || '',
      lastMessageTime: rawTime ? formatRelativeListTime(rawTime, language) : '',
      unreadCount: messages.filter((m) => !m.isAdmin && !m.read).length,
      pinned: metadata.pinned || false,
      flagged: metadata.flagged || false,
      flaggedMessageCount: messages.filter((m) => m.flagged).length,
    };
  });
  const sortedUsers = [...usersWithMessages].sort((a, b) => (a.pinned === b.pinned ? 0 : a.pinned ? -1 : 1));
  const selectedUser = selectedUserId ? usersWithMessages.find((u) => u.userId === selectedUserId) : null;
  const currentMessages = selectedUserId ? (messageThreads[selectedUserId] || []) : [];
  const pinnedMessages = currentMessages.filter((m) => m.pinned);

  const handleSelectUser = (userId: string) => {
    setSelectedUserId(userId);
  };

  // 選択中のスレッドを開いたままでも、新着（未読の会員メッセージ）が届くたびに既読にする
  useEffect(() => {
    if (!selectedUserId) return;
    const messages = messageThreads[selectedUserId] || [];
    if (!messages.some((m) => !m.isAdmin && !m.read)) return;
    onUpdateMessageThreads((prev) => ({
      ...prev,
      [selectedUserId]: (prev[selectedUserId] || []).map((m) => (m.isAdmin ? m : { ...m, read: true })),
    }));
    onUpdateChatThreadMetadata((prev) => {
      const currentMetadata = prev[selectedUserId] || {};
      if (!(currentMetadata.unreadCount && currentMetadata.unreadCount > 0)) return prev;
      return { ...prev, [selectedUserId]: { ...currentMetadata, unreadCount: 0 } };
    });
    void onMarkMemberMessagesAsRead?.(selectedUserId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedUserId, messageThreads]);

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
    if ((!newMessage.trim() && !pendingFile) || !selectedUserId) return;
    setSending(true);
    try {
      let attachmentPath: string | undefined;
      let attachmentType: string | undefined;
      if (pendingFile && onUploadChatAttachment) {
        const fileExt = pendingFile.name.split('.').pop() || 'jpg';
        const { path, error } = await onUploadChatAttachment(pendingFile, { fileExt, contentType: pendingFile.type });
        if (error || !path) throw error ?? new Error('attachment upload failed');
        attachmentPath = path;
        attachmentType = pendingFile.type;
      }
      const text = newMessage || '（添付ファイル）';
      if (onSendMessage) await onSendMessage(selectedUserId, text, true, { attachmentPath, attachmentType });
      else {
        const message: Message = { id: Date.now(), senderId: 'admin-001', senderName: language === 'ja' ? '運営管理者' : 'Admin', text, time: new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }), isAdmin: true, read: false, attachmentPath };
        onUpdateMessageThreads({ ...messageThreads, [selectedUserId]: [...(messageThreads[selectedUserId] || []), message] });
        const currentMetadata = chatThreadMetadata[selectedUserId] || {};
        onUpdateChatThreadMetadata({ ...chatThreadMetadata, [selectedUserId]: { ...currentMetadata } });
      }
      setNewMessage('');
      clearPendingFile();
    } catch {
      toast.error(language === 'ja' ? 'メッセージ送信に失敗しました' : 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const togglePin = (messageId: number) => {
    if (!selectedUserId) return;
    const current = (messageThreads[selectedUserId] || []).find((m) => m.id === messageId);
    const nextPinned = !current?.pinned;
    onUpdateMessageThreads({ ...messageThreads, [selectedUserId]: (messageThreads[selectedUserId] || []).map((m) => m.id === messageId ? { ...m, pinned: nextPinned } : m) });
    void updateMessageFlagsRow(messageId, { pinned: nextPinned }).then(({ error }) => {
      if (error) toast.error(language === 'ja' ? 'ピン留めの保存に失敗しました' : 'Failed to save pin');
    });
  };
  const toggleFlag = (messageId: number) => {
    if (!selectedUserId) return;
    const current = (messageThreads[selectedUserId] || []).find((m) => m.id === messageId);
    const nextFlagged = !current?.flagged;
    onUpdateMessageThreads({ ...messageThreads, [selectedUserId]: (messageThreads[selectedUserId] || []).map((m) => m.id === messageId ? { ...m, flagged: nextFlagged } : m) });
    void updateMessageFlagsRow(messageId, { flagged: nextFlagged }).then(({ error }) => {
      if (error) toast.error(language === 'ja' ? 'フラグの保存に失敗しました' : 'Failed to save flag');
    });
  };
  const toggleThreadPin = (userId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onUpdateChatThreadMetadata((prev) => {
      const currentMetadata = prev[userId] || {};
      return { ...prev, [userId]: { ...currentMetadata, pinned: !currentMetadata.pinned } };
    });
  };
  const toggleThreadFlag = (userId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onUpdateChatThreadMetadata((prev) => {
      const currentMetadata = prev[userId] || {};
      return { ...prev, [userId]: { ...currentMetadata, flagged: !currentMetadata.flagged } };
    });
  };
  const renderMessage = (message: Message) => {
    const categoryLabel = !message.isAdmin ? getMessageCategoryLabel(message.category, language) : undefined;
    const attachmentUrl = message.attachmentPath ? signedUrls[message.attachmentPath] : undefined;
    const showRead = message.isAdmin && message.read;
    const firstLinkUrl = message.text ? splitTextWithUrls(message.text).find((s) => s.type === 'url')?.value : undefined;
    const isImageAttachment = !!attachmentUrl && (!message.attachmentType || message.attachmentType.startsWith('image/'));
    const isAudioAttachment = !!attachmentUrl && !!message.attachmentType?.startsWith('audio/');
    const isFileAttachment = !!attachmentUrl && !isImageAttachment && !isAudioAttachment;
    const autoFallbackText = message.mention ? `${message.mention.title}について` : isAudioAttachment ? 'ボイスメッセージ' : '（添付ファイル）';
    const hasCaption = !isFileAttachment && !isAudioAttachment && !!message.text && message.text !== autoFallbackText;
    return (
      <div key={message.id} className={`flex ${message.isAdmin ? 'justify-end' : 'justify-start'} group`}>
        <div className="max-w-[85%]">
          {categoryLabel && (
            <div className="flex justify-start mb-1"><span className="text-xs bg-[#49B1E4]/15 text-[#49B1E4] px-2 py-0.5 rounded-full">{categoryLabel}</span></div>
          )}
          {/* 既読/時刻はLINE同様、吹き出し横に2行・小さめで表示。メンション・吹き出し・リンクプレビューは
              同じflex-colにまとめ、items-end/startで揃えることで左端(または右端)を必ず一致させる。
              ホバー行(pin/flag)はopacity-0でも高さを占有するため、items-endの基準に含めず外に出す */}
          <div className={`flex items-end gap-1.5 ${message.isAdmin ? 'flex-row' : 'flex-row-reverse'}`}>
            <div className={`flex flex-col shrink-0 pb-0.5 ${message.isAdmin ? 'items-end' : 'items-start'}`}>
              {showRead && <span className="text-[11px] leading-[14px] text-gray-400">{language === 'ja' ? '既読' : 'Read'}</span>}
              <span className="text-[11px] leading-[14px] text-gray-400">{formatMessageTime(message.time)}</span>
            </div>
            <div className={`flex flex-col min-w-0 gap-1 ${message.isAdmin ? 'items-end' : 'items-start'}`}>
              {message.mention && (() => {
                const mention = message.mention;
                const isClickableEvent = mention.type === 'event' && !!onOpenEventDetail;
                const isClickableLocation = mention.type === 'location' && !!mention.url;
                const handleClick = isClickableEvent
                  ? () => onOpenEventDetail?.(mention.id)
                  : isClickableLocation
                    ? () => window.open(mention.url, '_blank', 'noopener,noreferrer')
                    : undefined;
                return (
                  <div
                    className={`flex items-center gap-2 rounded-xl border border-[#49B1E4] bg-[#49B1E4]/10 p-2 max-w-[260px] ${handleClick ? 'cursor-pointer hover:bg-[#49B1E4]/20 transition-colors' : ''}`}
                    onClick={handleClick}
                    role={handleClick ? 'button' : undefined}
                  >
                    {mention.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={mention.imageUrl} alt="" className="w-8 h-8 rounded object-cover shrink-0" />
                    ) : (
                      <span className="w-8 h-8 flex items-center justify-center shrink-0">
                        {mention.type === 'event' ? (
                          <Calendar className="w-4 h-4 text-[#49B1E4]" />
                        ) : mention.type === 'location' ? (
                          <MapPin className="w-4 h-4 text-[#49B1E4]" />
                        ) : (
                          <Images className="w-4 h-4 text-[#49B1E4]" />
                        )}
                      </span>
                    )}
                    <div className="min-w-0">
                      <p className="text-sm text-[#49B1E4] truncate">{mention.title}</p>
                      {mention.dateLabel && (
                        <p className="text-xs text-gray-500 truncate flex items-center gap-1"><Calendar className="w-3 h-3 shrink-0" />{mention.dateLabel}</p>
                      )}
                      {mention.timeLabel && (
                        <p className="text-xs text-gray-500 truncate flex items-center gap-1"><Clock className="w-3 h-3 shrink-0" />{mention.timeLabel}</p>
                      )}
                      {!mention.dateLabel && !mention.timeLabel && mention.subtitle && (
                        <p className="text-xs text-gray-500 truncate">{mention.subtitle}</p>
                      )}
                    </div>
                  </div>
                );
              })()}
              {(attachmentUrl || hasCaption) && (
                <div className={`rounded-2xl px-4 py-2 relative overflow-visible min-w-0 ${message.isAdmin ? 'bg-[#3D3D4E] text-white' : 'bg-gray-100 text-[#3D3D4E]'} ${message.pinned ? 'ring-2 ring-[#FFD700]' : ''}`}>
                  {message.flagged && <Flag className="w-3 h-3 text-red-500 absolute -top-1 -right-1 fill-red-500" />}
                  {message.pinned && <Pin className="w-3 h-3 text-yellow-500 absolute -top-1 -left-1 fill-yellow-500" />}
                  {isImageAttachment && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={attachmentUrl} alt="添付画像" className="max-w-[220px] rounded-lg mb-1" />
                  )}
                  {isFileAttachment && (
                    <a
                      href={attachmentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`flex items-center gap-2 mb-1 underline ${message.isAdmin ? 'text-white' : 'text-[#49B1E4]'}`}
                    >
                      <FileText className="w-4 h-4 shrink-0" />
                      <span className="truncate">{message.text || 'ファイル'}</span>
                    </a>
                  )}
                  {isAudioAttachment && <audio controls src={attachmentUrl} className="max-w-[220px] mb-1 h-10" />}
                  {hasCaption && (
                    <p className="wrap-break-word">{linkifyText(message.text)}</p>
                  )}
                </div>
              )}
              {firstLinkUrl && <LinkPreviewCard url={firstLinkUrl} />}
            </div>
          </div>
          <div className={`flex items-center gap-1 mt-1 opacity-0 transition-opacity pointer-events-none group-hover:pointer-events-auto group-hover:opacity-100 ${message.isAdmin ? 'justify-end' : 'justify-start'}`}>
            <button type="button" onClick={() => togglePin(message.id)} className={`p-1 rounded hover:bg-gray-200 transition-colors ${message.pinned ? 'text-yellow-500' : 'text-gray-400'}`}><Pin className="w-3.5 h-3.5" /></button>
            <button type="button" onClick={() => toggleFlag(message.id)} className={`p-1 rounded hover:bg-gray-200 transition-colors ${message.flagged ? 'text-red-500' : 'text-gray-400'}`}><Flag className="w-3.5 h-3.5" /></button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex h-[600px] gap-4">
      <div className={`w-full md:w-80 bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col ${selectedUserId ? 'hidden md:flex' : 'flex'}`}>
        <div className="flex-1 overflow-hidden">
          <ScrollArea className="h-full">
            {sortedUsers.length === 0 ? <div className="p-4 text-center text-gray-500 text-sm">{t.noMessages}</div> : (
              <div>{sortedUsers.map((user) => (
                <div key={user.userId} className={`relative w-full text-left hover:bg-gray-50 transition-colors border-b border-gray-200 group ${selectedUserId === user.userId ? 'bg-blue-50 border-l-4 border-[#49B1E4]' : ''}`}>
                  <button type="button" onClick={() => handleSelectUser(user.userId)} className="w-full p-4 pr-12 text-left relative">
                    <div className="flex items-start gap-3">
                      <div className="shrink-0 relative">
                        <Avatar className="w-10 h-10"><AvatarFallback className="bg-[#49B1E4] text-white">{user.userAvatar}</AvatarFallback></Avatar>
                        <div className="absolute -right-1 top-0 flex flex-col gap-0.5">{user.pinned && <Pin className="w-3 h-3 text-yellow-500 fill-yellow-500" />}{user.flagged && <Flag className="w-3 h-3 text-red-500 fill-red-500" />}</div>
                      </div>
                      <div className="flex-1 min-w-0"><p className="font-medium text-gray-900 truncate">{user.userName}</p><p className="text-xs text-gray-500 truncate">{user.lastMessage}</p><div className="flex items-center gap-2 mt-1"><p className="text-xs text-gray-400">{user.lastMessageTime}</p>{user.unreadCount > 0 && <div className="bg-red-500 text-white text-xs rounded-full h-4 min-w-[16px] px-1.5 flex items-center justify-center font-medium">{user.unreadCount}</div>}{user.flaggedMessageCount > 0 && <div className="flex items-center gap-0.5 bg-red-100 text-red-600 text-xs rounded-full h-4 px-1.5 font-medium"><Flag className="w-2.5 h-2.5 fill-red-600" />{user.flaggedMessageCount}</div>}</div></div>
                    </div>
                  </button>
                  <div className="absolute top-2 right-2 z-10 flex items-center gap-1 opacity-0 transition-opacity pointer-events-none group-hover:pointer-events-auto group-hover:opacity-100">
                    <button type="button" onClick={(e) => toggleThreadPin(user.userId, e)} className="p-1 rounded hover:bg-gray-200 text-gray-600 hover:text-yellow-600 transition-colors" title={user.pinned ? t.unpinThread : t.pinThread}><Pin className="w-3.5 h-3.5" /></button>
                    <button type="button" onClick={(e) => toggleThreadFlag(user.userId, e)} className="p-1 rounded hover:bg-gray-200 text-gray-600 hover:text-red-600 transition-colors" title={user.flagged ? t.unflagThread : t.flagThread}><Flag className="w-3.5 h-3.5" /></button>
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
            {pinnedMessages.length > 0 && (
              <div className="border-b border-gray-200 bg-yellow-50 px-4 py-2 max-h-32 overflow-y-auto shrink-0">
                {pinnedMessages.map((m) => (
                  <div key={m.id} className="flex items-center gap-2 py-1 text-sm text-gray-700">
                    <Pin className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500 shrink-0" />
                    <span className="truncate flex-1">{m.text}</span>
                    <button type="button" onClick={() => togglePin(m.id)} className="text-gray-400 hover:text-gray-600 shrink-0" title={language === 'ja' ? 'ピンを外す' : 'Unpin'}>
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex-1 overflow-hidden">
              <ScrollArea className="h-full">
                <div className="space-y-4 p-4">
                  {currentMessages.map((message, index) => {
                    const currentDate = parseMessageDate(message.time);
                    const prevDate = index > 0 ? parseMessageDate(currentMessages[index - 1].time) : null;
                    const shouldShowDate = !prevDate || toDateKey(currentDate) !== toDateKey(prevDate);
                    return (
                      <div key={message.id}>
                        {shouldShowDate && (
                          <div className="flex justify-center my-4">
                            <span className="text-xs font-medium text-gray-600 bg-gray-200 px-3 py-1 rounded-full">
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
              </ScrollArea>
            </div>
            {pendingPreviewUrl && (
              <div className="px-4 py-2 flex items-center gap-2 shrink-0 border-t border-gray-200">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={pendingPreviewUrl} alt="添付プレビュー" className="w-12 h-12 rounded-lg object-cover" />
                <button onClick={clearPendingFile} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
              </div>
            )}
            <div className="p-4 border-t border-gray-200 shrink-0">
              <div className="flex items-center gap-2">
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
                <button onClick={() => fileInputRef.current?.click()} className="p-2 rounded-full hover:bg-gray-100 text-gray-500 shrink-0" title={language === 'ja' ? '画像を添付' : 'Attach image'}>
                  <ImageIcon className="w-5 h-5" />
                </button>
                <Input value={newMessage} onChange={(e) => setNewMessage(e.target.value)} onKeyPress={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }} placeholder={t.typeMessage} className="flex-1" />
                <Button onClick={handleSendMessage} disabled={(!newMessage.trim() && !pendingFile) || sending} className="bg-[#49B1E4] hover:bg-[#3A9BD4] px-4"><Send className="w-4 h-4" /></Button>
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
