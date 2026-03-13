"use client";

import { useState } from "react";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { HugeiconsIcon } from "@hugeicons/react";
import { Calendar03Icon } from "@hugeicons/core-free-icons";
import type { DateRange } from "react-day-picker";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface DateRangePickerProps {
  value: { from: Date; to: Date };
  onChange: (range: { from: Date; to: Date }) => void;
}

function formatRange(from: Date, to: Date): string {
  const fromMonth = format(from, "MMM", { locale: ptBR });
  const toMonth = format(to, "MMM", { locale: ptBR });
  const fromYear = format(from, "yyyy");
  const toYear = format(to, "yyyy");

  const isFullMonth =
    from.getDate() === 1 &&
    to.getDate() === endOfMonth(from).getDate() &&
    from.getMonth() === to.getMonth() &&
    from.getFullYear() === to.getFullYear();

  if (isFullMonth) {
    return `${format(from, "MMMM yyyy", { locale: ptBR })}`;
  }

  if (fromYear === toYear) {
    return `${format(from, "d MMM", { locale: ptBR })} – ${format(to, "d MMM yyyy", { locale: ptBR })}`;
  }

  return `${format(from, "d MMM yyyy", { locale: ptBR })} – ${format(to, "d MMM yyyy", { locale: ptBR })}`;

  void fromMonth;
  void toMonth;
  void fromYear;
  void toYear;
}

export function DateRangePicker({ value, onChange }: DateRangePickerProps) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState<DateRange | undefined>({
    from: value.from,
    to: value.to,
  });

  const today = new Date();

  function applyPreset(from: Date, to: Date) {
    onChange({ from, to });
    setPending({ from, to });
    setOpen(false);
  }

  function handleSelect(range: DateRange | undefined) {
    setPending(range);
    if (range?.from && range.to) {
      onChange({ from: range.from, to: range.to });
      setOpen(false);
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <HugeiconsIcon icon={Calendar03Icon} size={14} />
          <span className="capitalize">{formatRange(value.from, value.to)}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="end">
        <div className="flex flex-col">
          <div className="flex gap-1 border-b p-2">
            <Button
              variant="ghost"
              size="sm"
              className="flex-1 text-xs"
              onClick={() =>
                applyPreset(startOfMonth(today), endOfMonth(today))
              }
            >
              Mês Atual
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="flex-1 text-xs"
              onClick={() => {
                const prev = subMonths(today, 1);
                applyPreset(startOfMonth(prev), endOfMonth(prev));
              }}
            >
              Mês Anterior
            </Button>
          </div>
          <Calendar
            mode="range"
            selected={pending}
            onSelect={handleSelect}
            locale={ptBR}
            numberOfMonths={1}
            disabled={{ after: endOfMonth(today) }}
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}
