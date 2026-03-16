import { z } from "zod";
import { createTRPCRouter, protectedProcedure, adminProcedure } from "@/server/trpc";

const productUpdateInput = z.object({
  id: z.string(),
  name: z.string().min(1),
  description: z.string().optional().nullable(),
  is_active: z.boolean(),
  counts_as_sale: z.boolean(),
  is_primary: z.boolean(),
  sort_order: z.number().int().nonnegative(),
});

export const productsRouter = createTRPCRouter({
  /**
   * Lista produtos ativos da empresa, ordenados por sort_order.
   * Usado para popular dropdowns de seleção de produto.
   */
  listActive: protectedProcedure.query(async ({ ctx }) => {
    const { session, db } = ctx;

    const user = await db.user.findUniqueOrThrow({
      where: { id: session.user.id },
      select: { company_id: true },
    });

    return db.product.findMany({
      where: { company_id: user.company_id, is_active: true },
      select: {
        id: true,
        name: true,
        counts_as_sale: true,
        is_primary: true,
        sort_order: true,
      },
      orderBy: { sort_order: "asc" },
    });
  }),

  // ── Admin: lista todos (ativos + inativos) ───────────────────────────────
  listAll: adminProcedure.query(async ({ ctx }) => {
    const { session, db } = ctx;

    const user = await db.user.findUniqueOrThrow({
      where: { id: session.user.id },
      select: { company_id: true },
    });

    return db.product.findMany({
      where: { company_id: user.company_id },
      select: {
        id: true,
        name: true,
        description: true,
        is_active: true,
        counts_as_sale: true,
        is_primary: true,
        sort_order: true,
        created_at: true,
      },
      orderBy: { sort_order: "asc" },
    });
  }),

  // ── Admin: cria produto ──────────────────────────────────────────────────
  create: adminProcedure
    .input(
      z.object({
        name: z.string().min(1),
        description: z.string().optional().nullable(),
        is_active: z.boolean(),
        counts_as_sale: z.boolean(),
        is_primary: z.boolean(),
        sort_order: z.number().int().nonnegative(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { session, db } = ctx;

      const user = await db.user.findUniqueOrThrow({
        where: { id: session.user.id },
        select: { company_id: true },
      });

      return db.product.create({
        data: {
          company_id: user.company_id,
          name: input.name,
          description: input.description ?? null,
          is_active: input.is_active,
          counts_as_sale: input.counts_as_sale,
          is_primary: input.is_primary,
          sort_order: input.sort_order,
        },
        select: {
          id: true,
          name: true,
          description: true,
          is_active: true,
          counts_as_sale: true,
          is_primary: true,
          sort_order: true,
          created_at: true,
        },
      });
    }),

  // ── Admin: atualiza produto (RN-12) ──────────────────────────────────────
  update: adminProcedure.input(productUpdateInput).mutation(async ({ ctx, input }) => {
    const { session, db } = ctx;

    const existing = await db.product.findUniqueOrThrow({
      where: { id: input.id },
      select: {
        counts_as_sale: true,
        is_active: true,
        is_primary: true,
        name: true,
        description: true,
        sort_order: true,
      },
    });

    const auditedFieldsChanged =
      existing.counts_as_sale !== input.counts_as_sale ||
      existing.is_active !== input.is_active ||
      existing.is_primary !== input.is_primary;

    const data = {
      name: input.name,
      description: input.description ?? null,
      is_active: input.is_active,
      counts_as_sale: input.counts_as_sale,
      is_primary: input.is_primary,
      sort_order: input.sort_order,
    };

    if (auditedFieldsChanged) {
      // RN-12: log de auditoria ANTES de atualizar, atomicamente
      const [, updated] = await db.$transaction([
        db.productAuditLog.create({
          data: {
            product_id: input.id,
            changed_by: session.user.id,
            previous_values: {
              counts_as_sale: existing.counts_as_sale,
              is_active: existing.is_active,
              is_primary: existing.is_primary,
            },
            new_values: {
              counts_as_sale: input.counts_as_sale,
              is_active: input.is_active,
              is_primary: input.is_primary,
            },
          },
        }),
        db.product.update({ where: { id: input.id }, data }),
      ]);
      return updated;
    }

    return db.product.update({ where: { id: input.id }, data });
  }),

  // ── Admin: reordena produtos ─────────────────────────────────────────────
  reorder: adminProcedure
    .input(z.object({ orderedIds: z.array(z.string()) }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.$transaction(
        input.orderedIds.map((id, index) =>
          ctx.db.product.update({
            where: { id },
            data: { sort_order: index },
          }),
        ),
      );
      return { success: true };
    }),

  // ── Admin: histórico de auditoria de um produto ──────────────────────────
  getAuditLog: adminProcedure
    .input(z.object({ productId: z.string() }))
    .query(async ({ ctx, input }) => {
      const logs = await ctx.db.productAuditLog.findMany({
        where: { product_id: input.productId },
        include: {
          changedBy: { select: { id: true, name: true } },
        },
        orderBy: { changed_at: "desc" },
      });

      return logs.map((l) => ({
        id: l.id,
        changed_at: l.changed_at.toISOString(),
        changed_by: l.changedBy,
        previous_values: l.previous_values as Record<string, unknown>,
        new_values: l.new_values as Record<string, unknown>,
      }));
    }),
});
