import { useState, useRef, useEffect, type Dispatch, type SetStateAction } from 'react';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Send, Images, Calendar, Clock, MapPin, X, FileText } from 'lucide-react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faImage, faFileLines, faCalendarDays, faImages, faPlus } from '@fortawesome/free-solid-svg-icons';
import type { Language, User, Message as AppMessage, MessageMention, MessageThread, ChatThreadMetadata, Event, GalleryPhoto } from '@truss/core';
import { formatDateLabel, formatEventDateNoHyphen, formatMessageTime, getChatAttachmentSignedUrl, parseMessageDate, splitTextWithUrls, toDateKey } from '@truss/core';
import { useData } from '../../contexts/DataContext';
import { toast } from 'sonner';
import { linkifyText } from '../../lib/linkify';
import { LinkPreviewCard } from './LinkPreviewCard';

interface MessagesPageProps {
  language: Language;
  user: User;
  recipientName: string;
  recipientAvatar: string;
  isAdmin?: boolean;
  messageHistory: MessageHistory;
  setMessageHistory: (history: MessageHistory | ((prev: MessageHistory) => MessageHistory)) => void;
  messageThreads: MessageThread;
  onUpdateMessageThreads: Dispatch<SetStateAction<MessageThread>>;
  chatThreadMetadata: ChatThreadMetadata;
  onUpdateChatThreadMetadata: Dispatch<SetStateAction<ChatThreadMetadata>>;
}
interface Message { id: number; sender: 'user' | 'other'; text: string; time: string; isBroadcast?: boolean; broadcastSubject?: string; broadcastSubjectEn?: string; read?: boolean; attachmentPath?: string; attachmentType?: string; mention?: MessageMention; }
interface MessageHistory { [recipientId: string]: Message[]; }
const translations = {
  ja: { typeMessage: 'メッセージを入力...', attachPhoto: '写真', attachFile: 'ファイル', attachEvent: 'イベント', attachMemory: '思い出', noUpcomingEvents: '開催予定のイベントはありません', noMemories: '写真はまだありません', backToMenu: '戻る' },
  en: { typeMessage: 'Type a message...', attachPhoto: 'Photo', attachFile: 'File', attachEvent: 'Event', attachMemory: 'Memories', noUpcomingEvents: 'No upcoming events', noMemories: 'No photos yet', backToMenu: 'Back' },
};

