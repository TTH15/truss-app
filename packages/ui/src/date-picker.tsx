"use client";

import * as React from "react";
import { Calendar as CalendarIcon } from "lucide-react";
import type { DayPickerProps } from "react-day-picker";

import { Button } from "./button";
import { Calendar } from "./calendar";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";
import { cn } from "./utils";

export interface DatePickerProps {
  value?: Date;
  onChange?: (date: Date | undefined) => void;
  /**
   * トリガーに表示する日付の整形。ロケール依存を持ち込まないためアプリ側で注入する
   * (未指定時は toLocaleDateString)。
   */
  formatLabel?: (date: Date) => string;
  placeholder?: string;
  /** 選択不可日(react-day-picker の Matcher) */
  disabled?: DayPickerProps["disabled"];
  /** カレンダーの初期表示月(未選択時) */
  defaultMonth?: Date;
  /** カレンダーのロケール(`react-day-picker/locale` から import して渡す) */
  locale?: DayPickerProps["locale"];
  /** 選択と同時にポップオーバーを閉じる(既定: true) */
  closeOnSelect?: boolean;
  buttonClassName?: string;
  contentClassName?: string;
  iconClassName?: string;
  buttonDisabled?: boolean;
}

/** Button + Popover + Calendar を束ねた単一日付ピッカー */
export function DatePicker({
  value,
  onChange,
  formatLabel,
  placeholder = "日付を選択",
  disabled,
  defaultMonth,
  locale,
  closeOnSelect = true,
  buttonClassName,
  contentClassName,
  iconClassName,
  buttonDisabled,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false);
  const label = value
    ? (formatLabel ? formatLabel(value) : value.toLocaleDateString())
    : placeholder;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={buttonDisabled}
          className={cn(
            "w-full justify-start text-left font-normal",
            !value && "text-muted-foreground",
            buttonClassName,
          )}
        >
          <CalendarIcon className={cn("mr-2 size-4", iconClassName)} />
          {label}
        </Button>
      </PopoverTrigger>
      <PopoverContent className={cn("w-auto p-0", contentClassName)} align="start">
        <Calendar
          mode="single"
          selected={value}
          onSelect={(date) => {
            onChange?.(date);
            if (closeOnSelect) setOpen(false);
          }}
          disabled={disabled}
          defaultMonth={value ?? defaultMonth}
          locale={locale}
          autoFocus
        />
      </PopoverContent>
    </Popover>
  );
}
