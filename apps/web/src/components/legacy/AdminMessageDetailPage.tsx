import { ArrowLeft, Mail, Clock } from 'lucide-react';
import type { Language } from '../../domain/types/app';

interface AdminMessageDetailPageProps {
  language: Language;
  messageId: number;
  onBack: () => void;
}

const translations = {
  ja: {
    back: '戻る',
    from: '送信者',
    admin: '運営管理者',
  },
  en: {
    back: 'Back',
    from: 'From',
    admin: 'Admin',
  }
};

// メッセージデータ
const messageDetails: { [key: number]: any } = {
  1: {
    subject: '【重要】春の交流会について',
    subjectEn: '[Important] About Spring Meetup',
    time: '30分前',
    timeEn: '30m ago',
    content: `皆さん、こんにちは。

春の交流会の開催日程が決定しましたのでお知らせいたします。

【日時】
2025年3月28日（土）13:00〜17:00

【場所】
上野公園

【参加費】
無料

【持ち物】
・レジャーシート
・飲み物（アルコール不可）
・お菓子など（各自で持ち寄り）

【参加申込】
イベントページから参加登録をお願いします。
定員は50名となっておりますので、お早めにご登録ください。

皆さんのご参加をお待ちしております！

運営一同`,
    contentEn: `Hello everyone,

We are pleased to announce that the spring meetup date has been confirmed.

【Date & Time】
March 28, 2025 (Sat) 13:00-17:00

【Location】
Ueno Park

【Fee】
Free

【What to Bring】
- Picnic mat
- Drinks (no alcohol)
- Snacks (bring your own)

【Registration】
Please register through the event page.
Limited to 50 participants, so please register early.

We look forward to seeing you there!

Best regards,
Admin Team`,
  },
  2: {
    subject: '年会費のお支払いについて',
    subjectEn: 'About Annual Fee Payment',
    time: '2時間前',
    timeEn: '2h ago',
    content: `会員の皆様へ

年会費のお支払い期限が近づいておりますのでお知らせいたします。

【対象者】
日本人学生・国内学生

【金額】
3,000円

【支払期限】
2025年3月31日（月）

【支払方法】
プロフィールページの「年会費支払い」ボタンからお手続きください。

※交換留学生・正規留学生の方は年会費は不要です。

ご不明な点がございましたら、運営までお問い合わせください。

よろしくお願いいたします。

運営一同`,
    contentEn: `Dear Members,

This is a reminder that the annual fee payment deadline is approaching.

【Applicable to】
Japanese students and domestic students

【Amount】
3,000 yen

【Deadline】
March 31, 2025 (Mon)

【Payment Method】
Please proceed from the "Pay Annual Fee" button on your profile page.

※Exchange students and international students are exempt from the annual fee.

If you have any questions, please contact the admin team.

Thank you for your cooperation.

Best regards,
Admin Team`,
  },
  3: {
    subject: 'プロフィール登録のお願い',
    subjectEn: 'Please Complete Your Profile',
    time: '1日前',
    timeEn: '1d ago',
    content: `会員の皆様へ

プロフィール登録がまだ完了していない方へお知らせです。

円滑なコミュニケーションのため、以下の情報の登録をお願いいたします：

・ニックネーム
・生年月日
・話せる言語
・出身国
・自己紹介

プロフィールページから登録が可能です。

ご協力をよろしくお願いいたします。

運営一同`,
    contentEn: `Dear Members,

This is a reminder for those who have not yet completed their profile registration.

For smooth communication, please register the following information:

- Nickname
- Date of birth
- Languages spoken
- Country of origin
- Self-introduction

You can register from your profile page.

Thank you for your cooperation.

Best regards,
Admin Team`,
  },
  4: {
    subject: '新しいイベントのお知らせ',
    subjectEn: 'New Event Announcement',
    time: '3日前',
    timeEn: '3d ago',
    content: `皆さん、こんにちは。

来月開催予定の新しいイベントについてお知らせします。

【イベント名】
国際料理大会

【日時】
2025年4月15日（火）16:00〜20:00

【場所】
大学キャンパス調理室

【内容】
各国の伝統料理を作って競争します！
チームで協力して美味しい料理を作りましょう。

【参加費】
1,000円（材料費込み）

詳細は後日イベントページに掲載いたします。
お楽しみに！

運営一同`,
    contentEn: `Hello everyone,

We would like to announce a new event scheduled for next month.

【Event Name】
International Cooking Contest

【Date & Time】
April 15, 2025 (Tue) 16:00-20:00

【Location】
University Campus Cooking Room

【Details】
Cook traditional dishes from various countries and compete!
Work together in teams to create delicious food.

【Fee】
1,000 yen (includes ingredients)

Details will be posted on the event page later.
Stay tuned!

Best regards,
Admin Team`,
  },
};

export function AdminMessageDetailPage({ language, messageId, onBack }: AdminMessageDetailPageProps) {
  const t = translations[language];
  const message = messageDetails[messageId];

  if (!message) {
    return (
      <div className="max-w-3xl mx-auto">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-[#3D3D4E] mb-6 hover:text-[#49B1E4]"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>{t.back}</span>
        </button>
        <div className="bg-white rounded-lg shadow-sm p-12 text-center">
          <p className="text-gray-500">
            {language === 'ja' ? 'メッセージが見つかりません' : 'Message not found'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Back button */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-[#3D3D4E] mb-6 hover:text-[#49B1E4]"
      >
        <ArrowLeft className="w-5 h-5" />
        <span>{t.back}</span>
      </button>

      {/* Message content */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        {/* Header */}
        <div className="bg-[#49B1E4] text-white p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center shrink-0">
              <Mail className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <h1 className="text-xl font-bold mb-2">
                {language === 'ja' ? message.subject : message.subjectEn}
              </h1>
              <div className="flex items-center gap-4 text-sm opacity-90">
                <div className="flex items-center gap-1">
                  <span>{t.from}:</span>
                  <span className="font-semibold">{t.admin}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  <span>{language === 'ja' ? message.time : message.timeEn}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-6">
          <div className="prose max-w-none">
            <pre className="whitespace-pre-wrap font-sans text-[#3D3D4E] leading-relaxed">
              {language === 'ja' ? message.content : message.contentEn}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
