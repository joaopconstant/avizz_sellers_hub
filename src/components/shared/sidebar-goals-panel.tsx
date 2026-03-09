"use client";

import { api } from "@/trpc/react";
import { formatCurrency, formatPercent } from "@/lib/formatting";

function GoalBar({
  label,
  realized,
  goal,
  formatValue,
}: {
  label: string;
  realized: number;
  goal: number;
  formatValue: (v: number) => string;
}) {
  const pct = goal > 0 ? Math.min((realized / goal) * 100, 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-sidebar-foreground/70">{label}</span>
        <span className="font-medium text-sidebar-foreground">
          {formatValue(realized)}{" "}
          <span className="text-sidebar-foreground/50">/ {formatValue(goal)}</span>
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-sidebar-accent overflow-hidden">
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export function SidebarGoalsPanel() {
  const { data, isLoading } = api.dashboard.getMyGoalsSummary.useQuery();

  if (isLoading) {
    return (
      <div className="rounded-lg border border-sidebar-border bg-sidebar-accent/30 p-3 space-y-2">
        <div className="h-3 w-24 rounded bg-sidebar-accent animate-pulse" />
        <div className="h-1.5 rounded-full bg-sidebar-accent animate-pulse" />
        <div className="h-1.5 rounded-full bg-sidebar-accent animate-pulse" />
      </div>
    );
  }

  if (!data) return null;

  if (!data.defined) {
    return (
      <div className="rounded-lg border border-sidebar-border bg-sidebar-accent/30 p-3">
        <p className="text-xs font-medium text-sidebar-foreground/60">
          Minhas Metas
        </p>
        <p className="mt-1 text-xs text-sidebar-foreground/40">
          Meta não definida
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-sidebar-border bg-sidebar-accent/30 p-3 space-y-3">
      <p className="text-xs font-semibold text-sidebar-foreground/70 uppercase tracking-wider">
        Minhas Metas
      </p>

      <GoalBar
        label="Meta Caixa"
        realized={data.cashRealized}
        goal={data.cashGoal}
        formatValue={formatCurrency}
      />

      {data.role === "closer" && (
        <GoalBar
          label="Conversão"
          realized={data.conversionRate}
          goal={data.conversionGoal}
          formatValue={formatPercent}
        />
      )}

      {data.role === "sdr" && (
        <div className="space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-sidebar-foreground/70">No-Show</span>
            <span
              className={`font-medium ${
                data.noShowRate > data.noShowMax
                  ? "text-destructive"
                  : "text-sidebar-foreground"
              }`}
            >
              {formatPercent(data.noShowRate)}{" "}
              <span className="text-sidebar-foreground/50">
                / ≤ {formatPercent(data.noShowMax)}
              </span>
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-sidebar-accent overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                data.noShowRate > data.noShowMax ? "bg-destructive" : "bg-primary"
              }`}
              style={{
                width: `${
                  data.noShowMax > 0
                    ? Math.min((data.noShowRate / data.noShowMax) * 100, 100)
                    : 0
                }%`,
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
