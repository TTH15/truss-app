import { useState } from 'react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Card, CardContent } from '../ui/card';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Send, MessageCircle, Users, Clock, Mail, Bell, Plus, ArrowLeftRight } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Checkbox } from '../ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { toast } from 'sonner';
import { AdminChatMessages } from './AdminChatMessages';
import { translateText } from '../../utils/translate';
import type { Language, MessageThread, User as UserType, ChatThreadMetadata } from '../../domain/types/app';

interface AdminChatProps {
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

interface BroadcastMessage { id: number; subject: string; message: string; recipients: string; recipientCount: number; status: 'sent' | 'scheduled'; sentTime: string; notificationType: 'email' | 'inApp' | 'both'; }

const translations = {
  ja: { sendBroadcast: '新規送信', recipients: '送信先', japanese: '日本人学生・国内学生のみ', exchange: '交換留学生のみ', regularInternational: '正規留学生のみ', notificationType: '通知タイプ', inAppNotification: 'アプリ内通知', emailNotification: 'メール通知', scheduledDate: '送信日時', selectDateTime: '空欄の場合は即時送信', send: '送信', cancel: 'キャンセル', sent: '送信済み', scheduled: '予約送信', members: 'メンバー', broadcastHistory: '一斉送信履歴', memberChat: 'メンバーチャット', broadcast: '一斉送信', translateToEnglish: '英語に翻訳' },
  en: { sendBroadcast: 'New Broadcast', recipients: 'Recipients', japanese: 'Japanese Students Only', exchange: 'Exchange Students Only', regularInternational: 'Regular International Students Only', notificationType: 'Notification Type', inAppNotification: 'In-App Notification', emailNotification: 'Email Notification', scheduledDate: 'Scheduled Date/Time', selectDateTime: 'Leave empty for immediate send', send: 'Send', cancel: 'Cancel', sent: 'Sent', scheduled: 'Scheduled', members: 'Members', broadcastHistory: 'Broadcast History', memberChat: 'Member Chat', broadcast: 'Broadcast', translateToEnglish: 'Translate to English' }
};

export function AdminChat({ language, messageThreads, onUpdateMessageThreads, onSendMessage, approvedMembers, pendingUsers, chatThreadMetadata, onUpdateChatThreadMetadata, selectedChatUserId, onOpenMemberChat }: AdminChatProps) {
  const t = translations[language];
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [year, setYear] = useState('2026');
  const [monthDay, setMonthDay] = useState('');
  const [time, setTime] = useState('');
  const [notificationTypes, setNotificationTypes] = useState<string[]>(['inApp']);
  const [activeTab, setActiveTab] = useState<'chat' | 'broadcast'>('chat');
  const [selectedRecipients, setSelectedRecipients] = useState<string[]>(['all']);
  const [subjectJa, setSubjectJa] = useState('');
  const [subjectEn, setSubjectEn] = useState('');
  const [messageJa, setMessageJa] = useState('');
  const [messageEn, setMessageEn] = useState('');
  const years = Array.from({ length: 7 }, (_, i) => (2024 + i).toString());
  const [broadcasts, setBroadcasts] = useState<BroadcastMessage[]>([]);

  const getRecipientLabel = (recipients: string) => recipients;
  const getNotificationTypeIcon = (type: string) => type === 'email' ? <Mail className="w-4 h-4" /> : type === 'inApp' ? <Bell className="w-4 h-4" /> : <><Mail className="w-4 h-4" /><Bell className="w-4 h-4" /></>;
  const toggleNotificationType = (type: string) => notificationTypes.includes(type) ? setNotificationTypes(notificationTypes.filter((t) => t !== type)) : setNotificationTypes([...notificationTypes, type]);
  const toggleRecipient = (recipient: string) => selectedRecipients.includes(recipient) ? setSelectedRecipients(selectedRecipients.filter((r) => r !== recipient)) : setSelectedRecipients([...selectedRecipients, recipient]);

  const handleTranslateJaToEn = async () => {
    if (!subjectJa.trim() && !messageJa.trim()) return toast.error(language === 'ja' ? '翻訳する内容を入力してください' : 'Please enter text to translate');
    toast.loading(language === 'ja' ? '翻訳中...' : 'Translating...');
    try {
      const translatedSubject = subjectJa.trim() ? await translateText(subjectJa, 'en') : '';
      const translatedMessage = messageJa.trim() ? await translateText(messageJa, 'en') : '';
      if (translatedSubject) setSubjectEn(translatedSubject);
      if (translatedMessage) setMessageEn(translatedMessage);
      toast.dismiss();
      toast.success(language === 'ja' ? '翻訳が完了しました' : 'Translation completed');
    } catch {
      toast.dismiss();
      toast.error(language === 'ja' ? '翻訳に失敗しました' : 'Translation failed');
    }
  };

  const handleSendBroadcast = () => {
    const isScheduled = year && monthDay && time && new Date(`${year}-${monthDay}T${time}`) > new Date();
    const notifType = notificationTypes.includes('inApp') && notificationTypes.includes('email') ? 'both' : notificationTypes.includes('email') ? 'email' : 'inApp';
    const newBroadcast: BroadcastMessage = { id: broadcasts.length + 1, subject: subjectJa || subjectEn, message: messageJa || messageEn, recipients: selectedRecipients.join(', '), recipientCount: selectedRecipients.length === 1 && selectedRecipients[0] === 'all' ? (approvedMembers?.length || 0) : 0, status: isScheduled ? 'scheduled' : 'sent', sentTime: isScheduled ? `${year}-${monthDay}T${time}` : new Date().toLocaleString('ja-JP'), notificationType: notifType as BroadcastMessage['notificationType'] };
    setBroadcasts([newBroadcast, ...broadcasts]);
    setSubjectJa(''); setSubjectEn(''); setMessageJa(''); setMessageEn(''); setSelectedRecipients(['all']); setNotificationTypes(['inApp']); setYear('2026'); setMonthDay(''); setTime(''); setIsDialogOpen(false);
    toast.success(language === 'ja' ? '送信しました' : 'Sent');
  };

  const totalUnreadCount = Object.keys(messageThreads).reduce((total, userId) => total + (messageThreads[userId] || []).filter((m) => !m.isAdmin && !m.read).length, 0);

  return (
    <div className="space-y-6">
      <div className="relative">
        <div className="flex items-start gap-2">
          <button onClick={() => setActiveTab('chat')} className="h-[50px] relative"><div className={`flex items-center gap-2 px-4 h-full border-b-2 ${activeTab === 'chat' ? 'border-[#3D3D4E]' : 'border-transparent'}`}><MessageCircle className={`w-5 h-5 ${activeTab === 'chat' ? 'text-[#3D3D4E]' : 'text-[#6B6B7A]'}`} strokeWidth={1.66667} /><span className={`font-normal leading-[24px] text-[16px] tracking-[-0.3125px] ${activeTab === 'chat' ? 'text-[#3D3D4E]' : 'text-[#6B6B7A]'}`}>{t.memberChat}</span>{totalUnreadCount > 0 && <div className="bg-red-500 text-white text-xs rounded-full h-5 min-w-[20px] px-1.5 flex items-center justify-center font-medium">{totalUnreadCount}</div>}</div></button>
          <button onClick={() => setActiveTab('broadcast')} className="h-[50px] relative"><div className={`flex items-center gap-2 px-4 h-full border-b-2 ${activeTab === 'broadcast' ? 'border-[#3D3D4E]' : 'border-transparent'}`}><Send className={`w-5 h-5 ${activeTab === 'broadcast' ? 'text-[#3D3D4E]' : 'text-[#6B6B7A]'}`} strokeWidth={1.66667} /><span className={`font-normal leading-[24px] text-[16px] tracking-[-0.3125px] ${activeTab === 'broadcast' ? 'text-[#3D3D4E]' : 'text-[#6B6B7A]'}`}>{t.broadcast}</span></div></button>
        </div>
        <div className="absolute bottom-0 left-0 right-0 border-b border-[#E5E7EB]" />
      </div>

      {activeTab === 'chat' && <AdminChatMessages language={language} messageThreads={messageThreads} onUpdateMessageThreads={onUpdateMessageThreads} onSendMessage={onSendMessage} approvedMembers={approvedMembers} pendingUsers={pendingUsers} chatThreadMetadata={chatThreadMetadata} onUpdateChatThreadMetadata={onUpdateChatThreadMetadata} selectedChatUserId={selectedChatUserId} onOpenMemberChat={onOpenMemberChat} />}

      {activeTab === 'broadcast' && (
        <div className="space-y-6">
          <div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <Button onClick={() => setIsDialogOpen(true)} className="bg-[#49B1E4] hover:bg-[#3A9BD4]"><Plus className="w-4 h-4 mr-2" />{t.sendBroadcast}</Button>
              <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader><DialogTitle>{t.sendBroadcast}</DialogTitle></DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>{t.recipients}</Label>
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 cursor-pointer"><Checkbox checked={selectedRecipients.includes('japanese')} onCheckedChange={() => toggleRecipient('japanese')} /><span className="text-sm">{t.japanese}</span></label>
                      <label className="flex items-center gap-2 cursor-pointer"><Checkbox checked={selectedRecipients.includes('exchange')} onCheckedChange={() => toggleRecipient('exchange')} /><span className="text-sm">{t.exchange}</span></label>
                      <label className="flex items-center gap-2 cursor-pointer"><Checkbox checked={selectedRecipients.includes('regularInternational')} onCheckedChange={() => toggleRecipient('regularInternational')} /><span className="text-sm">{t.regularInternational}</span></label>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between"><Label htmlFor="subject-ja">件名</Label><Button type="button" variant="outline" size="sm" onClick={handleTranslateJaToEn} className="text-xs h-7"><ArrowLeftRight className="w-3 h-3 mr-1" />{t.translateToEnglish}</Button></div>
                    <Textarea id="subject-ja" value={subjectJa} onChange={(e) => setSubjectJa(e.target.value)} placeholder="日本語" />
                    <Textarea id="subject-en" value={subjectEn} onChange={(e) => setSubjectEn(e.target.value)} placeholder="English" />
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between"><Label htmlFor="message-ja">メッセージ</Label><Button type="button" variant="outline" size="sm" onClick={handleTranslateJaToEn} className="text-xs h-7"><ArrowLeftRight className="w-3 h-3 mr-1" />{t.translateToEnglish}</Button></div>
                    <Textarea id="message-ja" value={messageJa} onChange={(e) => setMessageJa(e.target.value)} placeholder="日本語" rows={4} className="resize-none" />
                    <Textarea id="message-en" value={messageEn} onChange={(e) => setMessageEn(e.target.value)} placeholder="English" rows={4} className="resize-none" />
                  </div>
                  <div className="space-y-2">
                    <Label>{t.notificationType}</Label>
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 cursor-pointer"><Checkbox checked={notificationTypes.includes('inApp')} onCheckedChange={() => toggleNotificationType('inApp')} /><Bell className="w-4 h-4 text-gray-600" /><span className="text-sm">{t.inAppNotification}</span></label>
                      <label className="flex items-center gap-2 cursor-pointer"><Checkbox checked={notificationTypes.includes('email')} onCheckedChange={() => toggleNotificationType('email')} /><Mail className="w-4 h-4 text-gray-600" /><span className="text-sm">{t.emailNotification}</span></label>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="scheduledDate">{t.scheduledDate}</Label>
                    <div className="flex items-center gap-2">
                      <Select value={year} onValueChange={setYear}><SelectTrigger className="w-24"><SelectValue>{year}</SelectValue></SelectTrigger><SelectContent>{years.map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent></Select>
                      <span>/</span><Textarea value={monthDay} onChange={(e) => setMonthDay(e.target.value)} placeholder="4/7" className="w-16 min-h-0 h-10" />
                      <span>/</span><Textarea value={time} onChange={(e) => setTime(e.target.value)} placeholder="15:00" className="w-20 min-h-0 h-10" />
                    </div>
                    <p className="text-xs text-gray-500">{t.selectDateTime}</p>
                  </div>
                  <div className="flex justify-end gap-2 pt-4">
                    <Button variant="outline" onClick={() => setIsDialogOpen(false)}>{t.cancel}</Button>
                    <Button onClick={handleSendBroadcast} disabled={(!subjectJa && !subjectEn) || (!messageJa && !messageEn) || notificationTypes.length === 0} className="bg-[#49B1E4] hover:bg-[#3A9BD4] disabled:opacity-50 disabled:cursor-not-allowed"><Send className="w-4 h-4 mr-2" />{t.send}</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          <div className="space-y-4">
            <h3 className="font-medium text-gray-900">{t.broadcastHistory}</h3>
            <div className="space-y-2">
              {broadcasts.map((broadcast) => (
                <Card key={broadcast.id} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2"><h4 className="text-gray-900">{broadcast.subject}</h4><Badge className={broadcast.status === 'sent' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}>{broadcast.status === 'sent' ? t.sent : t.scheduled}</Badge></div>
                        <p className="text-sm text-gray-600 mb-3">{broadcast.message}</p>
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <div className="flex items-center gap-1"><Users className="w-4 h-4" /><span>{getRecipientLabel(broadcast.recipients)} ({broadcast.recipientCount} {t.members})</span></div>
                          <div className="flex items-center gap-1"><Clock className="w-4 h-4" /><span>{broadcast.sentTime}</span></div>
                          <div className="flex items-center gap-1">{getNotificationTypeIcon(broadcast.notificationType)}</div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
