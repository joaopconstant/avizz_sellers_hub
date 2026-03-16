import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { ZodError } from "zod";
import { auth } from "@/server/auth";
import { db } from "@/server/db";
import type { UserRole } from "@/lib/generated/prisma/enums";

export const createTRPCContext = async (opts: { headers: Headers }) => {
  const session = await auth();
  return {
    db,
    session,
    ...opts,
  };
};

const t = initTRPC.context<typeof createTRPCContext>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

export const createCallerFactory = t.createCallerFactory;
export const createTRPCRouter = t.router;

// ─── Middlewares ──────────────────────────────────────────────────────────────

const enforceAuth = t.middleware(({ ctx, next }) => {
  if (!ctx.session?.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next({
    ctx: {
      session: { ...ctx.session, user: ctx.session.user },
    },
  });
});

const enforceRole = (...allowedRoles: UserRole[]) =>
  enforceAuth.unstable_pipe(({ ctx, next }) => {
    const role = ctx.session.user.role;
    if (!allowedRoles.includes(role)) {
      throw new TRPCError({ code: "FORBIDDEN" });
    }
    return next({ ctx });
  });

// ─── Procedures ──────────────────────────────────────────────────────────────

export const publicProcedure = t.procedure;

export const protectedProcedure = t.procedure.use(enforceAuth);

export const adminProcedure = t.procedure.use(enforceRole("admin"));

export const adminOrHeadProcedure = t.procedure.use(
  enforceRole("admin", "head"),
);

export const salesProcedure = t.procedure.use(
  enforceRole("admin", "head", "closer", "sdr"),
);

export const closerProcedure = t.procedure.use(
  enforceRole("admin", "head", "closer"),
);

export const sdrProcedure = t.procedure.use(
  enforceRole("admin", "head", "sdr"),
);

export const goalsViewProcedure = t.procedure.use(enforceRole("admin", "head"));

export const goalsEditProcedure = t.procedure.use(enforceRole("admin"));

export const dashboardGlobalProcedure = t.procedure.use(
  enforceRole("admin", "head", "closer", "sdr", "operational"),
);
