import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { getEventIconDefinition, type Language } from '@truss/core';
import { DEFAULT_EVENT_COLOR } from './event-form';
import type { CalendarMonth } from './useCalendarMonth';
import type { AdminEvent } from './types';

interface EventCalendarProps {
  language: Language;
  calendar: CalendarMonth;
  /** 空きマスを押したとき（その日付で新規作成を開く） */
  onAddEvent: (day: number) => void;
  onEventClick: (event: AdminEvent) => void;
  /** 別の日へドロップしたとき（その日にイベントを複製する） */
  onDropEvent: (source: AdminEvent, day: number) => void;
}

export function EventCalendar({ language, calendar, onAddEvent, onEventClick, onDropEvent }: EventCalendarProps) {
  const {
    currentYear,
    currentMonth,
    calendarDays,
    monthNames,
    dayNames,
    dateKeyOf,
    getEventsForDate,
    goToPreviousMonth,
    goToNextMonth,
    containerRef,
    edgeZone,
    monthSwitching,
    handleDragOver,
    draggingEvent,
    draggingEventRef,
    startDragging,
    endDragging,
    dragOverDateStr,
    setDragOverDateStr,
  } = calendar;

  return (
    <div className="bg-white rounded-[14px] border border-[rgba(61,61,78,0.15)] p-6 pb-8">
      {/* 月表示とナビゲーション */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={goToPreviousMonth}
          className="text-[#3D3D4E] hover:text-[#49B1E4] transition-colors p-1 hover:bg-[#F5F1E8] rounded"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <h3 className="text-[#3D3D4E] text-base font-semibold">
          {currentYear}{language === 'ja' ? '年' : ''} {monthNames[currentMonth]}
        </h3>

        <button
          onClick={goToNextMonth}
          className="text-[#3D3D4E] hover:text-[#49B1E4] transition-colors p-1 hover:bg-[#F5F1E8] rounded"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* カレンダーグリッド */}
      <div
        className={`overflow-hidden relative transition-all duration-200 ${monthSwitching ? 'opacity-70 blur-[1px]' : 'opacity-100 blur-0'}`}
        ref={containerRef}
        onDragOver={handleDragOver}
      >
        {/* ドラッグ中に端へ寄せると、その方向の月へ送られることを色で知らせる */}
        {draggingEvent && edgeZone === 'left' && (
          <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-20 bg-red-200/35 transition-colors duration-150" />
        )}
        {draggingEvent && edgeZone === 'right' && (
          <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-20 bg-blue-200/35 transition-colors duration-150" />
        )}
        <div className="grid grid-cols-7 gap-px bg-[#E5E7EB] border border-[#E5E7EB] overflow-hidden">
          {/* 曜日ヘッダー */}
          {dayNames.map((day, index) => (
            <div
              key={`day-${index}`}
              className={`p-2 text-center ${index === 0 ? 'bg-red-50' : index === 6 ? 'bg-blue-50' : 'bg-[#F9FAFB]'}`}
            >
              <span className={`text-xs font-bold ${index === 0 ? 'text-red-600' : index === 6 ? 'text-blue-600' : 'text-[#6B6B7A]'}`}>
                {day}
              </span>
            </div>
          ))}

          {/* 日付セル */}
          {calendarDays.map((day, index) => {
            const dayEvents = getEventsForDate(day);
            const column = index % 7;
            const isSunday = column === 0;
            const isSaturday = column === 6;
            const cellDateStr = day ? dateKeyOf(day) : null;
            return (
              <div
                key={`cell-${index}`}
                className={`p-2 flex flex-col relative overflow-hidden h-[120px] ${
                  isSunday ? 'bg-red-50/35' : isSaturday ? 'bg-blue-50/35' : 'bg-white'
                } ${day ? 'cursor-pointer hover:bg-[#F5F8FC]' : ''} ${
                  day && dragOverDateStr === cellDateStr ? 'bg-[#49B1E4]/25' : ''
                }`}
                onClick={() => {
                  // ドラッグ中の指の離し方によっては click も飛ぶため、複製と新規作成が二重に起きないようにする
                  if (draggingEventRef.current) return;
                  if (day) onAddEvent(day);
                }}
                onDragOver={(e) => {
                  if (draggingEventRef.current && day && cellDateStr) {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'copy';
                    setDragOverDateStr(cellDateStr);
                  }
                }}
                onDragLeave={() => {
                  if (draggingEventRef.current && dragOverDateStr === cellDateStr) {
                    setDragOverDateStr(null);
                  }
                }}
                onDrop={(e) => {
                  const source = draggingEventRef.current;
                  if (source && day && cellDateStr) {
                    e.preventDefault();
                    onDropEvent(source, day);
                    endDragging();
                  }
                }}
              >
                {day && (
                  <>
                    <div className={`text-center text-sm font-bold mb-2 ${isSunday ? 'text-red-600' : isSaturday ? 'text-blue-600' : 'text-[#3D3D4E]'}`}>
                      {day}
                    </div>

                    <div className="space-y-1">
                      {dayEvents.map((event) => (
                        <button
                          key={event.id}
                          draggable
                          onClick={(e) => {
                            e.stopPropagation();
                            onEventClick(event);
                          }}
                          onDragStart={(e) => {
                            startDragging(event);
                            e.dataTransfer.effectAllowed = 'copy';
                          }}
                          onDragEnd={endDragging}
                          className="flex items-center gap-1 text-left w-full px-1 py-0.5 rounded hover:bg-black/5 transition-colors"
                        >
                          <FontAwesomeIcon
                            icon={getEventIconDefinition(event.eventIconKey || event.event_icon)}
                            className="shrink-0 text-[10px]"
                            style={{ color: event.eventColor || DEFAULT_EVENT_COLOR }}
                          />
                          <span className="truncate text-[10px] text-[#3D3D4E] font-medium">
                            {language === 'ja' ? event.title : (event.titleEn || event.title)}
                          </span>
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
