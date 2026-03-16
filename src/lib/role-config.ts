import type { UserRole } from "@/lib/generated/prisma/enums";

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: "Admin",
  head: "Head",
  closer: "Closer",
  sdr: "SDR",
  operational: "Operacional",
};

export const ROLE_BADGE_CLASSES: Record<UserRole, string> = {
  admin: "bg-rose-100 text-rose-800 border-rose-200",
  head: "bg-amber-100 text-amber-800 border-amber-200",
  closer: "bg-violet-100 text-violet-800 border-violet-200",
  sdr: "bg-blue-100 text-blue-800 border-blue-200",
  operational: "bg-slate-100 text-slate-700 border-slate-200",
};
