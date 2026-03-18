import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { parseDateStringUTC } from "@/lib/date-utils";
import { dn } from "@/lib/decimal-utils";
import {
  closerProcedure,
  createTRPCRouter,
  protectedProcedure,
} from "@/server/trpc";
import {
  createSaleInputSchema,
  computeFinancials,
} from "@/server/routers/sales";
import {
  getCompanyId,
  resolveTargetUserId,
  assertOwnerOrAdminHead,
} from "@/server/helpers/router-helpers";

// ─── Input schemas ────────────────────────────────────────────────────────────

const advanceInputSchema = z.object({
  lead_name: z.string().min(1),
  company_name: z.string().min(1),
  estimated_value: z.number().positive(),
  deadline: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  lead_score: z.number().int().min(0).max(5),
  status_flags: z.array(z.string()),
  sdr_id: z.string().optional(),
  report_id: z.string().optional(),
});

// ─── Router ──────────────────────────────────────────────────────────────────

export const advancesRouter = createTRPCRouter({
  /**
   * Cria um novo avanço (lead em negociação).
   */
  createAdvance: closerProcedure
    .input(advanceInputSchema)
    .mutation(async ({ ctx, input }) => {
      const { session, db } = ctx;

      const company_id = await getCompanyId(db, session.user.id);

      const deadline = input.deadline ? parseDateStringUTC(input.deadline) : null;

      return db.advance.create({
        data: {
          company_id,
          closer_id: session.user.id,
          sdr_id: input.sdr_id ?? null,
          report_id: input.report_id ?? null,
          lead_name: input.lead_name,
          company_name: input.company_name,
          estimated_value: input.estimated_value,
          deadline,
          lead_score: input.lead_score,
          status_flags: input.status_flags,
          is_converted: false,
        },
        select: { id: true },
      });
    }),

  /**
   * Lista avanços. Admin/head podem filtrar por qualquer usuário.
   * status: "all" | "active" | "converted"
   */
  listAdvances: protectedProcedure
    .input(
      z.object({
        userId: z.string().optional(),
        status: z.enum(["all", "active", "converted"]).default("all"),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { session, db } = ctx;

      const targetUserId = resolveTargetUserId(
        session.user.id,
        session.user.role,
        input.userId,
      );

      const isConvertedFilter =
        input.status === "all"
          ? undefined
          : input.status === "converted"
            ? true
            : false;

      const advances = await db.advance.findMany({
        where: {
          OR: [{ closer_id: targetUserId }, { sdr_id: targetUserId }],
          ...(isConvertedFilter !== undefined && {
            is_converted: isConvertedFilter,
          }),
        },
        select: {
          id: true,
          lead_name: true,
          company_name: true,
          estimated_value: true,
          deadline: true,
          lead_score: true,
          status_flags: true,
          is_converted: true,
          converted_sale_id: true,
          sdr_id: true,
          created_at: true,
          updated_at: true,
          closer: { select: { name: true } },
          sdr: { select: { name: true } },
        },
        orderBy: [{ is_converted: "asc" }, { updated_at: "desc" }],
      });

      return advances.map((a) => ({
        ...a,
        estimated_value: dn(a.estimated_value),
        deadline: a.deadline ? a.deadline.toISOString().slice(0, 10) : null,
      }));
    }),

  /**
   * Retorna detalhes de um avanço com a venda convertida (se existir).
   */
  getAdvance: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const { session, db } = ctx;

      const advance = await db.advance.findUniqueOrThrow({
        where: { id: input.id },
        include: {
          closer: { select: { name: true } },
          sdr: { select: { name: true } },
          convertedSale: {
            select: {
              id: true,
              client_name: true,
              sale_date: true,
              cash_value: true,
            },
          },
        },
      });

      assertOwnerOrAdminHead(session.user.id, session.user.role, advance.closer_id, advance.sdr_id);

      return {
        ...advance,
        estimated_value: dn(advance.estimated_value),
        deadline: advance.deadline
          ? advance.deadline.toISOString().slice(0, 10)
          : null,
        convertedSale: advance.convertedSale
          ? {
              ...advance.convertedSale,
              sale_date: advance.convertedSale.sale_date
                .toISOString()
                .slice(0, 10),
              cash_value: dn(advance.convertedSale.cash_value),
            }
          : null,
      };
    }),

  /**
   * Atualiza um avanço. Bloqueado se já convertido (RN-11).
   */
  updateAdvance: closerProcedure
    .input(
      z.object({
        id: z.string(),
        data: advanceInputSchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { session, db } = ctx;

      const advance = await db.advance.findUniqueOrThrow({
        where: { id: input.id },
        select: { closer_id: true, is_converted: true },
      });

      if (advance.is_converted) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Avanço já convertido — somente leitura.",
        });
      }

      assertOwnerOrAdminHead(session.user.id, session.user.role, advance.closer_id);

      const deadline = input.data.deadline ? parseDateStringUTC(input.data.deadline) : null;

      return db.advance.update({
        where: { id: input.id },
        data: {
          lead_name: input.data.lead_name,
          company_name: input.data.company_name,
          estimated_value: input.data.estimated_value,
          deadline,
          lead_score: input.data.lead_score,
          status_flags: input.data.status_flags,
          sdr_id: input.data.sdr_id ?? null,
          report_id: input.data.report_id ?? null,
        },
        select: { id: true },
      });
    }),

  /**
   * Exclui um avanço. Bloqueado se já convertido (RN-11).
   */
  deleteAdvance: closerProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { session, db } = ctx;

      const advance = await db.advance.findUniqueOrThrow({
        where: { id: input.id },
        select: { closer_id: true, is_converted: true },
      });

      if (advance.is_converted) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Avanço já convertido não pode ser excluído.",
        });
      }

      assertOwnerOrAdminHead(session.user.id, session.user.role, advance.closer_id);

      await db.advance.delete({ where: { id: input.id } });
      return { success: true };
    }),

  /**
   * Converte um avanço em venda. Operação atômica via $transaction (RN-11).
   * sale_origin é forçado para "advance" independente do input.
   * closer_id da venda = closer_id do avanço (não o usuário logado).
   */
  convertToSale: closerProcedure
    .input(
      z.object({
        advance_id: z.string(),
        sale: createSaleInputSchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { session, db } = ctx;

      return db.$transaction(async (tx) => {
        // 1. Verificar avanço
        const advance = await tx.advance.findUniqueOrThrow({
          where: { id: input.advance_id },
          select: {
            closer_id: true,
            sdr_id: true,
            is_converted: true,
            company_id: true,
          },
        });

        if (advance.is_converted) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Este avanço já foi convertido em venda.",
          });
        }

        assertOwnerOrAdminHead(session.user.id, session.user.role, advance.closer_id);

        // 2–4. Validar produto, buscar taxa e calcular financeiros (RN-06, RN-09)
        const financials = await computeFinancials(tx, input.sale);

        // 5. Criar venda — closer_id = advance.closer_id (não session.user.id)
        const sale = await tx.sale.create({
          data: {
            company_id: advance.company_id,
            closer_id: advance.closer_id,
            sdr_id: input.sale.sdr_id ?? advance.sdr_id ?? null,
            product_id: input.sale.product_id,
            report_id: input.sale.report_id ?? null,
            client_name: input.sale.client_name,
            client_company: input.sale.client_company,
            client_revenue_tier: input.sale.client_revenue_tier,
            contract_value: input.sale.contract_value,
            contract_months: input.sale.contract_months,
            payment_method: input.sale.payment_method,
            gateway_id: input.sale.gateway_id ?? null,
            installments: input.sale.installments ?? null,
            down_payment: financials.down_payment,
            cash_value: financials.cash_value,
            net_value: financials.net_value,
            future_revenue: financials.future_revenue,
            counts_as_sale: financials.counts_as_sale,
            sale_origin: "advance", // forçado — RN-11
            is_recovered: input.sale.is_recovered,
            sale_date: financials.sale_date,
          },
          select: { id: true },
        });

        // 6. Atualizar avanço atomicamente (RN-11)
        await tx.advance.update({
          where: { id: input.advance_id },
          data: {
            is_converted: true,
            converted_sale_id: sale.id,
            updated_at: new Date(),
          },
        });

        return { sale_id: sale.id, advance_id: input.advance_id };
      });
    }),
});
