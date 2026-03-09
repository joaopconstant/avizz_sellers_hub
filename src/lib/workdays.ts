import { isWeekend, startOfDay, format } from "date-fns";

/**
 * Feriados nacionais BR — MVP 2025–2026.
 * RN-08: excluir sábados, domingos e feriados do cálculo de dias úteis.
 *
 * Armazenados como strings "YYYY-MM-DD" em um Set para lookup O(1).
 * Adicionar anos futuros inserindo novas strings no array abaixo.
 */
const HOLIDAY_DATES: string[] = [
  // 2025
  "2025-01-01", // Confraternização Universal
  "2025-03-03", // Carnaval — segunda-feira
  "2025-03-04", // Carnaval — terça-feira
  "2025-04-18", // Sexta-feira Santa
  "2025-04-21", // Tiradentes
  "2025-05-01", // Dia do Trabalhador
  "2025-06-19", // Corpus Christi
  "2025-09-07", // Independência do Brasil
  "2025-10-12", // Nossa Senhora Aparecida
  "2025-11-02", // Finados
  "2025-11-15", // Proclamação da República
  "2025-11-20", // Consciência Negra
  "2025-12-25", // Natal
  // 2026
  "2026-01-01", // Confraternização Universal
  "2026-02-16", // Carnaval — segunda-feira
  "2026-02-17", // Carnaval — terça-feira
  "2026-04-03", // Sexta-feira Santa
  "2026-04-21", // Tiradentes
  "2026-05-01", // Dia do Trabalhador
  "2026-06-04", // Corpus Christi
  "2026-09-07", // Independência do Brasil
  "2026-10-12", // Nossa Senhora Aparecida
  "2026-11-02", // Finados
  "2026-11-15", // Proclamação da República
  "2026-11-20", // Consciência Negra
  "2026-12-25", // Natal
];

const HOLIDAY_SET = new Set(HOLIDAY_DATES);

export function isHoliday(date: Date): boolean {
  return HOLIDAY_SET.has(format(date, "yyyy-MM-dd"));
}

/**
 * Retorna se um dia deve gerar indicador de "pendência" para o usuário.
 * NÃO verifica se o relatório foi preenchido — isso é responsabilidade do chamador.
 * RN-07 + RN-08
 */
export function isPendingDay(date: Date, today: Date): boolean {
  const d = startOfDay(date);
  const t = startOfDay(today);
  if (d >= t) return false;        // hoje ou futuro — nunca pendente
  if (isWeekend(d)) return false;  // fim de semana — nunca pendente
  if (isHoliday(d)) return false;  // feriado — nunca pendente
  return true;
}
