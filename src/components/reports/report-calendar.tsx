"use client";

import { cn } from "@/lib/utils";

type CalendarDay = {
  date: string;
  dayOfMonth: number;
  dayOfWeek: number; // 0=Dom..6=Sáb
  isWeekend: boolean;
  isHoliday: boolean;
  isToday: boolean;
  isFuture: boolean;
  isPending: boolean;
  report: { work_location: string } | null;
};

type ReportCalendarProps = {
  days: CalendarDay[];
  selectedDate: string | null;
  onSelectDate: (date: string) => void;
};

// Segunda-feira primeiro: Seg=0, Ter=1, ..., Dom=6
const WEEK_HEADERS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

function mondayFirst(dayOfWeek: number): number {
  // getDay(): 0=Dom..6=Sáb → converte para 0=Seg..6=Dom
  return (dayOfWeek + 6) % 7;
}

function getDayStyle(day: CalendarDay, isSelected: boolean): string {
  if (isSelected) {
    return "bg-primary text-primary-foreground ring-2 ring-primary ring-offset-1";
  }
  if (day.isWeekend) {
    return "text-muted-foreground/50 cursor-default";
  }
  if (day.isFuture) {
    return "text-muted-foreground/50 cursor-default";
  }
  if (day.report?.work_location === "day_off") {
    return "bg-muted/60 text-muted-foreground line-through";
  }
  if (day.report) {
    return "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-900/60";
  }
  if (day.isHoliday) {
    return "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-950/60";
  }
  if (day.isPending) {
    return "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-900/60";
  }
  // workday, no report, today or past but not pending? (shouldn't happen, but default)
  return "hover:bg-muted";
}

export function ReportCalendar({
  days,
  selectedDate,
  onSelectDate,
}: ReportCalendarProps) {
  if (days.length === 0) return null;

  // Calcula quantos dias em branco antes do primeiro dia do mês
  const firstDay = days[0]!;
  const leadingBlanks = mondayFirst(firstDay.dayOfWeek);
  const cells: (CalendarDay | null)[] = [
    ...Array.from({ length: leadingBlanks }, () => null),
    ...days,
  ];

  // Preenche até completar a última semana
  const trailingBlanks = (7 - (cells.length % 7)) % 7;
  for (let i = 0; i < trailingBlanks; i++) {
    cells.push(null);
  }

  const isClickable = (day: CalendarDay) => !day.isWeekend && !day.isFuture;

  return (
    <div className="select-none">
      {/* Cabeçalho dos dias da semana */}
      <div className="grid grid-cols-7 mb-1">
        {WEEK_HEADERS.map((h) => (
          <div
            key={h}
            className="text-center text-xs font-medium text-muted-foreground py-1"
          >
            {h}
          </div>
        ))}
      </div>

      {/* Grade de dias */}
      <div className="grid grid-cols-7 gap-2">
        {cells.map((day, idx) => {
          if (!day) {
            return <div key={`blank-${idx}`} className="h-20" />;
          }

          const isSelected = day.date === selectedDate;
          const clickable = isClickable(day);

          return (
            <button
              key={day.date}
              onClick={() => clickable && onSelectDate(day.date)}
              disabled={!clickable}
              className={cn(
                "h-20 w-full rounded-md text-sm font-medium flex flex-col items-center justify-center relative transition-colors",
                getDayStyle(day, isSelected),
                day.isToday &&
                  !isSelected &&
                  "ring-2 ring-primary/60 ring-offset-1",
              )}
              title={
                day.isHoliday
                  ? "Feriado nacional"
                  : day.isPending
                    ? "Relatório pendente"
                    : day.report?.work_location === "day_off"
                      ? "Folga / Day off"
                      : day.report
                        ? "Relatório preenchido"
                        : undefined
              }
            >
              {day.dayOfMonth}
              {/* Indicador de ponto no rodapé da célula */}
              {day.isPending && !isSelected && (
                <span className="absolute bottom-1 size-1 rounded-full bg-red-500" />
              )}
            </button>
          );
        })}
      </div>

      {/* Legenda */}
      <div className="flex flex-wrap gap-3 mt-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="size-3 rounded bg-green-200 dark:bg-green-900/60" />
          Preenchido
        </span>
        <span className="flex items-center gap-1">
          <span className="size-3 rounded bg-red-200 dark:bg-red-900/60" />
          Pendente
        </span>
        <span className="flex items-center gap-1">
          <span className="size-3 rounded bg-blue-100 dark:bg-blue-950/60" />
          Feriado
        </span>
        <span className="flex items-center gap-1">
          <span className="size-3 rounded bg-muted" />
          Folga
        </span>
      </div>
    </div>
  );
}
