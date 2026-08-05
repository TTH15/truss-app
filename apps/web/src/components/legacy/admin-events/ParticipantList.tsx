import { Mail } from 'lucide-react';
import type { Language } from '@truss/core';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Checkbox } from '../../ui/checkbox';
import { getParticipantUserId } from './participants';
import type { AdminEventsCopy } from './translations';
import type { EventParticipants } from './useEventParticipants';

const CHECKBOX_CLASS = 'border-[#49B1E4] data-[state=checked]:bg-[#49B1E4] data-[state=checked]:border-[#49B1E4]';

interface ParticipantListProps {
  language: Language;
  t: AdminEventsCopy;
  participants: EventParticipants;
  /** 参加費が無いイベントでは支払いチェックを出さない */
  participationFee: number;
  onSendEmail: () => void;
}

export function ParticipantList({ language, t, participants, participationFee, onSendEmail }: ParticipantListProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <h4 className="text-[#3D3D4E] text-base font-semibold">{t.participantsList}</h4>
        <Button
          size="icon"
          className="bg-[#49B1E4] hover:bg-[#3A9FD3] text-white h-9 w-9"
          onClick={onSendEmail}
          title={t.sendBulkEmail}
        >
          <Mail className="w-4 h-4" />
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <Input
          placeholder={t.nameFilter}
          value={participants.filter}
          onChange={(e) => participants.setFilter(e.target.value)}
          className="flex-1"
        />
        <span className="text-sm text-[#6B6B7A] shrink-0">
          {language === 'ja' ? '出席' : 'Attended'} {participants.attendedCount}/{participants.count}
        </span>
      </div>

      {/* 左右のチェックボックスは役割が違う（左=メールの宛先選択 / 右=当日の記録）ので、
          列の見出しを置いて何のチェックかが分かるようにする */}
      <div className="flex items-center justify-between gap-4 px-3 text-xs text-[#6B6B7A]">
        <label className="flex items-center gap-2 cursor-pointer">
          <Checkbox
            checked={participants.allSelected}
            onCheckedChange={(checked) => participants.setAllSelected(checked === true)}
            className={CHECKBOX_CLASS}
          />
          <span>{language === 'ja' ? 'メールの宛先（全選択）' : 'Email recipients (all)'}</span>
        </label>
        <span>{language === 'ja' ? '当日の記録 →' : 'On the day →'}</span>
      </div>

      <div className="space-y-2 max-h-[400px] overflow-y-auto">
        {participants.filtered.map((participant) => {
          const userId = getParticipantUserId(participant);
          const furigana = participants.furiganaByUserId.get(userId);
          return (
            <div key={userId} className="flex items-center gap-3 p-3 bg-[#F9FAFB] rounded-[8px]">
              {/* 左側：メール送信先の選択 */}
              <div className="flex items-center">
                <Checkbox
                  aria-label={t.selectForEmail}
                  title={t.selectForEmail}
                  checked={participants.selectedIds.has(userId)}
                  onCheckedChange={(checked) => participants.toggleSelected(userId, checked === true)}
                  className={CHECKBOX_CLASS}
                />
              </div>

              {/* 中央：参加者情報 */}
              <div className="flex-1">
                <p className="text-[#101828] text-sm font-medium">
                  {participant.userName}
                  {furigana && <span className="text-[#6B6B7A] text-xs font-normal ml-2">{furigana}</span>}
                </p>
                {participant.userNickname && participant.userNickname !== participant.userName && (
                  <p className="text-[#4A5565] text-xs">{participant.userNickname}</p>
                )}
                <p className="text-[#6B6B7A] text-xs">
                  {language === 'ja' ? '登録日時:' : 'Registered:'}{' '}
                  {new Date(participant.registeredAt).toLocaleString(language === 'ja' ? 'ja-JP' : 'en-US')}
                </p>
                {participant.photoRefusal && (
                  <p className="text-[#D4183D] text-xs font-medium">
                    {language === 'ja' ? '写真撮影NG' : 'No photos please'}
                  </p>
                )}
              </div>

              {/* 右側：当日の記録 */}
              <div className="flex flex-col gap-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={participants.getStatus(participant, 'attended')}
                    onCheckedChange={(checked) => void participants.changeStatus(participant, 'attended', checked === true)}
                    className={CHECKBOX_CLASS}
                  />
                  <span className="text-[#3D3D4E] text-xs">{t.attended}</span>
                </label>
                {participationFee >= 1 && (
                  <label className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                      checked={participants.getStatus(participant, 'paid')}
                      onCheckedChange={(checked) => void participants.changeStatus(participant, 'paid', checked === true)}
                      className={CHECKBOX_CLASS}
                    />
                    <span className="text-[#3D3D4E] text-xs">{t.paid}</span>
                  </label>
                )}
              </div>
            </div>
          );
        })}
        {participants.filtered.length === 0 && (
          <p className="text-[#6B6B7A] text-sm text-center py-4">
            {participants.count === 0
              ? (language === 'ja' ? 'まだ参加者がいません' : 'No participants yet')
              : (language === 'ja' ? '該当する参加者がいません' : 'No matching participants')}
          </p>
        )}
      </div>
    </div>
  );
}
