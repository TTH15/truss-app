import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Badge } from '../ui/badge';
import { Plus, Send, Trash2, Mail, Users, Calendar, MessageSquare, Bell } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Checkbox } from '../ui/checkbox';
import type { Language } from '../../domain/types/app';

interface AdminNotificationsProps {
  language: Language;
}

const translations = {
  ja: {
    title: '通知管理',
    createNotification: '新しい通知を作成',
    sendNotification: '通知を送信',
    subject: '件名',
    message: 'メッセージ',
    recipients: '送信先',
    allMembers: '全メンバー',
    japanese: '日本人学生・国内学生のみ',
    international: '留学生のみ',
    eventParticipants: '特定イベントの参加者',
    send: '送信する',
    cancel: 'キャンセル',
    delete: '削除',
    scheduled: '予約送信',
    sent: '送信済み',
    draft: '下書き',
    recipientCount: '送信先人数',
    notificationHistory: '通知履歴',
    selectEventForParticipants: '参加者に送信するイベントを選択',
    notificationType: '通知タイプ',
    emailNotification: 'メール通知',
    inAppNotification: 'アプリ内通知',
    bothNotifications: '両方',
    scheduledDate: '送信日時',
    selectDateTime: '日時を選択してください',
  },
  en: {
    title: 'Notification Management',
    createNotification: 'Create New Notification',
    sendNotification: 'Send Notification',
    subject: 'Subject',
    message: 'Message',
    recipients: 'Recipients',
    allMembers: 'All Members',
    japanese: 'Japanese Students Only',
    international: 'International Students Only',
    eventParticipants: 'Event Participants',
    send: 'Send',
    cancel: 'Cancel',
    delete: 'Delete',
    scheduled: 'Scheduled',
    sent: 'Sent',
    draft: 'Draft',
    recipientCount: 'Recipients',
    notificationHistory: 'Notification History',
    selectEventForParticipants: 'Select event for participants',
    notificationType: 'Notification Type',
    emailNotification: 'Email Notification',
    inAppNotification: 'In-App Notification',
    bothNotifications: 'Both',
    scheduledDate: 'Scheduled Date & Time',
    selectDateTime: 'Please select date and time',
  }
};

