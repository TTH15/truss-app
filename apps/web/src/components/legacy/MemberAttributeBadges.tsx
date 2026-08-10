import { Badge } from '../ui/badge';
import type { Language, User } from '@truss/core';

/**
 * チャット一覧など狭い場所で会員の属性をひと目で示す小さなバッジ列。
 * - 承認待ち（未承認の申請者もチャットに現れるため）
 * - 交換留学 / 正規留学（区分。多数派の日本人学生はバッジを出さずノイズを抑える）
 * - 非会員（role が会費連動で non_member のとき）
 * 色は AdminMembers の区分バッジと同じ体系
 */
export function MemberAttributeBadges({
  member,
  language,
  className = '',
}: {
  member?: User;
  language: Language;
  className?: string;
}) {
  if (!member) return null;
  const ja = language === 'ja';
  const badges: Array<{ key: string; label: string; badgeClass: string }> = [];
  if (!member.approved) {
    badges.push({ key: 'pending', label: ja ? '承認待ち' : 'Pending', badgeClass: 'bg-amber-100 text-amber-800' });
  }
  if (member.category === 'exchange') {
    badges.push({ key: 'exchange', label: ja ? '交換留学' : 'Exchange', badgeClass: 'bg-[#fce7f3] text-[#be185d]' });
  } else if (member.category === 'regular-international') {
    badges.push({ key: 'regular', label: ja ? '正規留学' : 'Intl. student', badgeClass: 'bg-[rgba(132,212,97,0.3)] text-[#00a63e]' });
  }
  if (member.approved && member.role === 'non_member') {
    badges.push({ key: 'non-member', label: ja ? '非会員' : 'Non-member', badgeClass: 'bg-gray-200 text-gray-700' });
  }
  if (badges.length === 0) return null;
  return (
    <span className={`flex items-center gap-1 shrink-0 ${className}`}>
      {badges.map((badge) => (
        <Badge key={badge.key} className={`${badge.badgeClass} border-0 px-1.5 py-0 text-[10px] font-medium leading-4`}>
          {badge.label}
        </Badge>
      ))}
    </span>
  );
}
