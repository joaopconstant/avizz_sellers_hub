import { startOfMonth, endOfMonth } from "date-fns";

/**
 * Parseia uma string "YYYY-MM-DD" em Date UTC midnight.
 * Evita problemas de fuso horário ao usar split+Date.UTC diretamente.
 */
export function parseDateStringUTC(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number) as [number, number, number];
  return new Date(Date.UTC(y, m - 1, d));
}

/**
 * Resolve um range opcional {from?, to?} em {startDate, endDate}.
 * Defaults: startDate = início do mês atual, endDate = fim do mesmo mês.
 */
export function resolveRangeDates(input?: { from?: string; to?: string }): {
  startDate: Date;
  endDate: Date;
} {
  const startDate = input?.from ? new Date(input.from) : startOfMonth(new Date());
  const endDate = input?.to ? new Date(input.to) : endOfMonth(startDate);
  return { startDate, endDate };
}
