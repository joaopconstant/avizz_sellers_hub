import { createTRPCRouter, protectedProcedure } from "@/server/trpc";
import { startOfMonth } from "date-fns";

export const dashboardRouter = createTRPCRouter({
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

    // admin / head — cash goal only (sales registered as closer)
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
});
