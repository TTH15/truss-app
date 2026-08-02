/**
 * ユーザー画面の操作ガイドツアー(スポットライト)
 *
 * driver.js で Dashboard の主要 UI(下部ナビ・ヘッダー)を順に説明する。
 * 対象要素は data-tour 属性で指定し、表示中の画面に存在するステップだけを実行する。
 */
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import '../styles/tour.css';
import type { Language } from '@truss/core';

const SEEN_KEY = 'truss-user-tour-seen-v1';

export function hasSeenUserTour(): boolean {
  try {
    return localStorage.getItem(SEEN_KEY) === '1';
  } catch {
    return true;
  }
}

function markUserTourSeen() {
  try {
    localStorage.setItem(SEEN_KEY, '1');
  } catch {
    // localStorage が使えない環境では毎回表示になるだけなので無視
  }
}

type TourStep = {
  /** data-tour 属性の値。undefined なら画面中央のモーダル */
  target?: string;
  title: Record<Language, string>;
  description: Record<Language, string>;
  side?: 'top' | 'bottom' | 'left' | 'right';
};

const STEPS: TourStep[] = [
  {
    title: { ja: 'Truss へようこそ', en: 'Welcome to Truss' },
    description: {
      ja: 'アプリの主な画面とボタンを順番にご紹介します(30秒ほどで終わります)。',
      en: 'Let us walk you through the main screens and buttons (takes about 30 seconds).',
    },
  },
  {
    target: 'nav-home',
    side: 'top',
    title: { ja: 'ホーム', en: 'Home' },
    description: {
      ja: 'お知らせや直近のイベントなど、最新情報をここで確認できます。',
      en: 'Check announcements and upcoming events here.',
    },
  },
  {
    target: 'nav-events',
    side: 'top',
    title: { ja: 'イベント', en: 'Events' },
    description: {
      ja: 'イベントの一覧・詳細の確認と参加登録ができます。',
      en: 'Browse events, see details, and register to join.',
    },
  },
  {
    target: 'nav-gallery',
    side: 'top',
    title: { ja: 'ギャラリー', en: 'Gallery' },
    description: {
      ja: '活動写真を見たり、自分の写真を投稿したりできます。',
      en: 'View activity photos and share your own.',
    },
  },
  {
    target: 'nav-bulletin',
    side: 'top',
    title: { ja: '掲示板', en: 'Board' },
    description: {
      ja: 'メンバー同士の告知・募集・交流はこちら。投稿に返信もできます。',
      en: 'Announcements and posts between members. You can also reply to posts.',
    },
  },
  {
    target: 'nav-messages',
    side: 'top',
    title: { ja: 'メッセージ', en: 'Messages' },
    description: {
      ja: '運営チームとの個別のやり取りがここに届きます。',
      en: 'Direct messages with the admin team arrive here.',
    },
  },
  {
    target: 'notifications',
    side: 'bottom',
    title: { ja: '通知', en: 'Notifications' },
    description: {
      ja: '新着のお知らせがあるとここに赤いバッジが付きます。',
      en: 'A red badge appears here when you have new notifications.',
    },
  },
  {
    target: 'language',
    side: 'bottom',
    title: { ja: '言語切替', en: 'Language' },
    description: {
      ja: '日本語と English をいつでも切り替えられます。',
      en: 'Switch between Japanese and English anytime.',
    },
  },
  {
    target: 'profile',
    side: 'bottom',
    title: { ja: 'プロフィール', en: 'Profile' },
    description: {
      ja: 'プロフィールの確認・編集やログアウトはここから。このガイドも「使い方ガイド」からいつでも見直せます。',
      en: 'View and edit your profile or log out here. You can replay this guide anytime from "How to use".',
    },
  },
];

export function startUserTour(language: Language) {
  const steps = STEPS.filter(
    (s) => !s.target || document.querySelector(`[data-tour="${s.target}"]`)
  ).map((s) => ({
    ...(s.target ? { element: `[data-tour="${s.target}"]` } : {}),
    popover: {
      title: s.title[language],
      description: s.description[language],
      ...(s.side ? { side: s.side } : {}),
    },
  }));
  if (steps.length === 0) return;

  const tour = driver({
    showProgress: true,
    progressText: '{{current}} / {{total}}',
    // 誤タップ防止のため「戻る」は出さない(再確認は使い方ガイドから再実行)。
    // 終了は明示的な「スキップ」ボタンのみ(× は意図が分かりにくいため出さない)
    showButtons: ['next'],
    // モーダル外タップは終了ではなく「次へ」として扱う
    overlayClickBehavior: 'nextStep',
    nextBtnText: language === 'ja' ? '次へ' : 'Next',
    doneBtnText: language === 'ja' ? '完了' : 'Done',
    popoverClass: 'truss-tour',
    overlayOpacity: 0.55,
    stagePadding: 6,
    stageRadius: 12,
    onDestroyed: () => markUserTourSeen(),
    onPopoverRender: (popover, { state }) => {
      const isLastStep = state.activeIndex === steps.length - 1;
      if (isLastStep) return;
      const skip = document.createElement('button');
      skip.type = 'button';
      skip.innerText = language === 'ja' ? 'スキップ' : 'Skip';
      skip.classList.add('truss-tour-skip-btn');
      skip.addEventListener('click', () => tour.destroy());
      popover.footerButtons.prepend(skip);
    },
    steps,
  });
  tour.drive();
}
