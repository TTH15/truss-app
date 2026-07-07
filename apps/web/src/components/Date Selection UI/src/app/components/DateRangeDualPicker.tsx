import { useState } from "react";
import { Calendar } from "./ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Button } from "./ui/button";
import { CalendarIcon } from "lucide-react";
import { format, isWithinInterval, isBefore, isAfter } from "date-fns";
import { ja } from "date-fns/locale";
import type { Matcher } from "react-day-picker";

interface DateRangeDualPickerProps {
  value?: { startDate?: Date; endDate?: Date };
  onChange?: (range: { startDate?: Date; endDate?: Date }) => void;
}

export function DateRangeDualPicker({ 
  value, 
  onChange
}: DateRangeDualPickerProps) {
  const [startOpen, setStartOpen] = useState(false);
  const [endOpen, setEndOpen] = useState(false);

  const handleStartDateChange = (date: Date | undefined) => {
    onChange?.({
      startDate: date,
      endDate: value?.endDate,
    });
    setStartOpen(false);
  };

  const handleEndDateChange = (date: Date | undefined) => {
    onChange?.({
      startDate: value?.startDate,
      endDate: date,
    });
    setEndOpen(false);
  };

  // 範囲内の日付をハイライトするための modifiers
  const getRangeModifiers = (): Record<string, Matcher> => {
    const modifiers: Record<string, Matcher> = {
      // 土曜日と日曜日の色付け
      saturday: (date: Date) => date.getDay() === 6,
      sunday: (date: Date) => date.getDay() === 0,
    };
    
    if (value?.startDate && value?.endDate) {
      modifiers.range_start = value.startDate;
      modifiers.range_end = value.endDate;
      modifiers.range_middle = (date: Date) => {
        if (!value.startDate || !value.endDate) return false;
        return isAfter(date, value.startDate) && isBefore(date, value.endDate);
      };
    }
    
    return modifiers;
  };

  const rangeModifiers = getRangeModifiers();

  // 開始日の選択可能範囲：終了日が設定されている場合、終了日より後は選択不可
  const startDateDisabled: Matcher | Matcher[] | undefined = value?.endDate
    ? (date: Date) => isAfter(date, value.endDate!)
    : undefined;

  // 終了日の選択可能範囲：開始日が設定されている場合、開始日より前は選択不可
  const endDateDisabled: Matcher | Matcher[] | undefined = value?.startDate
    ? (date: Date) => isBefore(date, value.startDate!)
    : undefined;

  return (
    <div className="flex gap-4 items-center flex-wrap">
      <div>
        <label className="text-xs text-gray-400 mb-1 block">開始日</label>
        <Popover open={startOpen} onOpenChange={setStartOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="w-[180px] justify-start text-left font-normal"
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {value?.startDate ? format(value.startDate, "yyyy/MM/dd", { locale: ja }) : "開始日を選択"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={value?.startDate}
              onSelect={handleStartDateChange}
              disabled={startDateDisabled}
              modifiers={rangeModifiers}
              modifiersClassNames={{
                saturday: "text-blue-600 dark:text-blue-400",
                sunday: "text-red-600 dark:text-red-400",
                range_start: "!bg-primary !text-white rounded-l-md",
                range_end: "!bg-primary/40 !text-white rounded-r-md",
                range_middle: "bg-accent/60",
              }}
              defaultMonth={value?.startDate}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>
      
      <div className="text-gray-400">〜</div>
      
      <div>
        <label className="text-xs text-gray-400 mb-1 block">終了日</label>
        <Popover open={endOpen} onOpenChange={setEndOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="w-[180px] justify-start text-left font-normal"
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {value?.endDate ? format(value.endDate, "yyyy/MM/dd", { locale: ja }) : "終了日を選択"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={value?.endDate}
              onSelect={handleEndDateChange}
              disabled={endDateDisabled}
              modifiers={rangeModifiers}
              modifiersClassNames={{
                saturday: "text-blue-600 dark:text-blue-400",
                sunday: "text-red-600 dark:text-red-400",
                range_start: "!bg-primary/40 !text-white rounded-l-md",
                range_end: "!bg-primary !text-white rounded-r-md",
                range_middle: "bg-accent/60",
              }}
              defaultMonth={value?.endDate}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}