import { createTRPCRouter } from "@/server/trpc";
import { dashboardRouter } from "@/server/routers/dashboard";
import { reportsRouter } from "@/server/routers/reports";
import { productsRouter } from "@/server/routers/products";
import { gatewaysRouter } from "@/server/routers/gateways";
import { salesRouter } from "@/server/routers/sales";
import { advancesRouter } from "@/server/routers/advances";
import { goalsRouter } from "@/server/routers/goals";
import { usersRouter } from "@/server/routers/users";

export const appRouter = createTRPCRouter({
  dashboard: dashboardRouter,
  reports: reportsRouter,
  products: productsRouter,
  gateways: gatewaysRouter,
  sales: salesRouter,
  advances: advancesRouter,
  goals: goalsRouter,
  users: usersRouter,
});

export type AppRouter = typeof appRouter;
