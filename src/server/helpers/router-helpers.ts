import { TRPCError } from "@trpc/server";
import type { PrismaClient } from "@/lib/generated/prisma/client";
import type { UserRole } from "@/lib/generated/prisma/enums";

/**
 * Busca o company_id do usuário autenticado.
 * Padrão repetido em products, gateways, goals, users, sales, advances, reports.
 */
export async function getCompanyId(
  db: PrismaClient,
  userId: string,
): Promise<string> {
  const user = await db.user.findUniqueOrThrow({
    where: { id: userId },
    select: { company_id: true },
  });
  return user.company_id;
}

/**
 * Resolve o targetUserId a partir do input.
 * Se o caller tentar ver outro usuário sem ser admin/head, lança FORBIDDEN.
 * Usado em: sales.listSales, advances.listAdvances, reports.getMonthCalendar.
 */
export function resolveTargetUserId(
  sessionUserId: string,
  role: UserRole,
  inputUserId?: string,
): string {
  if (inputUserId && inputUserId !== sessionUserId) {
    if (role !== "admin" && role !== "head") {
      throw new TRPCError({ code: "FORBIDDEN" });
    }
    return inputUserId;
  }
  return sessionUserId;
}

/**
 * Garante que o chamador é dono (closer_id ou sdr_id) OU admin/head.
 * Lança FORBIDDEN se nenhuma condição for satisfeita.
 * Usado em: sales.getSale/deleteSale, advances.getAdvance/updateAdvance/deleteAdvance/convertToSale.
 */
export function assertOwnerOrAdminHead(
  sessionUserId: string,
  role: UserRole,
  closerId: string,
  sdrId?: string | null,
): void {
  const isOwner = closerId === sessionUserId || sdrId === sessionUserId;
  const isAdminOrHead = role === "admin" || role === "head";
  if (!isOwner && !isAdminOrHead) {
    throw new TRPCError({ code: "FORBIDDEN" });
  }
}
