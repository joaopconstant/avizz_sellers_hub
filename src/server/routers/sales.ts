import { TRPCError } from "@trpc/server";
import { z } from "zod";

import {
  calculateCashValue,
  calculateNetValue,
  calculateFutureRevenue,
} from "@/lib/financials";
import { parseDateStringUTC } from "@/lib/date-utils";
import { d, dn } from "@/lib/decimal-utils";
import {
  closerProcedure,
  createTRPCRouter,
  protectedProcedure,
} from "@/server/trpc";
import {
  getCompanyId,
  resolveTargetUserId,
  assertOwnerOrAdminHead,
} from "@/server/helpers/router-helpers";

// ─── Shared input schema (also used by advances.convertToSale) ───────────────

export const createSaleInputSchema = z
  .object({
    product_id: z.string().min(1),
    client_name: z.string().min(1),
    client_company: z.string().min(1),
    client_revenue_tier: z.enum(["small", "medium", "large", "enterprise"]),
    contract_value: z.number().positive(),
    contract_months: z.number().int().min(1),
    payment_method: z.enum(["pix", "card", "boleto"]),
    gateway_id: z.string().optional(),
    installments: z.number().int().min(1).max(12).optional(),
    down_payment: z.number().min(0).optional(),
    sale_origin: z.enum(["organic", "referral", "outbound", "advance"]),
    is_recovered: z.boolean().default(false),
    sale_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    sdr_id: z.string().optional(),
    report_id: z.string().optional(),
  })
  .refine(
    (data) =>
      data.payment_method !== "card" ||
      (data.gateway_id && data.installments !== undefined),
    {
      message:
        "Gateway e número de parcelas são obrigatórios para pagamento com cartão.",
      path: ["gateway_id"],
    },
  )
  .refine(
    (data) =>
      data.down_payment === undefined ||
      data.down_payment <= data.contract_value,
    {
      message: "O valor de entrada não pode ser maior que o valor do contrato.",
      path: ["down_payment"],
    },
  );

// ─── Shared helper (also used by advances.convertToSale inside $transaction) ──

type FinancialsClient = Pick<
  Parameters<Parameters<typeof closerProcedure.mutation>[0]>[0]["ctx"]["db"],
  "product" | "gatewayRate"
>;

export async function computeFinancials(
  db: FinancialsClient,
  input: z.infer<typeof createSaleInputSchema>,
) {
  const product = await db.product.findUniqueOrThrow({
    where: { id: input.product_id },
    select: { counts_as_sale: true, is_active: true },
  });

  if (!product.is_active) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Produto inativo não pode ser associado a uma venda.",
    });
  }

  let ratePercent: number | null = null;
  if (input.payment_method === "card") {
    const rate = await db.gatewayRate.findUnique({
      where: {
        gateway_id_installments: {
          gateway_id: input.gateway_id!,
          installments: input.installments!,
        },
      },
      select: { rate_percent: true },
    });
    if (!rate) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `Taxa não encontrada para este gateway com ${input.installments}x.`,
      });
    }
    ratePercent = Number(rate.rate_percent);
  }

  const downPayment = input.down_payment ?? 0;
  const cashValue = calculateCashValue(
    input.payment_method,
    input.contract_value,
    downPayment,
  );
  const netValue = calculateNetValue(
    input.payment_method,
    input.contract_value,
    ratePercent,
  );
  const futureRevenue = calculateFutureRevenue(input.contract_value, cashValue);

  const saleDate = parseDateStringUTC(input.sale_date);

  return {
    counts_as_sale: product.counts_as_sale,
    cash_value: cashValue,
    net_value: netValue,
    future_revenue: futureRevenue,
    sale_date: saleDate,
    down_payment: downPayment > 0 ? downPayment : null,
  };
}

// ─── Router ──────────────────────────────────────────────────────────────────

