import { useState, useEffect } from "react";
import { DateRangeDualPicker } from "./DateRangeDualPicker";
import { startOfMonth, endOfMonth, subMonths, format } from "date-fns";
import { ja } from "date-fns/locale";
import { motion } from "motion/react";

type RangePreset = "current_month" | "six_months" | "one_year" | "custom";

interface DateRange {
  startDate?: Date;
  endDate?: Date;
}

interface DateRangePickerProps {
  value?: DateRange;
  onChange?: (range: DateRange) => void;
}

export function DateRangePicker({ value, onChange }: DateRangePickerProps) {
  const [preset, setPreset] = useState<RangePreset>("current_month");

  useEffect(() => {
    const today = new Date();
    let startDate: Date;
    let endDate: Date = today; // デフォルトは今日

    if (preset !== "custom") {
      switch (preset) {
        case "current_month":
          startDate = startOfMonth(today);
          endDate = today;
          break;
        case "six_months":
          endDate = today;
          startDate = startOfMonth(subMonths(today, 5));
          break;
        case "one_year":
          endDate = today;
          startDate = startOfMonth(subMonths(today, 11));
          break;
        default:
          return;
      }

      onChange?.({ startDate, endDate });
    }
  }, [preset, onChange]);

  const handlePresetChange = (value: RangePreset) => {
    setPreset(value);
  };

  const handleCustomRangeChange = (range: DateRange) => {
    onChange?.(range);
    // 手動で日付を変更したらカスタムモードに
    setPreset("custom");
  };

  const presets = [
    { value: "current_month", label: "今月" },
    { value: "six_months", label: "半年" },
    { value: "one_year", label: "1年" },
    { value: "custom", label: "カスタム" },
  ] as const;

  return (
    <div className="flex flex-col sm:flex-row items-start gap-4">
      {/* 左側：プリセット選択タブ */}
      <div className="relative inline-flex gap-1 bg-secondary/30 p-1 rounded-lg backdrop-blur-sm h-[58px] items-center">
        {presets.map((p) => (
          <button
            key={p.value}
            onClick={() => handlePresetChange(p.value)}
            className={`relative px-5 h-full text-sm rounded-md transition-colors z-10 whitespace-nowrap ${
              preset === p.value
                ? "text-white"
                : "text-foreground/70 hover:text-foreground"
            }`}
          >
            {preset === p.value && (
              <motion.div
                layoutId="preset-background"
                className="absolute inset-0 bg-black rounded-md"
                style={{ zIndex: -1 }}
                transition={{
                  type: "spring",
                  stiffness: 500,
                  damping: 35,
                }}
              />
            )}
            {p.label}
          </button>
        ))}
      </div>

      {/* 右側：開始日終了日ピッカー */}
      <DateRangeDualPicker
        value={value}
        onChange={handleCustomRangeChange}
      />
    </div>
  );
}