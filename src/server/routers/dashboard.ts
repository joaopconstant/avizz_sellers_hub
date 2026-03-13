import { z } from "zod";
import {
  createTRPCRouter,
  protectedProcedure,
  dashboardGlobalProcedure,
  adminOrHeadProcedure,
} from "@/server/trpc";
import {
  startOfMonth,
  endOfMonth,
  subMonths,
  isAfter,
  startOfDay,
} from "date-fns";
import { getWorkdaysInMonth } from "@/lib/workdays";

const rangeInput = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
});

export const dashboardRouter = createTRPCRouter({
  // ─── Mini-painel sidebar (existente) ────────────────────────────────────────
  getMyGoalsSummary: protectedProcedure.query(async ({ ctx }) => {
    const { session, db } = ctx;
    const userId = session.user.id;
    const role = session.user.role;

    if (role === "operational") {
      return null;
    }

    const currentMonth = startOfMonth(new Date());

    const individualGoal = await db.individualGoal.findFirst({
      where: {
        user_id: userId,
        goal: { month: currentMonth },
      },
      include: { goal: true },
    });

    if (!individualGoal) {
      return { defined: false as const, role };
    }

    const startDate = currentMonth;
    const endDate = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth() + 1,
      1,
    );

    if (role === "closer") {
      const [sales, reports] = await Promise.all([
        db.sale.findMany({
          where: { closer_id: userId, sale_date: { gte: startDate, lt: endDate } },
          select: { cash_value: true, counts_as_sale: true },
        }),
        db.dailyReport.findMany({
          where: { user_id: userId, report_date: { gte: startDate, lt: endDate } },
          select: { calls_done: true, closer_no_shows: true },
        }),
      ]);

      const cashRealized = sales.reduce((sum, s) => sum + Number(s.cash_value), 0);
      const salesCount = sales.filter((s) => s.counts_as_sale).length;
      const totalCalls = reports.reduce((s, r) => s + (r.calls_done ?? 0), 0);
      const totalNoShows = reports.reduce((s, r) => s + (r.closer_no_shows ?? 0), 0);

      return {
        defined: true as const,
        role: "closer" as const,
        cashGoal: Number(individualGoal.cash_goal),
        cashRealized,
        conversionRate: totalCalls > 0 ? salesCount / totalCalls : 0,
        conversionGoal: Number(individualGoal.rate_close ?? 0),
        noShowRate: totalCalls > 0 ? totalNoShows / totalCalls : 0,
        noShowMax: Number(individualGoal.rate_noshow_max ?? 0),
      };
    }

    if (role === "sdr") {
      const [sales, reports] = await Promise.all([
        db.sale.findMany({
          where: { sdr_id: userId, sale_date: { gte: startDate, lt: endDate } },
          select: { cash_value: true, counts_as_sale: true },
        }),
        db.dailyReport.findMany({
          where: { user_id: userId, report_date: { gte: startDate, lt: endDate } },
          select: { calls_answered: true, meetings_held: true },
        }),
      ]);

      const cashRealized = sales.reduce((sum, s) => sum + Number(s.cash_value), 0);
      const totalAnswered = reports.reduce((s, r) => s + (r.calls_answered ?? 0), 0);
      const totalMeetings = reports.reduce((s, r) => s + (r.meetings_held ?? 0), 0);

      return {
        defined: true as const,
        role: "sdr" as const,
        cashGoal: Number(individualGoal.cash_goal),
        cashRealized,
        noShowRate: totalMeetings > 0 ? (totalMeetings - totalAnswered) / totalMeetings : 0,
        noShowMax: Number(individualGoal.rate_noshow_max ?? 0),
      };
    }

    // admin / head
    const sales = await db.sale.findMany({
      where: { closer_id: userId, sale_date: { gte: startDate, lt: endDate } },
      select: { cash_value: true },
    });

    return {
      defined: true as const,
      role,
      cashGoal: Number(individualGoal.cash_goal),
      cashRealized: sales.reduce((sum, s) => sum + Number(s.cash_value), 0),
    };
  }),

  // ─── Resumo global do mês ───────────────────────────────────────────────────
  getSummary: dashboardGlobalProcedure
    .input(rangeInput.optional())
    .query(async ({ ctx, input }) => {
      const { session, db } = ctx;
      const role = session.user.role;
      const userId = session.user.id;
      const startDate = input?.from ? new Date(input.from) : startOfMonth(new Date());
      const endDate = input?.to ? new Date(input.to) : endOfMonth(startDate);

      const [sales, activeAdvances, goal] = await Promise.all([
        db.sale.findMany({
          where: { sale_date: { gte: startDate, lte: endDate } },
          select: {
            cash_value: true,
            net_value: true,
            future_revenue: true,
            counts_as_sale: true,
            closer_id: true,
            sdr_id: true,
          },
        }),
        db.advance.count({
          where: { is_converted: false },
        }),
        db.goal.findFirst({
          where: { month: startOfMonth(startDate) },
        }),
      ]);

      const cashRealized = sales.reduce((s, x) => s + Number(x.cash_value), 0);
      const netRealized = sales.reduce((s, x) => s + Number(x.net_value), 0);
      const futureRevenue = sales.reduce((s, x) => s + Number(x.future_revenue), 0);
      const salesCount = sales.filter((x) => x.counts_as_sale).length;

      // Projeção de caixa baseada em dias úteis
      const workdays = getWorkdaysInMonth(startOfMonth(startDate));
      const today = startOfDay(new Date());
      const elapsed = workdays.filter((d) => !isAfter(d, today)).length;
      const cashProjected =
        elapsed > 0 ? (cashRealized / elapsed) * workdays.length : 0;

      // Dados pessoais (exceto operational)
      let myCashRealized: number | null = null;
      let mySalesCount: number | null = null;

      if (role !== "operational") {
        myCashRealized = sales
          .filter((s) => s.closer_id === userId || s.sdr_id === userId)
          .reduce((sum, s) => sum + Number(s.cash_value), 0);
        mySalesCount = sales.filter(
          (s) => s.counts_as_sale && (s.closer_id === userId || s.sdr_id === userId),
        ).length;
      }

      return {
        cashRealized,
        netRealized,
        futureRevenue,
        salesCount,
        cashProjected,
        activeAdvances,
        cashGoal: goal ? Number(goal.cash_goal) : null,
        salesGoal: goal ? goal.sales_goal : null,
        myCashRealized,
        mySalesCount,
        workdaysTotal: workdays.length,
        workdaysElapsed: elapsed,
      };
    }),

  // ─── Funil de conversão ─────────────────────────────────────────────────────
  getFunnel: dashboardGlobalProcedure
    .input(rangeInput.extend({ userId: z.string().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const { db, session } = ctx;
      const startDate = input?.from ? new Date(input.from) : startOfMonth(new Date());
      const endDate = input?.to ? new Date(input.to) : endOfMonth(startDate);
      const role = session.user.role;

      const canFilterUser = role === "admin" || role === "head";
      const userFilter =
        input?.userId && canFilterUser ? { user_id: input.userId } : {};
      const saleUserFilter =
        input?.userId && canFilterUser
          ? { OR: [{ closer_id: input.userId }, { sdr_id: input.userId }] }
          : {};

      const [reports, salesCount] = await Promise.all([
        db.dailyReport.findMany({
          where: { report_date: { gte: startDate, lte: endDate }, ...userFilter },
          select: {
            calls_total: true,
            calls_answered: true,
            meetings_scheduled: true,
            meetings_held: true,
          },
        }),
        db.sale.count({
          where: {
            sale_date: { gte: startDate, lte: endDate },
            counts_as_sale: true,
            ...saleUserFilter,
          },
        }),
      ]);

      const callsTotal = reports.reduce((s, r) => s + (r.calls_total ?? 0), 0);
      const callsAnswered = reports.reduce((s, r) => s + (r.calls_answered ?? 0), 0);
      const meetingsScheduled = reports.reduce((s, r) => s + (r.meetings_scheduled ?? 0), 0);
      const meetingsHeld = reports.reduce((s, r) => s + (r.meetings_held ?? 0), 0);

      const pct = (num: number, den: number) =>
        den > 0 ? Math.round((num / den) * 1000) / 10 : null;

      return [
        {
          label: "Ligações Totais",
          count: callsTotal,
          conversionFromPrev: null,
        },
        {
          label: "Atendidas",
          count: callsAnswered,
          conversionFromPrev: pct(callsAnswered, callsTotal),
        },
        {
          label: "Agendamentos",
          count: meetingsScheduled,
          conversionFromPrev: pct(meetingsScheduled, callsAnswered),
        },
        {
          label: "Reuniões Realizadas",
          count: meetingsHeld,
          conversionFromPrev: pct(meetingsHeld, meetingsScheduled),
        },
        {
          label: "Vendas",
          count: salesCount,
          conversionFromPrev: pct(salesCount, meetingsHeld),
        },
      ];
    }),

  // ─── Rankings ───────────────────────────────────────────────────────────────
  getRankings: dashboardGlobalProcedure
    .input(rangeInput.optional())
    .query(async ({ ctx, input }) => {
      const { db } = ctx;
      const startDate = input?.from ? new Date(input.from) : startOfMonth(new Date());
      const endDate = input?.to ? new Date(input.to) : endOfMonth(startDate);

      // Closers e SDRs ativos
      const [closers, sdrs, sales, individualGoals, reports] = await Promise.all([
        db.user.findMany({
          where: { role: "closer", is_active: true },
          select: { id: true, name: true, avatar_url: true },
        }),
        db.user.findMany({
          where: { role: "sdr", is_active: true },
          select: { id: true, name: true, avatar_url: true },
        }),
        db.sale.findMany({
          where: { sale_date: { gte: startDate, lte: endDate } },
          select: {
            closer_id: true,
            sdr_id: true,
            cash_value: true,
            counts_as_sale: true,
          },
        }),
        db.individualGoal.findMany({
          where: { goal: { month: startOfMonth(startDate) } },
          select: { user_id: true, cash_goal: true },
        }),
        db.dailyReport.findMany({
          where: { report_date: { gte: startDate, lte: endDate } },
          select: {
            user_id: true,
            meetings_scheduled: true,
            meetings_held: true,
          },
        }),
      ]);

      const goalByUser = new Map(
        individualGoals.map((g) => [g.user_id, Number(g.cash_goal)]),
      );

      const closerRankings = closers
        .map((u) => {
          const userSales = sales.filter((s) => s.closer_id === u.id);
          return {
            userId: u.id,
            name: u.name,
            avatarUrl: u.avatar_url,
            cashRealized: userSales.reduce((s, x) => s + Number(x.cash_value), 0),
            salesCount: userSales.filter((s) => s.counts_as_sale).length,
            cashGoal: goalByUser.get(u.id) ?? null,
          };
        })
        .sort((a, b) => b.cashRealized - a.cashRealized);

      const sdrRankings = sdrs
        .map((u) => {
          const userSales = sales.filter((s) => s.sdr_id === u.id);
          const userReports = reports.filter((r) => r.user_id === u.id);
          return {
            userId: u.id,
            name: u.name,
            avatarUrl: u.avatar_url,
            cashRealized: userSales.reduce((s, x) => s + Number(x.cash_value), 0),
            meetingsScheduled: userReports.reduce(
              (s, r) => s + (r.meetings_scheduled ?? 0),
              0,
            ),
            meetingsHeld: userReports.reduce(
              (s, r) => s + (r.meetings_held ?? 0),
              0,
            ),
            cashGoal: goalByUser.get(u.id) ?? null,
          };
        })
        .sort((a, b) => b.cashRealized - a.cashRealized);

      return { closers: closerRankings, sdrs: sdrRankings };
    }),

  // ─── Detalhes do colaborador (modal) ────────────────────────────────────────
  getColaboradorDetail: dashboardGlobalProcedure
    .input(z.object({ userId: z.string(), from: z.string(), to: z.string() }))
    .query(async ({ ctx, input }) => {
      const { db } = ctx;
      const startDate = new Date(input.from);
      const endDate = new Date(input.to);

      const [user, sales, reports] = await Promise.all([
        db.user.findUnique({
          where: { id: input.userId },
          select: { id: true, name: true, avatar_url: true, role: true },
        }),
        db.sale.findMany({
          where: {
            OR: [
              { closer_id: input.userId },
              { sdr_id: input.userId },
            ],
            sale_date: { gte: startDate, lte: endDate },
          },
          select: {
            id: true,
            client_name: true,
            client_company: true,
            cash_value: true,
            net_value: true,
            contract_value: true,
            counts_as_sale: true,
            sale_date: true,
            product: { select: { name: true } },
          },
          orderBy: { sale_date: "desc" },
        }),
        db.dailyReport.findMany({
          where: {
            user_id: input.userId,
            report_date: { gte: startDate, lte: endDate },
          },
          select: {
            calls_total: true,
            calls_answered: true,
            meetings_scheduled: true,
            meetings_held: true,
            calls_done: true,
            closer_no_shows: true,
          },
        }),
      ]);

      if (!user) return null;

      const cashRealized = sales.reduce((s, x) => s + Number(x.cash_value), 0);
      const salesCount = sales.filter((x) => x.counts_as_sale).length;

      // Agregados SDR
      const callsTotal = reports.reduce((s, r) => s + (r.calls_total ?? 0), 0);
      const callsAnswered = reports.reduce((s, r) => s + (r.calls_answered ?? 0), 0);
      const meetingsScheduled = reports.reduce(
        (s, r) => s + (r.meetings_scheduled ?? 0),
        0,
      );
      const meetingsHeld = reports.reduce((s, r) => s + (r.meetings_held ?? 0), 0);

      // Agregados Closer
      const callsDone = reports.reduce((s, r) => s + (r.calls_done ?? 0), 0);
      const noShows = reports.reduce((s, r) => s + (r.closer_no_shows ?? 0), 0);

      return {
        user,
        cashRealized,
        salesCount,
        sales: sales.map((s) => ({
          id: s.id,
          clientName: s.client_name,
          clientCompany: s.client_company,
          cashValue: Number(s.cash_value),
          netValue: Number(s.net_value),
          contractValue: Number(s.contract_value),
          countsAsSale: s.counts_as_sale,
          saleDate: s.sale_date,
          productName: s.product.name,
        })),
        activity: {
          callsTotal,
          callsAnswered,
          meetingsScheduled,
          meetingsHeld,
          callsDone,
          noShows,
          conversionRate: callsDone > 0 ? salesCount / callsDone : null,
          noShowRate: callsDone > 0 ? noShows / callsDone : null,
        },
      };
    }),

  // ─── Insights (admin/head) ──────────────────────────────────────────────────
  getInsights: adminOrHeadProcedure
    .input(rangeInput.optional())
    .query(async ({ ctx, input }) => {
      const { db } = ctx;
      const startDate = input?.from ? new Date(input.from) : startOfMonth(new Date());
      const endDate = input?.to ? new Date(input.to) : endOfMonth(startDate);

      // Busca MoM (6 meses) + mês atual em query única
      const momWindowStart = startOfMonth(subMonths(startDate, 5));
      const [sales, momSales] = await Promise.all([
        db.sale.findMany({
          where: { sale_date: { gte: startDate, lte: endDate } },
          select: {
            cash_value: true,
            counts_as_sale: true,
            client_revenue_tier: true,
            contract_months: true,
            sale_origin: true,
            product: { select: { name: true } },
          },
        }),
        db.sale.findMany({
          where: { sale_date: { gte: momWindowStart, lte: endDate } },
          select: { cash_value: true, sale_date: true },
        }),
      ]);

      // Single pass: builds all 4 maps + válidas/upsells simultaneously
      const tierMap = new Map<string, { count: number; total: number }>();
      const prazoMap = new Map<number, { count: number; total: number }>();
      const originMap = new Map<string, { count: number; total: number }>();
      const productMap = new Map<string, { count: number; total: number }>();
      let validCount = 0, validTotal = 0, upsellCount = 0, upsellTotal = 0;

      for (const s of sales) {
        const cash = Number(s.cash_value);

        if (s.counts_as_sale) { validCount++; validTotal += cash; }
        else { upsellCount++; upsellTotal += cash; }

        const tier = tierMap.get(s.client_revenue_tier) ?? { count: 0, total: 0 };
        tier.count++; tier.total += cash;
        tierMap.set(s.client_revenue_tier, tier);

        const prazo = prazoMap.get(s.contract_months) ?? { count: 0, total: 0 };
        prazo.count++; prazo.total += cash;
        prazoMap.set(s.contract_months, prazo);

        const origin = originMap.get(s.sale_origin) ?? { count: 0, total: 0 };
        origin.count++; origin.total += cash;
        originMap.set(s.sale_origin, origin);

        const prodName = s.product.name;
        const prod = productMap.get(prodName) ?? { count: 0, total: 0 };
        prod.count++; prod.total += cash;
        productMap.set(prodName, prod);
      }

      // 2. MoM — group momSales by month key in memory (single query)
      const momByKey = new Map<string, number>();
      for (const s of momSales) {
        const d = new Date(s.sale_date);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        momByKey.set(key, (momByKey.get(key) ?? 0) + Number(s.cash_value));
      }
      const momData: { month: string; cashRealized: number; delta: number | null }[] = [];
      for (let i = 5; i >= 0; i--) {
        const m = subMonths(startDate, i);
        const key = `${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, "0")}`;
        momData.push({ month: key, cashRealized: momByKey.get(key) ?? 0, delta: null });
      }
      for (let i = 1; i < momData.length; i++) {
        const prev = momData[i - 1]!.cashRealized;
        const curr = momData[i]!.cashRealized;
        momData[i]!.delta = prev > 0 ? ((curr - prev) / prev) * 100 : null;
      }

      return {
        validasVsUpsells: {
          valid: { count: validCount, total: validTotal },
          upsell: { count: upsellCount, total: upsellTotal },
        },
        mom: momData,
        clientProfile: [...tierMap.entries()]
          .map(([tier, data]) => ({ tier, ...data }))
          .sort((a, b) => b.total - a.total),
        prazoComposition: [...prazoMap.entries()]
          .map(([months, data]) => ({ months, count: data.count, tme: data.count > 0 ? data.total / data.count : 0 }))
          .sort((a, b) => a.months - b.months),
        saleOrigins: [...originMap.entries()].map(([origin, data]) => ({ origin, ...data })),
        topProducts: [...productMap.entries()]
          .map(([productName, data]) => ({ productName, ...data }))
          .sort((a, b) => b.total - a.total),
      };
    }),
});
