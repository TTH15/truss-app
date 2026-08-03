import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { useData } from '../../contexts/DataContext';
import { JourneyStamp, EmptyStampSlot } from './JourneyStamp';
import type { Language, User } from '@truss/core';

/** 空きスロットを含めて常にこの数だけ枠を見せる（モバイルの Passport 画面と同じ考え方） */
const STAMP_SLOTS = 6;

/**
 * 参加したイベントのスタンプ帳。
 * 参加情報（eventParticipants）からの導出なので、スタンプ用のテーブルは持たない。
 *
 * 押印の条件は「予約した」ではなく「当日出席した」(attended)。
 * 予約だけで貯まると記録としての意味が薄れるため。出席は運営が参加者一覧で確定させる。
 */
export function JourneyStampBook({ user, language }: { user: User; language: Language }) {
  const { events, eventParticipants } = useData();

  const myEvents = events.filter((event) =>
    (eventParticipants[event.id] || []).some((p) => p.userId === user.id && p.attended)
  );
  const emptySlots = Math.max(0, STAMP_SLOTS - myEvents.length);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-baseline gap-2">
          Journey Stamps
          <span className="text-sm font-normal text-[#6B6B7A]">
            {myEvents.length}
            {language === 'ja' ? '個' : ''}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {myEvents.length === 0 ? (
          <p className="text-sm text-[#6B6B7A] py-2">
            {language === 'ja'
              ? 'イベントに参加して当日出席すると、スタンプが押されます。'
              : 'Attend an event on the day to collect your first stamp.'}
          </p>
        ) : null}
        <div className="flex flex-wrap gap-4">
          {myEvents.map((event) => (
            <JourneyStamp key={event.id} event={event} size={104} />
          ))}
          {Array.from({ length: emptySlots }, (_, i) => (
            <EmptyStampSlot key={`empty-${i}`} size={104} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
