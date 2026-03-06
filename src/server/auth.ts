import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { db } from "@/server/db";
import type { UserRole } from "@/lib/generated/prisma/enums";

declare module "@auth/core/types" {
  interface Session {
    user: {
      id: string;
      role: UserRole;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    userId?: string;
    role?: UserRole;
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(db),
  session: { strategy: "jwt" },
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
      allowDangerousEmailAccountLinking: true,
    }),
  ],
  callbacks: {
    async signIn({ account, profile }) {
      if (account?.provider === "google") {
        const email = profile?.email ?? "";
        if (!email.endsWith("@avizz.com.br")) {
          return false;
        }

        let user = await db.user.findUnique({
          where: { email },
          select: { id: true, is_active: true },
        });

        if (!user) {
          user = await db.user.create({
            data: {
              email,
              name: profile?.name ?? email.split("@")[0],
              avatar_url: (profile?.picture as string) ?? null,
              company_id: "avizz",
              role: "operational",
              is_active: true,
            },
            select: { id: true, is_active: true },
          });
        }

        if (!user.is_active) {
          return false;
        }
      }
      return true;
    },

    async jwt({ token, trigger }) {
      if (token.email && (trigger === "signIn" || !token.userId)) {
        const user = await db.user.findUnique({
          where: { email: token.email },
          select: { id: true, role: true, is_active: true },
        });

        if (!user || !user.is_active) {
          throw new Error("AccessDenied");
        }

        token.userId = user.id;
        token.role = user.role;
      }

      return token;
    },

    async session({ session, token }) {
      return {
        ...session,
        user: {
          ...session.user,
          id: token.userId ?? "",
          role: token.role ?? ("operational" as UserRole),
        },
      };
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
});
