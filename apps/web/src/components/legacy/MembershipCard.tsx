import { useState } from 'react';
import { ImageWithFallback } from '../figma/ImageWithFallback';
import { RoleBadge } from './RoleBadge';
import trussImage from '@/assets/8fbefa8d40d592af0e3f6e45ca9c793cfbb1b1c6.png';
import type { Language, User } from '@truss/core';

const translations = {
  ja: {
    tapHint: 'タップで会員情報',
    back: 'タップで表に戻る',
    name: '氏名',
    studentNumber: '学籍番号',
    category: '区分',
    membershipYear: '会員年度',
    japanese: '日本人学生・国内学生',
    regularInternational: '正規留学生',
    exchange: '交換留学生',
    unset: '未登録',
  },
  en: {
    tapHint: 'Tap for member details',
    back: 'Tap to flip back',
    name: 'Name',
    studentNumber: 'Student ID',
    category: 'Category',
    membershipYear: 'Member since',
    japanese: 'Japanese Student',
    regularInternational: 'Regular International',
    exchange: 'Exchange Student',
    unset: 'Not set',
  },
};

/**
 * 会員証カード。表はロゴのデザイン面、裏は会員情報。
 * 以前はロゴ画像だけを置いており、何のための領域か分からない状態だった。
 */
export function MembershipCard({ user, language }: { user: User; language: Language }) {
  const [flipped, setFlipped] = useState(false);
  const t = translations[language];
  const categoryLabel =
    user.category === 'japanese'
      ? t.japanese
      : user.category === 'regular-international'
        ? t.regularInternational
        : t.exchange;

  return (
    // 高さは縦横比で決める。親からの h-full 連鎖に頼ると高さが解決できず、
    // 中身が absolute のため何も表示されない箱になってしまう
    <div className="[perspective:1200px] w-full aspect-[1.55/1] max-w-2xl mx-auto">
      <button
        type="button"
        onClick={() => setFlipped((prev) => !prev)}
        aria-label={flipped ? t.back : t.tapHint}
        className="relative block w-full h-full [transform-style:preserve-3d] transition-transform duration-500 rounded-2xl"
        style={{ transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)' }}
      >
        {/* 表 */}
        <div className="absolute inset-0 [backface-visibility:hidden] rounded-2xl overflow-hidden shadow-lg bg-white">
          <ImageWithFallback src={trussImage} className="w-full h-full object-contain" />
        </div>

        {/* 裏 */}
        <div
          className="absolute inset-0 [backface-visibility:hidden] rounded-2xl overflow-hidden shadow-lg bg-white border border-[#E8E4DB] p-5 flex flex-col justify-center gap-3 text-left"
          style={{ transform: 'rotateY(180deg)' }}
        >
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-lg text-[#3D3D4E]">{user.name}</span>
            <RoleBadge role={user.role} language={language} />
          </div>
          {user.nickname && <p className="text-sm text-[#6B6B7A] -mt-2">{user.nickname}</p>}
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
            <dt className="text-[#6B6B7A]">{t.studentNumber}</dt>
            <dd className="text-[#3D3D4E]">{user.studentNumber || t.unset}</dd>
            <dt className="text-[#6B6B7A]">{t.category}</dt>
            <dd className="text-[#3D3D4E]">{categoryLabel}</dd>
            <dt className="text-[#6B6B7A]">{t.membershipYear}</dt>
            <dd className="text-[#3D3D4E]">{user.membershipYear ?? t.unset}</dd>
          </dl>
        </div>
      </button>
    </div>
  );
}