export function MessagesPage({ language, user, recipientName, recipientAvatar, isAdmin = false, messageHistory, setMessageHistory, messageThreads, onUpdateMessageThreads }: MessagesPageProps) {
  const t = translations[language];
  const { markAllMessagesAsReadForUser, sendMessage, uploadChatAttachment, approvedMembers, staffInboxUserId, events, galleryPhotos } = useData();
  const hasMarkedAsRead = useRef(false);
  useEffect(() => { if (isAdmin && user.id && !hasMarkedAsRead.current) { hasMarkedAsRead.current = true; markAllMessagesAsReadForUser(user.id); } }, [isAdmin, user.id, markAllMessagesAsReadForUser]);
  const getInitialMessage = () => ({ id: 1, sender: 'other' as const, text: language === 'ja' ? 'こんにちは！リアクションありがとうございます。' : 'Hello! Thanks for your reaction.', time: '14:30' });
  const recipientId = recipientName;
  const [messages, setMessages] = useState<Message[]>(messageHistory[recipientId] || [getInitialMessage()]);
  const [newMessage, setNewMessage] = useState('');
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingPreviewUrl, setPendingPreviewUrl] = useState<string | null>(null);
  const [pendingMention, setPendingMention] = useState<MessageMention | null>(null);
  const [attachMenuOpen, setAttachMenuOpen] = useState(false);
  const [attachPanelMode, setAttachPanelMode] = useState<'grid' | 'event' | 'memory'>('grid');
  const [sending, setSending] = useState(false);
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  const imageInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  useEffect(() => { setMessages(messageHistory[recipientId] || [getInitialMessage()]); }, [recipientId, isAdmin, language]);
  useEffect(() => {
    if (!(isAdmin && messageThreads[user.id])) return;
    const threadMessages = messageThreads[user.id];
    const converted: Message[] = threadMessages.map((msg) => ({ id: msg.id, sender: msg.isAdmin ? 'other' : 'user', text: msg.text, time: msg.time, isBroadcast: msg.isBroadcast, broadcastSubject: msg.broadcastSubject, broadcastSubjectEn: msg.broadcastSubjectEn, read: msg.read, attachmentPath: msg.attachmentPath, attachmentType: msg.attachmentType, mention: msg.mention }));
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
    setPendingPreviewUrl(file.type.startsWith('image/') ? URL.createObjectURL(file) : null);
    closeAttachMenu();
  };
  const clearPendingFile = () => {
    if (pendingPreviewUrl) URL.revokeObjectURL(pendingPreviewUrl);
    setPendingFile(null);
    setPendingPreviewUrl(null);
  };
  const closeAttachMenu = () => {
    setAttachMenuOpen(false);
    setAttachPanelMode('grid');
  };
  const toggleAttachMenu = () => {
    if (attachMenuOpen) closeAttachMenu();
    else setAttachMenuOpen(true);
  };
  const handleShareEvent = (event: Event) => {
    setPendingMention({
      type: 'event',
      id: event.id,
      title: language === 'ja' ? (event.titleJa ?? event.title) : (event.titleEn ?? event.title),
      dateLabel: formatEventDateNoHyphen(event.date),
      timeLabel: event.time,
    });
    closeAttachMenu();
  };
  const handleShareMemory = (photo: GalleryPhoto) => {
    setPendingMention({
      type: 'memory',
      id: photo.id,
      title: photo.eventName,
      dateLabel: formatEventDateNoHyphen(photo.eventDate),
      imageUrl: typeof photo.image === 'string' ? photo.image : photo.image.src,
    });
    closeAttachMenu();
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() && !pendingFile && !pendingMention) return;
    const text = newMessage.trim();
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
      const fallbackText =
        (pendingFile && !pendingFile.type.startsWith('image/') ? pendingFile.name : undefined) ??
        (pendingMention ? `${pendingMention.title}について` : '（添付ファイル）');
      await sendMessage(adminUserId, text || fallbackText, false, { attachmentPath, attachmentType, mention: pendingMention ?? undefined });
      setNewMessage('');
      clearPendingFile();
      setPendingMention(null);
    } catch {
      toast.error(language === 'ja' ? 'メッセージ送信に失敗しました' : 'Failed to send message');
    } finally {
      setSending(false);
    }
  };
  const renderMessage = (message: Message) => {
    const attachmentUrl = message.attachmentPath ? signedUrls[message.attachmentPath] : undefined;
    const firstLinkUrl = message.text ? splitTextWithUrls(message.text).find((s) => s.type === 'url')?.value : undefined;
    const isImageAttachment = !!attachmentUrl && (!message.attachmentType || message.attachmentType.startsWith('image/'));
    const isAudioAttachment = !!attachmentUrl && !!message.attachmentType?.startsWith('audio/');
    const isFileAttachment = !!attachmentUrl && !isImageAttachment && !isAudioAttachment;
    const autoFallbackText = message.mention ? `${message.mention.title}について` : isAudioAttachment ? 'ボイスメッセージ' : '（添付ファイル）';
    const hasCaption = !isFileAttachment && !isAudioAttachment && !!message.text && message.text !== autoFallbackText;
    return (
      <div key={message.id} className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'} group`}>
        <div className={`max-w-[75%] ${message.sender === 'user' ? 'order-2' : 'order-1'} relative`}>
          {/* メンション・吹き出し・リンクプレビューは同じflex-colにまとめ、items-end/startで揃えることで
              互いの端(送信者側なら右端、相手側なら左端)を必ず一致させる */}
          <div className={`flex flex-col gap-1 ${message.sender === 'user' ? 'items-end' : 'items-start'}`}>
            {message.mention && (() => {
              const mention = message.mention;
              const isClickableLocation = mention.type === 'location' && !!mention.url;
              return (
                <div
                  className={`flex items-center gap-2 rounded-xl border border-[#49B1E4] bg-[#49B1E4]/10 p-2 max-w-[260px] ${isClickableLocation ? 'cursor-pointer hover:bg-[#49B1E4]/20 transition-colors' : ''}`}
                  onClick={isClickableLocation ? () => window.open(mention.url, '_blank', 'noopener,noreferrer') : undefined}
                  role={isClickableLocation ? 'button' : undefined}
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
              <div className={`rounded-2xl px-4 py-2 relative ${message.sender === 'user' ? 'bg-[#49B1E4] text-white' : 'bg-white text-[#3D3D4E]'}`}>
                {isImageAttachment && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={attachmentUrl} alt="添付画像" className="max-w-[220px] rounded-lg mb-1" />
                )}
                {isFileAttachment && (
                  <a
                    href={attachmentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`flex items-center gap-2 mb-1 underline ${message.sender === 'user' ? 'text-white' : 'text-[#49B1E4]'}`}
                  >
                    <FileText className="w-4 h-4 shrink-0" />
                    <span className="truncate">{message.text || 'ファイル'}</span>
                  </a>
                )}
                {isAudioAttachment && <audio controls src={attachmentUrl} className="max-w-[220px] mb-1 h-10" />}
                {hasCaption && (
                  <p className="wrap-break-word whitespace-pre-wrap">{linkifyText(message.text)}</p>
                )}
              </div>
            )}
            {firstLinkUrl && <LinkPreviewCard url={firstLinkUrl} />}
          </div>
          <div className={`flex items-center gap-1 mt-1 ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
            <p className="text-xs text-[#6B6B7A]">
              {formatMessageTime(message.time)}
              {message.sender === 'user' && message.read ? `　${language === 'ja' ? '既読' : 'Read'}` : ''}
            </p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col bg-[#F5F1E8] h-full">
      <div className="bg-white border-b border-[#E8E4DB] px-4 py-3 flex items-center gap-3 shrink-0">
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
      {(pendingFile || pendingMention) && (
        <div className="bg-white px-4 py-2 flex items-center gap-3 shrink-0 border-t border-[#E8E4DB]">
          {pendingFile && pendingPreviewUrl && (
            <div className="flex items-center gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={pendingPreviewUrl} alt="添付プレビュー" className="w-12 h-12 rounded-lg object-cover" />
              <button onClick={clearPendingFile} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
            </div>
          )}
          {pendingFile && !pendingPreviewUrl && (
            <div className="flex items-center gap-2 bg-[#F5F1E8] rounded-lg px-3 py-2 min-w-0">
              <FileText className="w-4 h-4 text-[#49B1E4] shrink-0" />
              <span className="text-sm text-[#3D3D4E] truncate">{pendingFile.name}</span>
              <button onClick={clearPendingFile} className="text-gray-400 hover:text-gray-600 shrink-0"><X className="w-4 h-4" /></button>
            </div>
          )}
          {pendingMention && (
            <div className="flex items-center gap-2 rounded-xl border border-[#49B1E4] bg-[#49B1E4]/10 px-3 py-2 min-w-0">
              {pendingMention.type === 'event' ? (
                <Calendar className="w-4 h-4 text-[#49B1E4] shrink-0" />
              ) : (
                <Images className="w-4 h-4 text-[#49B1E4] shrink-0" />
              )}
              <div className="min-w-0">
                <p className="text-sm text-[#49B1E4] truncate">{pendingMention.title}</p>
                {pendingMention.dateLabel && <p className="text-xs text-gray-500 truncate">{pendingMention.dateLabel}</p>}
              </div>
              <button onClick={() => setPendingMention(null)} className="text-gray-400 hover:text-gray-600 shrink-0"><X className="w-4 h-4" /></button>
            </div>
          )}
        </div>
      )}
      {attachMenuOpen && (
        <div className="bg-white border-t border-[#E8E4DB] px-4 py-3 shrink-0">
          {attachPanelMode === 'grid' && (
            <div className="grid grid-cols-4 gap-2">
              <button onClick={() => imageInputRef.current?.click()} className="flex flex-col items-center gap-1.5 py-2 rounded-xl hover:bg-[#F5F1E8] transition-colors">
                <span className="w-12 h-12 rounded-full flex items-center justify-center bg-[#3B82F6]/10">
                  <FontAwesomeIcon icon={faImage} className="w-5 h-5 text-[#3B82F6]" />
                </span>
                <span className="text-xs text-[#3D3D4E]">{t.attachPhoto}</span>
              </button>
              <button onClick={() => fileInputRef.current?.click()} className="flex flex-col items-center gap-1.5 py-2 rounded-xl hover:bg-[#F5F1E8] transition-colors">
                <span className="w-12 h-12 rounded-full flex items-center justify-center bg-[#8B5CF6]/10">
                  <FontAwesomeIcon icon={faFileLines} className="w-5 h-5 text-[#8B5CF6]" />
                </span>
                <span className="text-xs text-[#3D3D4E]">{t.attachFile}</span>
              </button>
              <button onClick={() => setAttachPanelMode('event')} className="flex flex-col items-center gap-1.5 py-2 rounded-xl hover:bg-[#F5F1E8] transition-colors">
                <span className="w-12 h-12 rounded-full flex items-center justify-center bg-[#F59E0B]/10">
                  <FontAwesomeIcon icon={faCalendarDays} className="w-5 h-5 text-[#F59E0B]" />
                </span>
                <span className="text-xs text-[#3D3D4E]">{t.attachEvent}</span>
              </button>
              <button onClick={() => setAttachPanelMode('memory')} className="flex flex-col items-center gap-1.5 py-2 rounded-xl hover:bg-[#F5F1E8] transition-colors">
                <span className="w-12 h-12 rounded-full flex items-center justify-center bg-[#EC4899]/10">
                  <FontAwesomeIcon icon={faImages} className="w-5 h-5 text-[#EC4899]" />
                </span>
                <span className="text-xs text-[#3D3D4E]">{t.attachMemory}</span>
              </button>
            </div>
          )}
          {attachPanelMode === 'event' && (
            <div className="max-h-64 overflow-y-auto space-y-1">
              {events.filter((event) => event.status === 'upcoming').length === 0 ? (
                <p className="text-sm text-[#6B6B7A] text-center py-6">{t.noUpcomingEvents}</p>
              ) : (
                events.filter((event) => event.status === 'upcoming').map((event) => (
                  <button key={event.id} onClick={() => handleShareEvent(event)} className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-[#F5F1E8] transition-colors text-left">
                    <span className="w-9 h-9 rounded-full bg-[#F59E0B]/10 flex items-center justify-center shrink-0">
                      <FontAwesomeIcon icon={faCalendarDays} className="w-4 h-4 text-[#F59E0B]" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm text-[#3D3D4E] truncate">{language === 'ja' ? (event.titleJa ?? event.title) : (event.titleEn ?? event.title)}</span>
                      <span className="block text-xs text-[#6B6B7A] truncate">{formatEventDateNoHyphen(event.date)} {event.time}</span>
                    </span>
                  </button>
                ))
              )}
            </div>
          )}
          {attachPanelMode === 'memory' && (
            <div className="max-h-64 overflow-y-auto">
              {galleryPhotos.filter((photo) => photo.approved).length === 0 ? (
                <p className="text-sm text-[#6B6B7A] text-center py-6">{t.noMemories}</p>
              ) : (
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5">
                  {galleryPhotos.filter((photo) => photo.approved).map((photo) => (
                    <button key={photo.id} onClick={() => handleShareMemory(photo)} className="relative aspect-square rounded-lg overflow-hidden hover:opacity-80 transition-opacity">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={typeof photo.image === 'string' ? photo.image : photo.image.src} alt={photo.eventName} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          {attachPanelMode !== 'grid' && (
            <button onClick={() => setAttachPanelMode('grid')} className="mt-2 text-sm text-[#49B1E4] hover:underline">{t.backToMenu}</button>
          )}
        </div>
      )}
      <div className="bg-white border-t border-[#E8E4DB] px-4 py-3 flex items-center gap-2 shrink-0 sticky bottom-0">
        <input ref={imageInputRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
        <input ref={fileInputRef} type="file" onChange={handleFileSelect} className="hidden" />
        <button
          onClick={toggleAttachMenu}
          className={`p-2 rounded-full transition-colors shrink-0 ${attachMenuOpen ? 'bg-[#49B1E4] text-white' : 'hover:bg-[#F5F1E8] text-[#6B6B7A]'}`}
          title={language === 'ja' ? '添付' : 'Attach'}
        >
          <FontAwesomeIcon icon={faPlus} className={`w-5 h-5 transition-transform ${attachMenuOpen ? 'rotate-45' : ''}`} />
        </button>
        <Input value={newMessage} onChange={(e) => setNewMessage(e.target.value)} onKeyPress={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }} placeholder={t.typeMessage} className="flex-1" />
        <Button onClick={handleSendMessage} disabled={(!newMessage.trim() && !pendingFile && !pendingMention) || sending} className="bg-[#49B1E4] hover:bg-[#3A9FD3] px-4"><Send className="w-4 h-4" /></Button>
      </div>
    </div>
  );
}
