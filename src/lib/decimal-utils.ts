/**
 * Utilitários para converter campos Decimal do Prisma em number.
 * Elimina o uso inconsistente de .toNumber() e Number() espalhados pelos routers.
 */

type DecimalLike = { toNumber(): number } | number;

/** Converte Decimal ou number para number, preservando null. */
export function d(value: DecimalLike | null): number | null {
  if (value === null) return null;
  return typeof value === "number" ? value : value.toNumber();
}

/** Converte Decimal ou number para number (sem null). */
export function dn(value: DecimalLike): number {
  return typeof value === "number" ? value : value.toNumber();
}
