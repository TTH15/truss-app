'use client';

import { useEffect, useRef, useState } from 'react';
import type { IScannerControls } from '@zxing/browser';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCamera, faCheck, faQrcode, faRotateRight } from '@fortawesome/free-solid-svg-icons';
import { parseEventCheckinPayload, parseMemberCheckinPayload, supabase, toLocalDateKey, type Language, type User } from '@truss/core';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../ui/dialog';
import { Button } from '../../ui/button';
import { UserAvatarImage } from '../UserAvatarImage';
import { formatDisplayDate } from '../../../lib/display-date';
import { getParticipantUserId } from './participants';
import type { AdminEvent, AdminEventParticipant } from './types';
import type { EventParticipants } from './useEventParticipants';

type Candidate = { member: User; participant: AdminEventParticipant; attended: boolean };

export function CheckinScanner({ event, participants, members, language, onClose }: {
  event: AdminEvent; participants: EventParticipants; members: User[]; language: Language; onClose: () => void;
}) {
  const ja = language === 'ja';
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const sessionRef = useRef(0);
  const confirmingRef = useRef(false);
  const [active, setActive] = useState(false);
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [busy, setBusy] = useState(false);
  const [lookup, setLookup] = useState(false);
  const notToday = event.date !== toLocalDateKey(new Date());

  const stopCamera = () => {
    controlsRef.current?.stop();
    controlsRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  };

  useEffect(() => () => {
    sessionRef.current += 1;
    controlsRef.current?.stop();
    streamRef.current?.getTracks().forEach((track) => track.stop());
  }, []);

  const acceptQr = async (raw: string, session: number) => {
    const memberQr = parseMemberCheckinPayload(raw);
    const eventQr = parseEventCheckinPayload(raw);
    const userId = memberQr?.userId || eventQr?.userId;
    if (!userId || (eventQr && (!Number.isSafeInteger(eventQr.eventId) || eventQr.eventId <= 0))) {
      setMessage(ja ? 'Trussの会員証・参加チケットのQRを読み取ってください' : 'Scan a Truss member card or event ticket');
      return;
    }
    if (eventQr && eventQr.eventId !== event.id) {
      setMessage(ja ? '別のイベントのチケットです' : 'This ticket is for another event');
      return;
    }
    const participant = participants.participants.find((item) => getParticipantUserId(item) === userId);
    const member = members.find((item) => item.id === userId);
    if (!participant || !member) {
      setMessage(ja ? 'このイベントの会員・申込情報が見つかりません。参加者一覧を確認してください' : 'Member or registration not found. Check the participant list');
      return;
    }
    setLookup(true);
    try {
      // 受付時点の承認・利用停止・申込状態を再取得する。QRに含まれる情報を資格として扱わない。
      const [userResult, participantResult] = await Promise.all([
        supabase.from('users').select('approved, blocked').eq('id', userId).single(),
        supabase.from('event_participants').select('attended').eq('event_id', event.id).eq('user_id', userId).single(),
      ]);
      if (session !== sessionRef.current) return;
      if (userResult.error || participantResult.error) throw new Error(ja ? '会員・申込情報を確認できませんでした。通信を確認して再試行してください' : 'Could not verify membership or registration. Check your connection and retry');
      if (!userResult.data.approved || userResult.data.blocked) throw new Error(ja ? 'この会員は受付対象外です。会員情報を確認してください' : 'This member cannot check in. Review the membership record');
      setCandidate({ member, participant, attended: participantResult.data.attended === true });
    } catch (error) {
      if (session === sessionRef.current) setMessage(error instanceof Error ? error.message : (ja ? '確認に失敗しました' : 'Verification failed'));
    } finally {
      if (session === sessionRef.current) setLookup(false);
    }
  };

  const startCamera = async () => {
    stopCamera();
    const session = ++sessionRef.current;
    setCandidate(null); setMessage(null); setSuccess(false); setActive(true);
    if (!navigator.mediaDevices?.getUserMedia || !window.isSecureContext) {
      setActive(false);
      setMessage(ja ? 'この環境ではカメラを使えません。参加者一覧から受付してください' : 'Camera unavailable. Use the participant list to check in');
      return;
    }
    try {
      const { BrowserQRCodeReader } = await import('@zxing/browser');
      if (session !== sessionRef.current || !videoRef.current) return;
      const reader = new BrowserQRCodeReader();
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false });
      if (session !== sessionRef.current || !videoRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      streamRef.current = stream;
      let decoded = false;
      const controls = await reader.decodeFromStream(stream, videoRef.current,
        (result, _error, currentControls) => {
          if (!result || decoded || session !== sessionRef.current) return;
          decoded = true;
          currentControls.stop();
          setActive(false);
          void acceptQr(result.getText(), session);
        });
      if (session !== sessionRef.current || decoded) controls.stop();
      else controlsRef.current = controls;
    } catch (error) {
      if (session !== sessionRef.current) return;
      stopCamera(); setActive(false);
      const denied = error instanceof DOMException && ['NotAllowedError', 'SecurityError'].includes(error.name);
      setMessage(denied
        ? (ja ? 'カメラを許可して再試行するか、参加者一覧から受付してください' : 'Allow camera access and retry, or use the participant list')
        : (ja ? 'カメラを起動できませんでした。再試行するか、参加者一覧から受付してください' : 'Could not start the camera. Retry or use the participant list'));
    }
  };

  const confirm = async () => {
    if (!candidate || candidate.attended || confirmingRef.current) return;
    confirmingRef.current = true;
    setBusy(true); setMessage(null);
    try {
      const { error } = await participants.confirmAttendance(candidate.participant);
      if (error) throw error;
      setSuccess(true);
      setMessage(ja ? `${candidate.member.name}さんの受付が完了しました` : `${candidate.member.name} checked in`);
      setCandidate(null);
    } catch {
      setMessage(ja ? '受付を保存できませんでした。申込状態と通信を確認して再試行してください' : 'Could not save check-in. Check registration and connection, then retry');
    } finally { confirmingRef.current = false; setBusy(false); }
  };

  return <Dialog open onOpenChange={(open) => { if (!open && !busy) { sessionRef.current += 1; stopCamera(); onClose(); } }}>
    <DialogContent aria-describedby={undefined} className="sm:max-w-md max-h-[calc(100dvh-2rem)] overflow-y-auto" onEscapeKeyDown={(e) => { if (busy) e.preventDefault(); }} onPointerDownOutside={(e) => { if (busy) e.preventDefault(); }}>
      <DialogHeader><DialogTitle><FontAwesomeIcon icon={faQrcode} className="mr-2" />{ja ? 'QR受付' : 'QR check-in'}</DialogTitle></DialogHeader>
      <div className="rounded-lg border bg-slate-50 p-3"><strong>{ja ? event.title : event.titleEn || event.title}</strong><p className="text-sm text-slate-600">{formatDisplayDate(event.date, language)} {event.time}</p></div>
      {notToday && <p className="text-sm text-amber-800 rounded-lg bg-amber-50 p-3">{ja ? '本日の開催ではありません。受付するイベントを確認してください' : 'This event is not today. Check the selected event'}</p>}
      <video ref={videoRef} autoPlay muted playsInline className={`w-full aspect-[4/3] rounded-lg bg-slate-950 object-cover ${active ? '' : 'hidden'}`} aria-label={ja ? 'QR読み取りカメラ' : 'QR scanner camera'} />
      {lookup && <p role="status">{ja ? '会員・申込情報を確認中…' : 'Checking membership and registration…'}</p>}
      {candidate && <div className="space-y-4">
        <div className="flex items-center gap-3"><UserAvatarImage name={candidate.member.name} avatarPath={candidate.member.avatarPath} className="h-16 w-16 rounded-lg" /><div><strong>{candidate.member.name}</strong><p className="text-sm text-slate-600">{candidate.member.nickname}</p></div></div>
        <p className="text-sm">{ja ? '本人と照合して受付を確定してください' : 'Match the member before confirming check-in'}</p>
        {candidate.participant.photoRefusal && <p className="text-sm text-amber-800">{ja ? '顔写真の掲載不可' : 'No face photos'}</p>}
        {candidate.attended ? <p role="status" className="rounded-lg bg-emerald-50 p-3 text-emerald-800">{ja ? '受付済み' : 'Already checked in'}</p> : <Button onClick={() => void confirm()} disabled={busy} className="w-full"><FontAwesomeIcon icon={faCheck} className="mr-2" />{busy ? (ja ? '保存中…' : 'Saving…') : (ja ? '出席を確定' : 'Confirm attendance')}</Button>}
      </div>}
      {message && <p role={success ? 'status' : 'alert'} className={`text-sm rounded-lg p-3 ${success ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-800'}`}>{message}</p>}
      {!active && !lookup && <Button variant="outline" onClick={() => void startCamera()} disabled={busy} className="w-full"><FontAwesomeIcon icon={candidate || message ? faRotateRight : faCamera} className="mr-2" />{candidate || message ? (ja ? '次のQRを読み取る' : 'Scan next QR') : (ja ? 'カメラで読み取る' : 'Scan with camera')}</Button>}
      {active && <Button variant="outline" onClick={() => { sessionRef.current += 1; stopCamera(); setActive(false); }}>{ja ? 'カメラを停止' : 'Stop camera'}</Button>}
    </DialogContent>
  </Dialog>;
}
