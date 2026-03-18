import { z } from "zod";
import {
  createTRPCRouter,
  goalsViewProcedure,
  goalsEditProcedure,
} from "@/server/trpc";
import { startOfMonth } from "date-fns";
import { getWorkdaysInMonth, isPendingDay } from "@/lib/workdays";
import { getCompanyId } from "@/server/helpers/router-helpers";

// ─── Input schemas ─────────────────────────────────────────────────────────

const upsertGoalInput = z.object({
  month: z.string(), // "YYYY-MM-DD" — dia 01
  cash_goal: z.number().positive(),
  sales_goal: z.number().int().positive(),
  reason: z.string().optional(),
});

const upsertIndividualGoalInput = z.object({
  goalId: z.string(),
  userId: z.string(),
  cash_goal: z.number().nonnegative(),
  sales_goal: z.number().int().nonnegative().optional().nullable(),
  rate_answer: z.number().min(0).max(1).optional().nullable(),
  rate_schedule: z.number().min(0).max(1).optional().nullable(),
  rate_noshow_max: z.number().min(0).max(1).optional().nullable(),
  rate_close: z.number().min(0).max(1).optional().nullable(),
});

// ─── Helper ────────────────────────────────────────────────────────────────

function serializeGoal(g: {
  id: string;
  month: Date;
  cash_goal: { toNumber(): number } | number;
  sales_goal: number;
  created_at: Date;
}) {
  return {
    id: g.id,
    month: g.month.toISOString(),
    cash_goal:
      typeof g.cash_goal === "number" ? g.cash_goal : g.cash_goal.toNumber(),
    sales_goal: g.sales_goal,
    created_at: g.created_at.toISOString(),
  };
}

function serializeIndividualGoal(ig: {
  id: string;
  user_id: string;
  goal_id: string;
  cash_goal: { toNumber(): number } | number;
  sales_goal: number | null;
  rate_answer: { toNumber(): number } | number | null;
  rate_schedule: { toNumber(): number } | number | null;
  rate_noshow_max: { toNumber(): number } | number | null;
  rate_close: { toNumber(): number } | number | null;
  user: { id: string; name: string; role: string; avatar_url: string | null };
}) {
  const n = (v: { toNumber(): number } | number | null) =>
    v === null ? null : typeof v === "number" ? v : v.toNumber();
  return {
    id: ig.id,
    user_id: ig.user_id,
    goal_id: ig.goal_id,
    cash_goal: n(ig.cash_goal) ?? 0,
    sales_goal: ig.sales_goal,
    rate_answer: n(ig.rate_answer),
    rate_schedule: n(ig.rate_schedule),
    rate_noshow_max: n(ig.rate_noshow_max),
    rate_close: n(ig.rate_close),
    user: ig.user,
  };
}

// ─── Router ────────────────────────────────────────────────────────────────

