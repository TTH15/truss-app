'use client';

import { useEffect, useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faQrcode, faRotate } from '@fortawesome/free-solid-svg-icons';
import { buildMemberCheckinPayload, type Language, type User } from '@truss/core';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { UserAvatarImage } from '../legacy/UserAvatarImage';

export function MemberQrCard({ user, language }: { user: User; language: Language }) {
  const [open, setOpen] = useState(false);
  const [back, setBack] = useState(false);
  const flipTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!open) return;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    flipTimer.current = setTimeout(() => {
      setBack(true);
      flipTimer.current = null;
    }, reducedMotion ? 0 : 220);
    return () => {
      if (flipTimer.current !== null) clearTimeout(flipTimer.current);
      flipTimer.current = null;
    };
  }, [open]);

  const flipCard = () => {
    if (flipTimer.current !== null) clearTimeout(flipTimer.current);
    flipTimer.current = null;
    setBack((previous) => !previous);
  };

  if (!user.approved || user.blocked) return null;
  const ja = language === 'ja';
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button type="button" className="passport-qr-trigger" onClick={() => setBack(false)}>
          <FontAwesomeIcon icon={faQrcode} />{ja ? '会員証QR' : 'Member QR'}
        </button>
      </DialogTrigger>
      <DialogContent aria-describedby={undefined} className="member-qr-dialog sm:max-w-sm max-h-[calc(100dvh-2rem)] overflow-y-auto">
        <DialogHeader><DialogTitle>{ja ? '会員証' : 'Member card'}</DialogTitle></DialogHeader>
        <div className="member-card-stage">
          <button type="button" className="member-card-flip" data-side={back ? 'back' : 'front'} aria-pressed={back}
            aria-label={back ? (ja ? '会員証の表に戻す' : 'Show member card front') : (ja ? '会員証の受付QRを表示' : 'Show member check-in QR')}
            onClick={flipCard}>
            <span className="member-card-face member-card-face-front" aria-hidden={back}>
              <span className="member-card-brand">Truss Passport</span>
              <UserAvatarImage name={user.name} avatarPath={user.avatarPath} className="member-card-portrait" fallbackClassName="passport-initials" />
              <strong className="member-card-name">{user.name}</strong>
              {user.membershipYear && <span className="member-card-year">{ja ? `${user.membershipYear}年度` : `Membership year ${user.membershipYear}`}</span>}
              <span className="member-card-turn"><FontAwesomeIcon icon={faRotate} />{ja ? '受付QR' : 'Check-in QR'}</span>
            </span>
            <span className="member-card-face member-card-face-back" aria-hidden={!back}>
              <span className="member-card-brand">Truss Passport</span>
              <span className="member-card-qr"><QRCodeSVG value={buildMemberCheckinPayload(user.id)} size={216} level="M" marginSize={4} fgColor="#1A2E32" bgColor="#FFFFFF" title={ja ? '受付用会員QRコード' : 'Member check-in QR code'} /></span>
              <strong className="member-card-name">{user.name}</strong>
              <span className="member-card-turn"><FontAwesomeIcon icon={faRotate} />{ja ? '表に戻る' : 'Front'}</span>
            </span>
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
