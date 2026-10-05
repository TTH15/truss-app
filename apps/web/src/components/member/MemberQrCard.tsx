'use client';

import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faIdCard, faQrcode } from '@fortawesome/free-solid-svg-icons';
import { buildMemberCheckinPayload, type Language, type User } from '@truss/core';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { UserAvatarImage } from '../legacy/UserAvatarImage';

export function MemberQrCard({ user, language }: { user: User; language: Language }) {
  const [open, setOpen] = useState(false);
  const [back, setBack] = useState(true);
  if (!user.approved || user.blocked) return null;
  const ja = language === 'ja';
  return <>
    <button type="button" className="passport-qr-trigger" onClick={() => { setBack(true); setOpen(true); }}>
      <FontAwesomeIcon icon={faQrcode} />{ja ? '会員証QR' : 'Member QR'}
    </button>
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent aria-describedby={undefined} className="member-qr-dialog sm:max-w-sm max-h-[calc(100dvh-2rem)] overflow-y-auto">
        <DialogHeader><DialogTitle>{ja ? '会員証' : 'Member card'}</DialogTitle></DialogHeader>
        <div className="member-card-sides" role="group" aria-label={ja ? '会員証の面' : 'Card side'}>
          <button type="button" aria-pressed={!back} onClick={() => setBack(false)}><FontAwesomeIcon icon={faIdCard} />{ja ? '表' : 'Front'}</button>
          <button type="button" aria-pressed={back} onClick={() => setBack(true)}><FontAwesomeIcon icon={faQrcode} />{ja ? '受付QR' : 'Check-in QR'}</button>
        </div>
        <div className="member-card-face">
          <span className="member-card-brand">Truss Passport</span>
          {back ? <div className="member-card-qr"><QRCodeSVG value={buildMemberCheckinPayload(user.id)} size={216} level="M" marginSize={4} fgColor="#1A2E32" bgColor="#FFFFFF" title={ja ? '受付用会員QRコード' : 'Member check-in QR code'} /></div>
            : <UserAvatarImage name={user.name} avatarPath={user.avatarPath} className="member-card-portrait" fallbackClassName="passport-initials" />}
          <strong className="member-card-name">{user.name}</strong>
          {!back && user.membershipYear && <span className="member-card-year">{ja ? `${user.membershipYear}年度` : `Membership year ${user.membershipYear}`}</span>}
        </div>
      </DialogContent>
    </Dialog>
  </>;
}
