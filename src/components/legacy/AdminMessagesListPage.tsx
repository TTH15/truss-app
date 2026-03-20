import { Mail, Clock } from 'lucide-react';
import type { Language } from '../../domain/types/app';

interface AdminMessagesListPageProps {
  language: Language;
  onMessageClick: (messageId: number) => void;
}

const translations = {
  ja: {
    title: '運営からのメッセージ',
    allRead: 'すべて既読',
    noMessages: 'メッセージはありません',
  },
  en: {
    title: 'Messages from Admin',
    allRead: 'All Read',
    noMessages: 'No messages',
  }
};

const mockMessages = [
  {
    id: 1,
    subject: '【重要】春の交流会について',
    subjectEn: '[Important] About Spring Meetup',
    preview: '春の交流会の開催日程が決定しました。詳細をご確認ください...',
    previewEn: 'The spring meetup date has been confirmed. Please check details...',
    time: '30分前',
    timeEn: '30m ago',
    isRead: false,
  },
  {
    id: 2,
    subject: '年会費のお支払いについて',
    subjectEn: 'About Annual Fee Payment',
    preview: '年会費のお支払い期限が近づいております。お早めにお手続きください...',
    previewEn: 'Annual fee payment deadline is approaching. Please proceed soon...',
    time: '2時間前',
    timeEn: '2h ago',
    isRead: false,
  },
  {
    id: 3,
    subject: 'プロフィール登録のお願い',
    subjectEn: 'Please Complete Your Profile',
    preview: 'プロフィール登録がまだ完了していません。ご協力をお願いします...',
    previewEn: 'Your profile registration is not yet complete. Your cooperation is appreciated...',
    time: '1日前',
    timeEn: '1d ago',
    isRead: true,
  },
  {
    id: 4,
    subject: '新しいイベントのお知らせ',
    subjectEn: 'New Event Announcement',
    preview: '来月開催予定の新しいイベントについてお知らせします...',
    previewEn: 'We would like to announce a new event scheduled for next month...',
    time: '3日前',
    timeEn: '3d ago',
    isRead: true,
  },
];

export function AdminMessagesListPage({ language, onMessageClick }: AdminMessagesListPageProps) {
  const t = translations[language];

  const unreadCount = mockMessages.filter(m => !m.isRead).length;

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#3D3D4E]">{t.title}</h1>
            {unreadCount > 0 && (
              <p className="text-sm text-gray-600 mt-1">
                {language === 'ja' ? `未読 ${unreadCount}件` : `${unreadCount} unread`}
              </p>
            )}
          </div>
          <div className="w-12 h-12 rounded-full bg-[#49B1E4] flex items-center justify-center">
            <Mail className="w-6 h-6 text-white" />
          </div>
        </div>
      </div>

      {/* Messages List */}
      <div className="space-y-3">
        {mockMessages.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <Mail className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">{t.noMessages}</p>
          </div>
        ) : (
          mockMessages.map((message) => (
            <button
              key={message.id}
              onClick={() => onMessageClick(message.id)}
              className={`w-full bg-white rounded-lg shadow-sm p-4 text-left transition-all hover:shadow-md ${
                !message.isRead ? 'border-l-4 border-[#49B1E4]' : ''
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                  !message.isRead ? 'bg-[#49B1E4]' : 'bg-gray-200'
                }`}>
                  <Mail className={`w-5 h-5 ${!message.isRead ? 'text-white' : 'text-gray-500'}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className={`font-semibold ${!message.isRead ? 'text-[#3D3D4E]' : 'text-gray-600'}`}>
                      {language === 'ja' ? message.subject : message.subjectEn}
                    </h3>
                    {!message.isRead && (
                      <span className="ml-2 px-2 py-0.5 bg-red-500 text-white text-xs rounded-full shrink-0">
                        NEW
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                    {language === 'ja' ? message.preview : message.previewEn}
                  </p>
                  <div className="flex items-center gap-1 text-xs text-gray-400">
                    <Clock className="w-3 h-3" />
                    <span>{language === 'ja' ? message.time : message.timeEn}</span>
                  </div>
                </div>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
