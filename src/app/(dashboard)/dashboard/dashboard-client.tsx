"use client";

import { useState, useCallback } from "react";
import { startOfMonth } from "date-fns";
import { format } from "date-fns";
import { HugeiconsIcon } from "@hugeicons/react";
import { ModernTvIcon } from "@hugeicons/core-free-icons";
import type { UserRole } from "@/lib/generated/prisma/enums";
import { api } from "@/trpc/react";
import { Button } from "@/components/ui/button";
import { MonthPicker } from "@/components/dashboard/MonthPicker";
import { MetaSection } from "@/components/dashboard/MetaSection";
import { ProjectionBoxes } from "@/components/dashboard/ProjectionBoxes";
import { FunnelSection } from "@/components/dashboard/FunnelSection";
import { RankingsSection } from "@/components/dashboard/RankingsSection";
import { MetaVsEntregueTable } from "@/components/dashboard/MetaVsEntregueTable";
import { InsightsSection } from "@/components/dashboard/InsightsSection";
import { InsightModal } from "@/components/dashboard/InsightModal";
import { ColaboradorModal } from "@/components/dashboard/ColaboradorModal";
import { TVModeView } from "@/components/dashboard/TVModeView";
import type { InsightType } from "@/components/dashboard/types";

const isAdminOrHead = (role: UserRole) => role === "admin" || role === "head";
const canSeePersonal = (role: UserRole) => role !== "operational";

interface DashboardClientProps {
  role: UserRole;
  name: string;
}

export function DashboardClient({ role, name }: DashboardClientProps) {
  const [month, setMonth] = useState<Date>(startOfMonth(new Date()));
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [insightType, setInsightType] = useState<InsightType | null>(null);
  const [tvMode, setTvMode] = useState(false);

  const monthStr = format(month, "yyyy-MM-dd");

  const summary = api.dashboard.getSummary.useQuery({ month: monthStr });
  const funnel = api.dashboard.getFunnel.useQuery({ month: monthStr });
  const rankings = api.dashboard.getRankings.useQuery({ month: monthStr });
  const insights = api.dashboard.getInsights.useQuery(
    { month: monthStr },
    { enabled: isAdminOrHead(role) },
  );

  const refetchAll = useCallback(() => {
    void summary.refetch();
    void funnel.refetch();
    void rankings.refetch();
    if (isAdminOrHead(role)) void insights.refetch();
  }, [summary, funnel, rankings, insights, role]);

  const isLoading =
    summary.isLoading || funnel.isLoading || rankings.isLoading;

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-32 rounded-lg bg-muted" />
        ))}
      </div>
    );
  }

  if (!summary.data || !funnel.data || !rankings.data) {
    return (
      <p className="text-sm text-muted-foreground">
        Erro ao carregar dados do dashboard.
      </p>
    );
  }

  const s = summary.data;

  const closerRows = rankings.data.closers.map((c) => ({
    userId: c.userId,
    name: c.name,
    cashGoal: c.cashGoal,
    cashRealized: c.cashRealized,
    salesGoal: null,
    salesCount: c.salesCount,
  }));

  const sdrRows = rankings.data.sdrs.map((u) => ({
    userId: u.userId,
    name: u.name,
    cashGoal: u.cashGoal,
    cashRealized: u.cashRealized,
    salesGoal: null,
    salesCount: 0,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Bem-vindo, {name}!</p>
        </div>
        <div className="flex items-center gap-2">
          <MonthPicker month={month} onChange={setMonth} />
          <Button variant="outline" size="sm" onClick={() => setTvMode(true)}>
            <HugeiconsIcon icon={ModernTvIcon} size={16} className="mr-1.5" />
            TV
          </Button>
        </div>
      </div>

      {/* Row 1: Metas + Funil lado a lado */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-2">
          <MetaSection
            cashGoal={s.cashGoal}
            cashRealized={s.cashRealized}
            salesGoal={s.salesGoal}
            salesCount={s.salesCount}
            myCashRealized={canSeePersonal(role) ? s.myCashRealized : null}
            mySalesCount={canSeePersonal(role) ? s.mySalesCount : null}
          />
        </div>
        <div className="lg:col-span-3">
          <FunnelSection stages={funnel.data} />
        </div>
      </div>

      {/* Row 2: KPIs */}
      <ProjectionBoxes
        cashRealized={s.cashRealized}
        cashProjected={s.cashProjected}
        netRealized={s.netRealized}
        futureRevenue={s.futureRevenue}
        salesCount={s.salesCount}
        workdaysElapsed={s.workdaysElapsed}
        workdaysTotal={s.workdaysTotal}
      />

      {/* Row 3: Rankings */}
      <RankingsSection
        closers={rankings.data.closers}
        sdrs={rankings.data.sdrs}
        onSelectUser={setSelectedUser}
      />

      {isAdminOrHead(role) && (
        <MetaVsEntregueTable
          closers={closerRows}
          sdrs={sdrRows}
          onSelectUser={setSelectedUser}
        />
      )}

      {isAdminOrHead(role) && insights.data && (
        <InsightsSection
          data={insights.data}
          onOpenInsight={setInsightType}
        />
      )}

      <ColaboradorModal
        userId={selectedUser}
        month={month}
        onClose={() => setSelectedUser(null)}
      />

      <InsightModal
        type={insightType}
        data={insights.data}
        onClose={() => setInsightType(null)}
      />

      {tvMode && (
        <TVModeView
          month={month}
          summary={summary.data!}
          funnel={funnel.data!}
          rankings={rankings.data!}
          onClose={() => setTvMode(false)}
          onRefetch={refetchAll}
        />
      )}
    </div>
  );
}
