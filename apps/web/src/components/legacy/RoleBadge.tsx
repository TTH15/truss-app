import { Badge } from '../ui/badge';
import type { Language, UserRole } from '@truss/core';
import { USER_ROLE_LABELS, isPrivilegedRole } from '@truss/core';

const ROLE_BADGE_CLASSES: Record<UserRole, string> = {
  non_member: 'bg-[#FEE2E2] text-[#991B1B]',
  member: 'bg-gray-100 text-gray-600',
  officer: 'bg-[#E0F3FB] text-[#1B7DAE]',
  vice_president: 'bg-[#EDE9FE] text-[#6D28D9]',
  president: 'bg-[#FEF3C7] text-[#B45309]',
  advisor: 'bg-[#DCFCE7] text-[#166534]',
};

/**
 * 役職バッジ。デフォルトでは member(部員)は表示しない。
 * showMember を立てると member もグレーのバッジで表示する(管理画面の一覧など)。
 */
export function RoleBadge({
  role,
  language,
  showMember = false,
  className = '',
}: {
  role: UserRole | undefined;
  language: Language;
  showMember?: boolean;
  className?: string;
}) {
  const resolved: UserRole = role ?? 'member';
  // 非会員は「会費が未払い」という重要な情報なので、部員と違って常に出す
  if (resolved !== 'non_member' && !showMember && !isPrivilegedRole(resolved)) return null;
  return (
    <Badge className={`${ROLE_BADGE_CLASSES[resolved]} border-0 font-medium text-xs px-2 py-0.5 ${className}`}>
      {USER_ROLE_LABELS[resolved][language]}
    </Badge>
  );
}
