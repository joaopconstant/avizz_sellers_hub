"use client";

import { cn } from "@/lib/utils";

export const ROLE_COLORS: Record<string, string> = {
  sdr: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800",
  closer:
    "bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-900/30 dark:text-violet-400 dark:border-violet-800",
};

export function UserAvatar({ name, role }: { name: string; role: string }) {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const colorClass =
    role === "sdr"
      ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
      : role === "closer"
        ? "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400"
        : "bg-muted text-muted-foreground";

  return (
    <div
      className={cn(
        "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold",
        colorClass,
      )}
    >
      {initials}
    </div>
  );
}
