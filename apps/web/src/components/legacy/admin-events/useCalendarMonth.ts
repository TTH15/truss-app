import { useEffect, useMemo, useRef, useState } from 'react';
import type { Language } from '@truss/core';
import { buildCalendarDays, getDayNames, getMonthNames, groupEventsByDate, normalizeEventDateKey, toDateKey } from './calendar-utils';
import type { AdminEvent } from './types';

/** 画面端に寄せてから月が切り替わるまでの待ち時間と、連続切り替えの間隔 */
const EDGE_SWITCH_DELAY_MS = 260;
const MONTH_SWITCH_COOLDOWN_MS = 550;
/** 左右どれだけ寄せたら「端」と見なすか */
const EDGE_THRESHOLD_PX = 70;

/**
 * カレンダーの表示月と、イベントを別の日へドラッグする間の月送りをまとめて扱う。
 * ドラッグ中はタイマー越しに月を変えるため、最新の月をコールバックから読めるよう ref にも写している。
 */
export function useCalendarMonth(events: AdminEvent[], language: Language) {
  const now = new Date();
  const [currentMonth, setCurrentMonth] = useState(now.getMonth());
  const [currentYear, setCurrentYear] = useState(now.getFullYear());
  const currentMonthRef = useRef(currentMonth);
  const currentYearRef = useRef(currentYear);
  /** 一度でも手で月を動かしたら、イベントのある月への自動ジャンプはしない */
  const monthManuallyChangedRef = useRef(false);
  const lastMonthSwitchAtRef = useRef(0);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [draggingEvent, setDraggingEvent] = useState<AdminEvent | null>(null);
  const draggingEventRef = useRef<AdminEvent | null>(null);
  const [dragOverDateStr, setDragOverDateStr] = useState<string | null>(null);
  const [edgeZone, setEdgeZone] = useState<'left' | 'right' | null>(null);
  const [monthSwitching, setMonthSwitching] = useState(false);
  const edgeSwitchTimeoutRef = useRef<number | null>(null);
  const pendingEdgeZoneRef = useRef<'left' | 'right' | null>(null);

  useEffect(() => {
    currentMonthRef.current = currentMonth;
  }, [currentMonth]);

  useEffect(() => {
    currentYearRef.current = currentYear;
  }, [currentYear]);

  useEffect(() => {
    draggingEventRef.current = draggingEvent;
  }, [draggingEvent]);

  const calendarDays = useMemo(() => buildCalendarDays(currentYear, currentMonth), [currentYear, currentMonth]);
  const eventsByDate = useMemo(() => groupEventsByDate(events), [events]);
  const monthNames = useMemo(() => getMonthNames(language), [language]);
  const dayNames = useMemo(() => getDayNames(language), [language]);

  const dateKeyOf = (day: number) => toDateKey(currentYear, currentMonth, day);

  const getEventsForDate = (day: number | null) => (day ? eventsByDate.get(dateKeyOf(day)) || [] : []);

  const shiftMonth = (delta: -1 | 1) => {
    monthManuallyChangedRef.current = true;
    const month = currentMonthRef.current;
    const year = currentYearRef.current;
    if (delta === -1) {
      if (month === 0) {
        setCurrentMonth(11);
        setCurrentYear(year - 1);
      } else {
        setCurrentMonth(month - 1);
      }
      return;
    }
    if (month === 11) {
      setCurrentMonth(0);
      setCurrentYear(year + 1);
    } else {
      setCurrentMonth(month + 1);
    }
  };

  const goToPreviousMonth = () => shiftMonth(-1);
  const goToNextMonth = () => shiftMonth(1);

  const cancelPendingEdgeSwitch = () => {
    if (edgeSwitchTimeoutRef.current) window.clearTimeout(edgeSwitchTimeoutRef.current);
    edgeSwitchTimeoutRef.current = null;
    pendingEdgeZoneRef.current = null;
  };

  /** ドラッグ中に左右の端へ寄せたら、少し置いてから前後の月へ送る */
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    if (!draggingEventRef.current) return;
    e.preventDefault();

    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const zone: 'left' | 'right' | null =
      e.clientX < rect.left + EDGE_THRESHOLD_PX ? 'left' :
      e.clientX > rect.right - EDGE_THRESHOLD_PX ? 'right' :
      null;

    setEdgeZone(zone);

    if (!zone) {
      cancelPendingEdgeSwitch();
      return;
    }

    if (Date.now() - lastMonthSwitchAtRef.current < MONTH_SWITCH_COOLDOWN_MS) return;

    // 寄せた瞬間は色だけ変えて、少し遅らせてから切り替える
    pendingEdgeZoneRef.current = zone;
    if (edgeSwitchTimeoutRef.current) window.clearTimeout(edgeSwitchTimeoutRef.current);
    edgeSwitchTimeoutRef.current = window.setTimeout(() => {
      if (!draggingEventRef.current) return;
      if (pendingEdgeZoneRef.current !== zone) return;

      setMonthSwitching(true);
      lastMonthSwitchAtRef.current = Date.now();
      shiftMonth(zone === 'left' ? -1 : 1);
      window.setTimeout(() => setMonthSwitching(false), EDGE_SWITCH_DELAY_MS);
    }, EDGE_SWITCH_DELAY_MS);
  };

  const startDragging = (event: AdminEvent) => {
    setDraggingEvent(event);
    setDragOverDateStr(null);
  };

  const endDragging = () => {
    setDraggingEvent(null);
    setDragOverDateStr(null);
    setEdgeZone(null);
    setMonthSwitching(false);
    cancelPendingEdgeSwitch();
  };

  /** 表示中の月にイベントが1件も無ければ、イベントのある月へ寄せる（手で動かすまでの間だけ） */
  useEffect(() => {
    if (monthManuallyChangedRef.current) return;
    if (events.length === 0) return;

    const hasAnyEventInCurrentMonth = events.some((event) => {
      const key = normalizeEventDateKey(event?.date);
      if (!key) return false;
      const [yy, mm] = key.split('-');
      return Number(yy) === currentYear && Number(mm) === currentMonth + 1;
    });
    if (hasAnyEventInCurrentMonth) return;

    const firstValid = events.map((event) => normalizeEventDateKey(event?.date)).find(Boolean);
    if (!firstValid) return;
    const [yy, mm] = firstValid.split('-');
    const nextYear = Number(yy);
    const nextMonth = Number(mm) - 1;
    if (Number.isNaN(nextYear) || Number.isNaN(nextMonth)) return;
    setCurrentYear(nextYear);
    setCurrentMonth(nextMonth);
  }, [events, currentYear, currentMonth]);

  return {
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
  };
}

export type CalendarMonth = ReturnType<typeof useCalendarMonth>;
