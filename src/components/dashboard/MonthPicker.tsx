"use client";

import { format, addMonths, subMonths, startOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";

interface MonthPickerProps {
  month: Date;
  onChange: (month: Date) => void;
  maxMonth?: Date;
}

export function MonthPicker({ month, onChange, maxMonth }: MonthPickerProps) {
  const max = maxMonth ? startOfMonth(maxMonth) : startOfMonth(new Date());
  const canGoNext = startOfMonth(addMonths(month, 1)) <= max;

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => onChange(subMonths(month, 1))}
        className="rounded-md border px-3 py-1.5 text-sm hover:bg-muted transition-colors"
      >
        ‹
      </button>
      <span className="text-sm font-medium min-w-[120px] text-center capitalize">
        {format(month, "MMMM yyyy", { locale: ptBR })}
      </span>
      <button
        onClick={() => onChange(addMonths(month, 1))}
        disabled={!canGoNext}
        className="rounded-md border px-3 py-1.5 text-sm hover:bg-muted transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        ›
      </button>
    </div>
  );
}
