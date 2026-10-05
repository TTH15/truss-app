import Image from 'next/image';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronRight } from '@fortawesome/free-solid-svg-icons';
import type { Language, User } from '@truss/core';
import { UserAvatarImage } from '../legacy/UserAvatarImage';
import { RoleBadge } from '../legacy/RoleBadge';
import { MemberQrCard } from './MemberQrCard';

export function PassportCover({ user, language, onOpen }: { user: User; language: Language; onOpen?: () => void }) {
  const pending = !user.approved;
  const unpaid = user.category === 'japanese' && !user.feePaid;
  const status = pending ? (language === 'ja' ? '承認待ち' : 'Pending approval') : unpaid ? (language === 'ja' ? '会費手続き待ち' : 'Fee payment pending') : (language === 'ja' ? '会員' : 'Member');
  return (
    <div className="passport-cover">
      <button type="button" className="passport-profile-trigger" onClick={onOpen} aria-label={language === 'ja' ? '会員情報を開く' : 'Open member profile'} disabled={!onOpen}>
      <div className="passport-cover-heading"><span>Truss Passport</span><FontAwesomeIcon icon={faChevronRight} /></div>
      <div className="passport-identity">
        <UserAvatarImage name={user.name} avatarPath={user.avatarPath} className="passport-portrait" fallbackClassName="passport-initials" />
        <div className="passport-name-block">
          <span className="passport-name">{user.name}</span>
          <span className={`passport-status ${pending || unpaid ? 'passport-status-pending' : ''}`}>{status}</span>
          <RoleBadge role={user.role} language={language} />
        </div>
      </div>
      </button>
      <div className="passport-footer">
      <span className="passport-footer-details">
        {user.membershipYear && <span className="passport-year">{language === 'ja' ? `${user.membershipYear}年度` : `Membership year ${user.membershipYear}`}</span>}
        <MemberQrCard user={user} language={language} />
      </span>
      <Image src="/images/passport-kobe-watercolor.png" width={288} height={96} sizes="144px" alt="" className="passport-watercolor" aria-hidden="true" />
      </div>
    </div>
  );
}