export const goalsRouter = createTRPCRouter({
  // ── Busca meta do mês com metas individuais ─────────────────────────────
  getGoalForMonth: goalsViewProcedure
    .input(z.object({ month: z.string() }))
    .query(async ({ ctx, input }) => {
      const { db } = ctx;
      const monthDate = startOfMonth(new Date(input.month));

      const goal = await db.goal.findFirst({
        where: { month: monthDate },
        include: {
          individualGoals: {
            include: {
              user: {
                select: { id: true, name: true, role: true, avatar_url: true },
              },
            },
          },
        },
      });

      if (!goal) return { goal: null, individualGoals: [] };

      return {
        goal: serializeGoal(goal),
        individualGoals: goal.individualGoals.map(serializeIndividualGoal),
      };
    }),

  // ── Lista todos os meses com metas registradas ──────────────────────────
  listGoals: goalsViewProcedure.query(async ({ ctx }) => {
    const goals = await ctx.db.goal.findMany({
      orderBy: { month: "desc" },
      include: {
        _count: { select: { individualGoals: true } },
      },
    });

    return goals.map((g) => ({
      ...serializeGoal(g),
      individualGoalsCount: g._count.individualGoals,
    }));
  }),

  // ── Histórico de auditoria de uma meta ──────────────────────────────────
  getAuditLog: goalsViewProcedure
    .input(z.object({ goalId: z.string() }))
    .query(async ({ ctx, input }) => {
      const logs = await ctx.db.goalAuditLog.findMany({
        where: { goal_id: input.goalId },
        include: {
          changedBy: { select: { id: true, name: true } },
        },
        orderBy: { changed_at: "desc" },
      });

      return logs.map((l) => ({
        id: l.id,
        changed_at: l.changed_at.toISOString(),
        changed_by: l.changedBy,
        previous_cash: l.previous_cash ? Number(l.previous_cash) : null,
        new_cash: l.new_cash ? Number(l.new_cash) : null,
        previous_sales_goal: l.previous_sales_goal,
        new_sales_goal: l.new_sales_goal,
        reason: l.reason,
      }));
    }),

  // ── Central de pendências ───────────────────────────────────────────────
  getPendingCenter: goalsViewProcedure
    .input(z.object({ month: z.string() }))
    .query(async ({ ctx, input }) => {
      const { db } = ctx;
      const monthDate = startOfMonth(new Date(input.month));
      const today = new Date();

      // Dias úteis pendentes calculados antes das queries
      const workdays = getWorkdaysInMonth(monthDate);
      const pendingDays = workdays.filter((d) => isPendingDay(d, today));

      // Queries independentes em paralelo
      const [goal, salesUsers] = await Promise.all([
        db.goal.findFirst({ where: { month: monthDate } }),
        db.user.findMany({
          where: { role: { in: ["closer", "sdr"] }, is_active: true },
          select: { id: true, name: true, role: true, avatar_url: true },
        }),
      ]);

      // IDs com IndividualGoal definida neste mês
      const withGoal = goal
        ? await db.individualGoal.findMany({
            where: { goal_id: goal.id },
            select: { user_id: true },
          })
        : [];
      const withGoalIds = new Set(withGoal.map((g) => g.user_id));

      // Usuários sem meta
      const withoutGoal = salesUsers.filter((u) => !withGoalIds.has(u.id));

      // Relatórios preenchidos no mês (short-circuit se não há dias pendentes)
      const reports =
        pendingDays.length > 0
          ? await db.dailyReport.findMany({
              where: {
                report_date: { in: pendingDays },
                user_id: { in: salesUsers.map((u) => u.id) },
              },
              select: { user_id: true, report_date: true },
            })
          : [];

      const reportsByUser = new Map<string, Set<string>>();
      for (const r of reports) {
        const key = r.report_date.toISOString().substring(0, 10);
        if (!reportsByUser.has(r.user_id)) {
          reportsByUser.set(r.user_id, new Set());
        }
        reportsByUser.get(r.user_id)!.add(key);
      }

      const lateReports = salesUsers
        .map((u) => {
          const filled = reportsByUser.get(u.id)?.size ?? 0;
          const pending = pendingDays.length - filled;
          return { ...u, pending_days: pending };
        })
        .filter((u) => u.pending_days > 0);

      return {
        goalId: goal?.id ?? null,
        withoutGoal,
        lateReports,
      };
    }),

  // ── Cria ou atualiza meta do mês (RN-10) ────────────────────────────────
  upsertGoal: goalsEditProcedure
    .input(upsertGoalInput)
    .mutation(async ({ ctx, input }) => {
      const { db, session } = ctx;
      const userId = session.user.id;

      const company_id = await getCompanyId(db, userId);
      const monthDate = startOfMonth(new Date(input.month));

      const existing = await db.goal.findFirst({
        where: { company_id, month: monthDate },
      });

      if (existing) {
        // RN-10: gerar auditoria ANTES de salvar, atomicamente
        const updated = await db.$transaction(async (tx) => {
          await tx.goalAuditLog.create({
            data: {
              goal_id: existing.id,
              changed_by: userId,
              previous_cash: existing.cash_goal,
              new_cash: input.cash_goal,
              previous_sales_goal: existing.sales_goal,
              new_sales_goal: input.sales_goal,
              reason: input.reason ?? null,
            },
          });
          return tx.goal.update({
            where: { id: existing.id },
            data: { cash_goal: input.cash_goal, sales_goal: input.sales_goal },
          });
        });

        return serializeGoal(updated);
      }

      const created = await db.goal.create({
        data: {
          company_id,
          month: monthDate,
          cash_goal: input.cash_goal,
          sales_goal: input.sales_goal,
          created_by: userId,
        },
      });

      return serializeGoal(created);
    }),

  // ── Cria ou atualiza meta individual ────────────────────────────────────
  upsertIndividualGoal: goalsEditProcedure
    .input(upsertIndividualGoalInput)
    .mutation(async ({ ctx, input }) => {
      const { db, session } = ctx;

      const company_id = await getCompanyId(db, session.user.id);

      const existing = await db.individualGoal.findFirst({
        where: { user_id: input.userId, goal_id: input.goalId },
      });

      const data = {
        cash_goal: input.cash_goal,
        sales_goal: input.sales_goal ?? null,
        rate_answer: input.rate_answer ?? null,
        rate_schedule: input.rate_schedule ?? null,
        rate_noshow_max: input.rate_noshow_max ?? null,
        rate_close: input.rate_close ?? null,
      };

      if (existing) {
        const updated = await db.individualGoal.update({
          where: { id: existing.id },
          data,
          include: {
            user: {
              select: { id: true, name: true, role: true, avatar_url: true },
            },
          },
        });
        return serializeIndividualGoal(updated);
      }

      const created = await db.individualGoal.create({
        data: {
          ...data,
          company_id,
          user_id: input.userId,
          goal_id: input.goalId,
        },
        include: {
          user: {
            select: { id: true, name: true, role: true, avatar_url: true },
          },
        },
      });

      return serializeIndividualGoal(created);
    }),

  // ── Remove meta individual ────────────────────────────────────────────
  deleteIndividualGoal: goalsEditProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.individualGoal.delete({ where: { id: input.id } });
      return { success: true };
    }),
});
