/**
 * Utilitários de formatação compartilhados entre cliente e servidor.
 * Centralizados aqui para evitar duplicação e garantir consistência (pt-BR).
 */

const CURRENCY_FORMATTER = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
});

const CURRENCY_FORMATTER_DECIMAL = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatCurrency(value: number): string {
  return CURRENCY_FORMATTER.format(value);
}

export function formatCurrencyDecimal(value: number): string {
  return CURRENCY_FORMATTER_DECIMAL.format(value);
}

/** Converte fração (0–1) para string de percentual com uma casa decimal. Ex: 0.123 → "12.3%" */
export function formatPercent(value: number): string {
  return (value * 100).toFixed(1) + "%";
}

/** Formata número inteiro com separador de milhar pt-BR. */
export function formatInteger(value: number): string {
  return new Intl.NumberFormat("pt-BR").format(Math.round(value));
}