export function AdminNotifications({ language }: AdminNotificationsProps) {
  const t = translations[language];
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({ subject: '', message: '', recipients: 'all', eventId: '', notificationType: 'email', scheduledDate: '' });
  const [notifications, setNotifications] = useState([
    { id: 1, subject: language === 'ja' ? 'お花見パーティー開催のお知らせ' : 'Cherry Blossom Party Announcement', message: language === 'ja' ? '3月28日に上野公園でお花見パーティーを開催します！' : 'We will hold a cherry blossom party at Ueno Park on March 28!', recipients: 'all', recipientCount: 48, status: 'sent', sentTime: '2025-11-07 10:30', type: 'newEvent', notificationType: 'both' },
    { id: 2, subject: language === 'ja' ? '言語交換カフェのリマインダー' : 'Language Exchange Cafe Reminder', message: language === 'ja' ? '明日18:00から言語交換カフェがあります。お忘れなく！' : 'Language exchange cafe is tomorrow at 18:00. Don\'t forget!', recipients: 'event', recipientCount: 25, status: 'sent', sentTime: '2025-11-06 15:00', type: 'reminder', notificationType: 'inApp' },
    { id: 3, subject: language === 'ja' ? '年会費のお知らせ' : 'Annual Fee Notice', message: language === 'ja' ? '年会費の支払いをお願いします。' : 'Please pay your annual membership fee.', recipients: 'all', recipientCount: 48, status: 'scheduled', sentTime: '2025-11-10 09:00', type: 'general', notificationType: 'email' },
  ]);

  const events = [
    { id: 1, name: language === 'ja' ? 'お花見パーティー' : 'Cherry Blossom Party' },
    { id: 2, name: language === 'ja' ? '国際料理大会' : 'International Cooking Contest' },
    { id: 3, name: language === 'ja' ? '言語交換カフェ' : 'Language Exchange Cafe' },
  ];

  const handleSend = () => {
    const isScheduled = formData.scheduledDate && new Date(formData.scheduledDate) > new Date();
    const newNotification = {
      id: notifications.length + 1,
      subject: formData.subject,
      message: formData.message,
      recipients: formData.recipients,
      recipientCount: formData.recipients === 'all' ? 48 : formData.recipients === 'japanese' ? 32 : 16,
      status: isScheduled ? 'scheduled' : 'sent',
      sentTime: isScheduled ? formData.scheduledDate : new Date().toLocaleString('ja-JP'),
      type: 'general',
      notificationType: formData.notificationType,
    };
    setNotifications([newNotification, ...notifications]);
    setFormData({ subject: '', message: '', recipients: 'all', eventId: '', notificationType: 'email', scheduledDate: '' });
    setIsDialogOpen(false);
  };

  const handleDelete = (id: number) => {
    if (confirm(language === 'ja' ? '本当に削除しますか？' : 'Are you sure you want to delete?')) setNotifications(notifications.filter((n) => n.id !== id));
  };

  const getStatusBadge = (status: string) => status === 'sent' ? <Badge className="bg-green-100 text-green-800">{t.sent}</Badge> : status === 'scheduled' ? <Badge className="bg-blue-100 text-blue-800">{t.scheduled}</Badge> : <Badge className="bg-gray-100 text-gray-800">{t.draft}</Badge>;
  const getTypeIcon = (type: string) => type === 'newEvent' ? <Calendar className="w-4 h-4" /> : type === 'reminder' ? <MessageSquare className="w-4 h-4" /> : <Mail className="w-4 h-4" />;
  const getNotificationTypeLabel = (notificationType: string) => notificationType === 'email' ? <div className="flex items-center gap-1"><Mail className="w-4 h-4" /><span>{t.emailNotification}</span></div> : notificationType === 'inApp' ? <div className="flex items-center gap-1"><Bell className="w-4 h-4" /><span>{t.inAppNotification}</span></div> : <div className="flex items-center gap-1"><Mail className="w-4 h-4" /><Bell className="w-4 h-4" /><span>{t.bothNotifications}</span></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-gray-900">{t.title}</h2>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-purple-600 hover:bg-purple-700"><Plus className="w-4 h-4 mr-2" />{t.createNotification}</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader><DialogTitle>{t.sendNotification}</DialogTitle><DialogDescription>{language === 'ja' ? 'メンバーにメール通知を送信します' : 'Send email notification to members'}</DialogDescription></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2"><Label htmlFor="subject">{t.subject}</Label><Input id="subject" value={formData.subject} onChange={(e) => setFormData({ ...formData, subject: e.target.value })} /></div>
              <div className="space-y-2"><Label htmlFor="message">{t.message}</Label><Textarea id="message" value={formData.message} onChange={(e) => setFormData({ ...formData, message: e.target.value })} rows={5} /></div>
              <div className="space-y-3">
                <Label>{t.recipients}</Label>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2"><Checkbox id="all" checked={formData.recipients === 'all'} onCheckedChange={() => setFormData({ ...formData, recipients: 'all' })} /><label htmlFor="all" className="text-sm cursor-pointer">{t.allMembers} (48人)</label></div>
                  <div className="flex items-center space-x-2"><Checkbox id="japanese" checked={formData.recipients === 'japanese'} onCheckedChange={() => setFormData({ ...formData, recipients: 'japanese' })} /><label htmlFor="japanese" className="text-sm cursor-pointer">{t.japanese} (32人)</label></div>
                  <div className="flex items-center space-x-2"><Checkbox id="international" checked={formData.recipients === 'international'} onCheckedChange={() => setFormData({ ...formData, recipients: 'international' })} /><label htmlFor="international" className="text-sm cursor-pointer">{t.international} (16人)</label></div>
                  <div className="flex items-center space-x-2"><Checkbox id="event" checked={formData.recipients === 'event'} onCheckedChange={() => setFormData({ ...formData, recipients: 'event' })} /><label htmlFor="event" className="text-sm cursor-pointer">{t.eventParticipants}</label></div>
                  {formData.recipients === 'event' && <div className="ml-6 mt-2"><Label className="text-xs">{t.selectEventForParticipants}</Label><select className="w-full mt-1 px-3 py-2 border rounded-md text-sm" value={formData.eventId} onChange={(e) => setFormData({ ...formData, eventId: e.target.value })}><option value="">Select event...</option>{events.map((event) => <option key={event.id} value={event.id}>{event.name}</option>)}</select></div>}
                </div>
              </div>
              <div className="space-y-2">
                <Label>{t.notificationType}</Label>
                <div className="space-y-1">
                  <div className="flex items-center space-x-2"><Checkbox id="email" checked={formData.notificationType === 'email'} onCheckedChange={() => setFormData({ ...formData, notificationType: 'email' })} /><label htmlFor="email" className="text-sm cursor-pointer">{t.emailNotification}</label></div>
                  <div className="flex items-center space-x-2"><Checkbox id="inApp" checked={formData.notificationType === 'inApp'} onCheckedChange={() => setFormData({ ...formData, notificationType: 'inApp' })} /><label htmlFor="inApp" className="text-sm cursor-pointer">{t.inAppNotification}</label></div>
                  <div className="flex items-center space-x-2"><Checkbox id="both" checked={formData.notificationType === 'both'} onCheckedChange={() => setFormData({ ...formData, notificationType: 'both' })} /><label htmlFor="both" className="text-sm cursor-pointer">{t.bothNotifications}</label></div>
                </div>
              </div>
              <div className="space-y-2"><Label>{t.scheduledDate}</Label><input type="datetime-local" className="w-full px-3 py-2 border rounded-md text-sm" value={formData.scheduledDate} onChange={(e) => setFormData({ ...formData, scheduledDate: e.target.value })} /><p className="text-xs text-gray-500">{t.selectDateTime}</p></div>
              <div className="flex gap-2"><Button onClick={handleSend} className="flex-1 bg-purple-600 hover:bg-purple-700"><Send className="w-4 h-4 mr-2" />{t.send}</Button><Button variant="outline" onClick={() => setIsDialogOpen(false)} className="flex-1">{t.cancel}</Button></div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      <div>
        <h3 className="text-gray-900 mb-4">{t.notificationHistory}</h3>
        <div className="space-y-3">
          {notifications.map((notification) => (
            <Card key={notification.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="text-purple-600 mt-1">{getTypeIcon(notification.type)}</div>
                    <div className="flex-1"><div className="flex items-center gap-2 mb-2"><CardTitle className="text-lg">{notification.subject}</CardTitle>{getStatusBadge(notification.status)}</div><CardDescription>{notification.message}</CardDescription></div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(notification.id)}><Trash2 className="w-4 h-4 text-red-600" /></Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <div className="flex items-center gap-1"><Users className="w-4 h-4" />{notification.recipientCount} {t.recipientCount}</div>
                  <div className="flex items-center gap-1"><Mail className="w-4 h-4" />{notification.sentTime}</div>
                  <div className="flex items-center gap-1">{getNotificationTypeLabel(notification.notificationType)}</div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
