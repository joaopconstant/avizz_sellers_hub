import { z } from "zod";
import { createTRPCRouter, protectedProcedure, adminProcedure } from "@/server/trpc";

type GatewayWithRates = {
  id: string;
  name: string;
  is_active: boolean;
  created_at: Date;
  rates: { id: string; installments: number; rate_percent: { toNumber(): number } | number }[];
};

function serializeGateway(g: GatewayWithRates) {
  return {
    id: g.id,
    name: g.name,
    is_active: g.is_active,
    created_at: g.created_at.toISOString(),
    rates: g.rates.map((r) => ({
      id: r.id,
      installments: r.installments,
      rate_percent: typeof r.rate_percent === "number" ? r.rate_percent : r.rate_percent.toNumber(),
    })),
  };
}

export const gatewaysRouter = createTRPCRouter({
  /**
   * Lista gateways ativos da empresa.
   * Usado para popular dropdown de gateway no formulário de venda com cartão.
   */
  listActive: protectedProcedure.query(async ({ ctx }) => {
    const { session, db } = ctx;

    const user = await db.user.findUniqueOrThrow({
      where: { id: session.user.id },
      select: { company_id: true },
    });

    return db.gateway.findMany({
      where: { company_id: user.company_id, is_active: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });
  }),

  /**
   * Retorna a taxa do gateway para um número específico de parcelas.
   * Usado para preview do net_value no formulário (cálculo real ocorre no servidor).
   */
  getRate: protectedProcedure
    .input(
      z.object({
        gateway_id: z.string().min(1),
        installments: z.number().int().min(1).max(12),
      }),
    )
    .query(async ({ ctx, input }) => {
      const rate = await ctx.db.gatewayRate.findUnique({
        where: {
          gateway_id_installments: {
            gateway_id: input.gateway_id,
            installments: input.installments,
          },
        },
        select: { rate_percent: true },
      });

      if (!rate) return null;

      return { rate_percent: Number(rate.rate_percent) };
    }),

  // ── Admin: lista todos os gateways com taxas ─────────────────────────────
  listAll: adminProcedure.query(async ({ ctx }) => {
    const { session, db } = ctx;

    const user = await db.user.findUniqueOrThrow({
      where: { id: session.user.id },
      select: { company_id: true },
    });

    const gateways = await db.gateway.findMany({
      where: { company_id: user.company_id },
      include: {
        rates: { orderBy: { installments: "asc" } },
      },
      orderBy: { name: "asc" },
    });

    return gateways.map(serializeGateway);
  }),

  // ── Admin: cria gateway ───────────────────────────────────────────────────
  create: adminProcedure
    .input(z.object({ name: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const { session, db } = ctx;

      const user = await db.user.findUniqueOrThrow({
        where: { id: session.user.id },
        select: { company_id: true },
      });

      const created = await db.gateway.create({
        data: { company_id: user.company_id, name: input.name, is_active: true },
      });

      return serializeGateway({ ...created, rates: [] });
    }),

  // ── Admin: ativa/desativa gateway ────────────────────────────────────────
  toggleActive: adminProcedure
    .input(z.object({ gatewayId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const gateway = await ctx.db.gateway.findUniqueOrThrow({
        where: { id: input.gatewayId },
        select: { is_active: true },
      });

      const updated = await ctx.db.gateway.update({
        where: { id: input.gatewayId },
        data: { is_active: !gateway.is_active },
        include: { rates: { orderBy: { installments: "asc" } } },
      });

      return serializeGateway(updated);
    }),

  // ── Admin: upsert de taxa ─────────────────────────────────────────────────
  upsertRate: adminProcedure
    .input(
      z.object({
        gatewayId: z.string(),
        installments: z.number().int().min(1).max(12),
        rate_percent: z.number().min(0).max(100),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const rate = await ctx.db.gatewayRate.upsert({
        where: {
          gateway_id_installments: {
            gateway_id: input.gatewayId,
            installments: input.installments,
          },
        },
        create: {
          gateway_id: input.gatewayId,
          installments: input.installments,
          rate_percent: input.rate_percent,
        },
        update: { rate_percent: input.rate_percent },
      });

      return {
        id: rate.id,
        installments: rate.installments,
        rate_percent: Number(rate.rate_percent),
      };
    }),

  // ── Admin: remove taxa ────────────────────────────────────────────────────
  deleteRate: adminProcedure
    .input(
      z.object({
        gatewayId: z.string(),
        installments: z.number().int().min(1).max(12),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db.gatewayRate.delete({
        where: {
          gateway_id_installments: {
            gateway_id: input.gatewayId,
            installments: input.installments,
          },
        },
      });
      return { success: true };
    }),
});