export const salesRouter = createTRPCRouter({
  /**
   * Cria uma nova venda. Cálculos financeiros são sempre feitos no servidor (RN-09).
   * counts_as_sale é snapshot imutável do produto (RN-06).
   */
  createSale: closerProcedure
    .input(createSaleInputSchema)
    .mutation(async ({ ctx, input }) => {
      const { session, db } = ctx;

      const company_id = await getCompanyId(db, session.user.id);
      const financials = await computeFinancials(db, input);

      return db.sale.create({
        data: {
          company_id,
          closer_id: session.user.id,
          sdr_id: input.sdr_id ?? null,
          product_id: input.product_id,
          report_id: input.report_id ?? null,
          client_name: input.client_name,
          client_company: input.client_company,
          client_revenue_tier: input.client_revenue_tier,
          contract_value: input.contract_value,
          contract_months: input.contract_months,
          payment_method: input.payment_method,
          gateway_id: input.gateway_id ?? null,
          installments: input.installments ?? null,
          down_payment: financials.down_payment,
          cash_value: financials.cash_value,
          net_value: financials.net_value,
          future_revenue: financials.future_revenue,
          counts_as_sale: financials.counts_as_sale,
          sale_origin: input.sale_origin,
          is_recovered: input.is_recovered,
          sale_date: financials.sale_date,
        },
        select: { id: true },
      });
    }),

  /**
   * Lista vendas com filtro opcional de usuário.
   * Admin/head podem filtrar por qualquer usuário.
   * Por padrão retorna vendas onde closer_id = me OU sdr_id = me.
   */
  listSales: protectedProcedure
    .input(
      z.object({
        userId: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { session, db } = ctx;

      const targetUserId = resolveTargetUserId(
        session.user.id,
        session.user.role,
        input.userId,
      );

      const sales = await db.sale.findMany({
        where: {
          OR: [{ closer_id: targetUserId }, { sdr_id: targetUserId }],
        },
        select: {
          id: true,
          sale_date: true,
          client_name: true,
          client_company: true,
          contract_value: true,
          payment_method: true,
          cash_value: true,
          net_value: true,
          future_revenue: true,
          counts_as_sale: true,
          sale_origin: true,
          is_recovered: true,
          created_at: true,
          product: { select: { name: true } },
          closer: { select: { name: true } },
          sdr: { select: { name: true } },
        },
        orderBy: [{ sale_date: "desc" }, { created_at: "desc" }],
      });

      return sales.map((s) => ({
        ...s,
        sale_date: s.sale_date.toISOString().slice(0, 10),
        contract_value: dn(s.contract_value),
        cash_value: dn(s.cash_value),
        net_value: dn(s.net_value),
        future_revenue: dn(s.future_revenue),
      }));
    }),

  /**
   * Retorna detalhes de uma venda específica (verificação de ownership).
   */
  getSale: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const { session, db } = ctx;

      const sale = await db.sale.findUniqueOrThrow({
        where: { id: input.id },
        include: {
          product: { select: { name: true, counts_as_sale: true } },
          closer: { select: { name: true } },
          sdr: { select: { name: true } },
          gateway: { select: { name: true } },
        },
      });

      assertOwnerOrAdminHead(session.user.id, session.user.role, sale.closer_id, sale.sdr_id);

      return {
        ...sale,
        sale_date: sale.sale_date.toISOString().slice(0, 10),
        contract_value: dn(sale.contract_value),
        cash_value: dn(sale.cash_value),
        net_value: dn(sale.net_value),
        future_revenue: dn(sale.future_revenue),
        down_payment: d(sale.down_payment),
      };
    }),

  /**
   * Exclui uma venda. Bloqueado se a venda estiver vinculada a um avanço convertido.
   */
  deleteSale: closerProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { session, db } = ctx;

      const sale = await db.sale.findUniqueOrThrow({
        where: { id: input.id },
        select: { closer_id: true },
      });

      assertOwnerOrAdminHead(session.user.id, session.user.role, sale.closer_id);

      // Bloquear exclusão se vinculada a avanço convertido
      const linkedAdvance = await db.advance.findFirst({
        where: { converted_sale_id: input.id },
        select: { id: true },
      });

      if (linkedAdvance) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "Esta venda está vinculada a um avanço convertido e não pode ser excluída.",
        });
      }

      await db.sale.delete({ where: { id: input.id } });
      return { success: true };
    }),

  /**
   * Lista SDRs ativos — usados no seletor de SDR do formulário de venda.
   */
  listSdrs: closerProcedure.query(async ({ ctx }) => {
    const { session, db } = ctx;

    const company_id = await getCompanyId(db, session.user.id);

    return db.user.findMany({
      where: { company_id, role: "sdr", is_active: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });
  }),
});
