import { TRPCError } from "@trpc/server";
import { endOfMonth, eachDayOfInterval, format, isWeekend, isSameDay, startOfDay } from "date-fns";
import { z } from "zod";

import { isPendingDay, isHoliday } from "@/lib/workdays";
import { adminOrHeadProcedure, createTRPCRouter, salesProcedure } from "@/server/trpc";

const reportInputSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  work_location: z.enum(["office", "home", "day_off"]),
  // Campos SDR
  calls_total: z.number().int().min(0).nullish(),
  calls_answered: z.number().int().min(0).nullish(),
  meetings_scheduled: z.number().int().min(0).nullish(),
  meetings_held: z.number().int().min(0).nullish(),
  crm_activities: z.number().int().min(0).nullish(),
  bot_conversations: z.number().int().min(0).nullish(),
  reschedulings: z.number().int().min(0).nullish(),
  // Campos Closer
  calls_done: z.number().int().min(0).nullish(),
  closer_no_shows: z.number().int().min(0).nullish(),
  disqualified: z.number().int().min(0).nullish(),
  crm_updated: z.boolean().nullish(),
});

export const reportsRouter = createTRPCRouter({
  /**
   * Retorna todos os dias do mês com status e relatório existente.
   * Admin/head podem consultar outros usuários via userId.
   */
  getMonthCalendar: salesProcedure
    .input(
      z.object({
        month: z.string().regex(/^\d{4}-\d{2}$/), // "YYYY-MM"
        userId: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { session, db } = ctx;

      let targetUserId = session.user.id;
      if (input.userId && input.userId !== session.user.id) {
        if (!["admin", "head"].includes(session.user.role)) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        targetUserId = input.userId;
      }

      const parts = input.month.split("-").map(Number) as [number, number];
      // Limites UTC para a query — relatórios são salvos como UTC midnight (Date.UTC)
      const queryStart = new Date(Date.UTC(parts[0], parts[1] - 1, 1));
      const queryEnd = new Date(Date.UTC(parts[0], parts[1], 1)); // início do próximo mês (exclusivo)
      // Datas locais para iterar os dias e calcular dia-da-semana corretamente
      const monthStart = new Date(parts[0], parts[1] - 1, 1);
      const monthEnd = endOfMonth(monthStart);
      const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
      const today = startOfDay(new Date());

      const reports = await db.dailyReport.findMany({
        where: {
          user_id: targetUserId,
          report_date: { gte: queryStart, lt: queryEnd },
        },
      });

      return days.map((day) => {
        const dateStr = format(day, "yyyy-MM-dd");
        // Extrai a data UTC diretamente do ISO string — evita offset de fuso horário
        const report =
          reports.find(
            (r) => r.report_date.toISOString().slice(0, 10) === dateStr,
          ) ?? null;

        return {
          date: dateStr,
          dayOfMonth: day.getDate(),
          dayOfWeek: day.getDay(), // 0=Dom..6=Sáb
          isWeekend: isWeekend(day),
          isHoliday: isHoliday(day),
          isToday: isSameDay(day, today),
          isFuture: startOfDay(day) > today,
          isPending: !report && isPendingDay(day, today),
          report: report
            ? {
                id: report.id,
                work_location: report.work_location,
                calls_total: report.calls_total,
                calls_answered: report.calls_answered,
                meetings_scheduled: report.meetings_scheduled,
                meetings_held: report.meetings_held,
                crm_activities: report.crm_activities,
                bot_conversations: report.bot_conversations,
                reschedulings: report.reschedulings,
                calls_done: report.calls_done,
                closer_no_shows: report.closer_no_shows,
                disqualified: report.disqualified,
                crm_updated: report.crm_updated,
              }
            : null,
        };
      });
    }),

  /**
   * Cria ou atualiza o relatório do dia para o usuário autenticado.
   */
  upsertReport: salesProcedure
    .input(reportInputSchema)
    .mutation(async ({ ctx, input }) => {
      const { session, db } = ctx;
      const userId = session.user.id;

      const parts = input.date.split("-").map(Number) as [number, number, number];
      // Data em horário local — para validações de dia-da-semana e comparação com hoje
      const localDate = new Date(parts[0], parts[1] - 1, parts[2]);
      // Data em UTC midnight — para armazenamento consistente com o restante do sistema
      const reportDate = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));

      if (isWeekend(localDate)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Não é possível preencher relatório para finais de semana.",
        });
      }

      const today = startOfDay(new Date());
      if (startOfDay(localDate) > today) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Não é possível preencher relatório para datas futuras.",
        });
      }

      const user = await db.user.findUniqueOrThrow({
        where: { id: userId },
        select: { company_id: true },
      });

      const isDayOff = input.work_location === "day_off";
      const data = {
        company_id: user.company_id,
        user_id: userId,
        report_date: reportDate,
        work_location: input.work_location,
        calls_total: isDayOff ? null : (input.calls_total ?? null),
        calls_answered: isDayOff ? null : (input.calls_answered ?? null),
        meetings_scheduled: isDayOff ? null : (input.meetings_scheduled ?? null),
        meetings_held: isDayOff ? null : (input.meetings_held ?? null),
        crm_activities: isDayOff ? null : (input.crm_activities ?? null),
        bot_conversations: isDayOff ? null : (input.bot_conversations ?? null),
        reschedulings: isDayOff ? null : (input.reschedulings ?? null),
        calls_done: isDayOff ? null : (input.calls_done ?? null),
        closer_no_shows: isDayOff ? null : (input.closer_no_shows ?? null),
        disqualified: isDayOff ? null : (input.disqualified ?? null),
        crm_updated: isDayOff ? null : (input.crm_updated ?? null),
      };

      return db.dailyReport.upsert({
        where: {
          user_id_report_date: { user_id: userId, report_date: reportDate },
        },
        create: data,
        update: {
          work_location: data.work_location,
          calls_total: data.calls_total,
          calls_answered: data.calls_answered,
          meetings_scheduled: data.meetings_scheduled,
          meetings_held: data.meetings_held,
          crm_activities: data.crm_activities,
          bot_conversations: data.bot_conversations,
          reschedulings: data.reschedulings,
          calls_done: data.calls_done,
          closer_no_shows: data.closer_no_shows,
          disqualified: data.disqualified,
          crm_updated: data.crm_updated,
        },
      });
    }),

  /**
   * Lista usuários ativos — apenas para admin/head usarem o seletor de usuário.
   */
  listUsers: adminOrHeadProcedure.query(async ({ ctx }) => {
    return ctx.db.user.findMany({
      where: { is_active: true },
      select: { id: true, name: true, role: true },
      orderBy: { name: "asc" },
    });
  }),
});
