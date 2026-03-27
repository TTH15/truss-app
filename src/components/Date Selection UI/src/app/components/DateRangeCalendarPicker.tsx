import { useState } from "react";
import { Calendar } from "./ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Button } from "./ui/button";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import type { DateRange } from "react-day-picker";

interface DateRangeCalendarPickerProps {
  value?: { startDate?: Date; endDate?: Date };
  onChange?: (range: { startDate?: Date; endDate?: Date }) => void;
  placeholder?: string;
}

export function DateRangeCalendarPicker({ 
  value, 
  onChange, 
  placeholder = "期間を選択" 
}: DateRangeCalendarPickerProps) {
  const [open, setOpen] = useState(false);

  const dateRange: DateRange | undefined = value?.startDate || value?.endDate 
    ? { from: value.startDate, to: value.endDate }
    : undefined;

  const handleSelect = (range: DateRange | undefined) => {
    onChange?.({
      startDate: range?.from,
      endDate: range?.to,
    });
    
    // 両方の日付が選択されたらポップオーバーを閉じる
    if (range?.from && range?.to) {
      setOpen(false);
    }
  };

  const formatRange = () => {
    if (!value?.startDate && !value?.endDate) return placeholder;
    
    if (value.startDate && value.endDate) {
      return `${format(value.startDate, "yyyy/MM/dd", { locale: ja })} 〜 ${format(value.endDate, "yyyy/MM/dd", { locale: ja })}`;
    }
    
    if (value.startDate) {
      return `${format(value.startDate, "yyyy/MM/dd", { locale: ja })} 〜 ...`;
    }
    
    return placeholder;
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="w-full justify-start text-left font-normal"
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {formatRange()}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="range"
          selected={dateRange}
          onSelect={handleSelect}
          numberOfMonths={2}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}
