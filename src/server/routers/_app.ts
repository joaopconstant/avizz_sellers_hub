import { createTRPCRouter } from "@/server/trpc";
import { dashboardRouter } from "@/server/routers/dashboard";

export const appRouter = createTRPCRouter({
  dashboard: dashboardRouter,
});

export type AppRouter = typeof appRouter;
