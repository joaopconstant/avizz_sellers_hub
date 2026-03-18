import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, adminProcedure } from "@/server/trpc";
import { UserRole } from "@/lib/generated/prisma/enums";
import { getCompanyId } from "@/server/helpers/router-helpers";

const USER_SELECT = {
  id: true,
  name: true,
  email: true,
  role: true,
  is_active: true,
  avatar_url: true,
  created_at: true,
} as const;

export const usersRouter = createTRPCRouter({
  // ── Lista todos os usuários da empresa ───────────────────────────────────
  list: adminProcedure.query(async ({ ctx }) => {
    const { db, session } = ctx;

    const company_id = await getCompanyId(db, session.user.id);

    return db.user.findMany({
      where: { company_id },
      select: USER_SELECT,
      orderBy: { name: "asc" },
    });
  }),

  // ── Cadastra novo usuário ─────────────────────────────────────────────────
  create: adminProcedure
    .input(
      z.object({
        name: z.string().min(1),
        email: z.string().email(),
        role: z.nativeEnum(UserRole),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { db, session } = ctx;

      if (!input.email.endsWith("@avizz.com.br")) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "O e-mail deve pertencer ao domínio @avizz.com.br.",
        });
      }

      // Fetch company_id and check email uniqueness in parallel
      const [company_id, existing] = await Promise.all([
        getCompanyId(db, session.user.id),
        db.user.findUnique({ where: { email: input.email } }),
      ]);

      if (existing) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Já existe um usuário com esse e-mail.",
        });
      }

      return db.user.create({
        data: {
          company_id,
          name: input.name,
          email: input.email,
          role: input.role,
          is_active: true,
        },
        select: USER_SELECT,
      });
    }),

  // ── Atualiza role do usuário ──────────────────────────────────────────────
  updateRole: adminProcedure
    .input(
      z.object({
        userId: z.string(),
        role: z.nativeEnum(UserRole),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { db, session } = ctx;

      if (input.userId === session.user.id && input.role !== UserRole.admin) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Você não pode remover seu próprio cargo de admin.",
        });
      }

      return db.user.update({
        where: { id: input.userId },
        data: { role: input.role },
        select: USER_SELECT,
      });
    }),

  // ── Ativa/desativa usuário ────────────────────────────────────────────────
  toggleActive: adminProcedure
    .input(z.object({ userId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { db, session } = ctx;

      if (input.userId === session.user.id) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Você não pode desativar sua própria conta.",
        });
      }

      const user = await db.user.findUniqueOrThrow({
        where: { id: input.userId },
        select: { is_active: true },
      });

      return db.user.update({
        where: { id: input.userId },
        data: { is_active: !user.is_active },
        select: USER_SELECT,
      });
    }),
});
