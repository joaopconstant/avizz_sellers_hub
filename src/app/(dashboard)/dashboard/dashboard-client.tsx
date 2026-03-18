"use client";

import { useState, useCallback, useMemo } from "react";
import { startOfMonth, endOfMonth } from "date-fns";
import { format } from "date-fns";
import { HugeiconsIcon } from "@hugeicons/react";
import { ModernTvIcon } from "@hugeicons/core-free-icons";
import type { UserRole } from "@/lib/generated/prisma/enums";
import { api } from "@/trpc/react";
import { Button } from "@/components/ui/button";
import { DateRangePicker } from "@/components/dashboard/DateRangePicker";
import { MetaSection } from "@/components/dashboard/MetaSection";
import { ProjectionBoxes } from "@/components/dashboard/ProjectionBoxes";
import { FunnelSection } from "@/components/dashboard/FunnelSection";
import { RankingsSection } from "@/components/dashboard/RankingsSection";
import { MetaVsEntregueTable } from "@/components/dashboard/MetaVsEntregueTable";
import { InsightsSection } from "@/components/dashboard/InsightsSection";
import { InsightModal } from "@/components/dashboard/InsightModal";
import { ColaboradorModal } from "@/components/dashboard/ColaboradorModal";
import { TVModeView } from "@/components/dashboard/TVModeView";
import { NaMesaModal } from "@/components/dashboard/NaMesaModal";
import type { InsightType } from "@/components/dashboard/types";

const isAdminOrHead = (role: UserRole) => role === "admin" || role === "head";
const canSeePersonal = (role: UserRole) => role !== "operational";

interface DashboardClientProps {
  role: UserRole;
  name: string;
}

export function DashboardClient({ role, name }: DashboardClientProps) {
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [funnelUserId, setFunnelUserId] = useState<string | null>(null);
  const [insightType, setInsightType] = useState<InsightType | null>(null);
  const [tvMode, setTvMode] = useState(false);
  const [naMesaOpen, setNaMesaOpen] = useState(false);

  const fromStr = format(dateRange.from, "yyyy-MM-dd");
  const toStr = format(dateRange.to, "yyyy-MM-dd");

  const summary = api.dashboard.getSummary.useQuery({
    from: fromStr,
    to: toStr,
  });
  const funnel = api.dashboard.getFunnel.useQuery({
    from: fromStr,
    to: toStr,
    userId: funnelUserId ?? undefined,
  });
  const rankings = api.dashboard.getRankings.useQuery({
    from: fromStr,
    to: toStr,
  });
  const insights = api.dashboard.getInsights.useQuery(
    { from: fromStr, to: toStr },
    { enabled: isAdminOrHead(role) },
  );
  const activeAdvances = api.dashboard.getActiveAdvances.useQuery();

  const refetchAll = useCallback(() => {
    void summary.refetch();
    void funnel.refetch();
    void rankings.refetch();
    if (isAdminOrHead(role)) void insights.refetch();
  }, [summary, funnel, rankings, insights, role]);

  const funnelUsers = useMemo(
    () =>
      isAdminOrHead(role) && rankings.data
        ? [
            ...rankings.data.closers.map((c) => ({
              userId: c.userId,
              name: c.name,
            })),
            ...rankings.data.sdrs.map((u) => ({
              userId: u.userId,
              name: u.name,
            })),
          ]
        : undefined,
    [rankings.data, role],
  );

  const isLoading = summary.isLoading || funnel.isLoading || rankings.isLoading;

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
          <DateRangePicker value={dateRange} onChange={setDateRange} />
          <Button variant="outline" size="sm" onClick={() => setTvMode(true)}>
            <HugeiconsIcon icon={ModernTvIcon} size={16} className="mr-1.5" />
            TV
          </Button>
        </div>
      </div>

      {/* Row 1: Meta (hero, full width) */}
      <MetaSection
        cashGoal={s.cashGoal}
        cashRealized={s.cashRealized}
        salesGoal={s.salesGoal}
        salesCount={s.salesCount}
        myCashRealized={canSeePersonal(role) ? s.myCashRealized : null}
        mySalesCount={canSeePersonal(role) ? s.mySalesCount : null}
      />

      {/* Row 2: KPIs */}
      <ProjectionBoxes
        cashRealized={s.cashRealized}
        cashProjected={s.cashProjected}
        cashGoal={s.cashGoal}
        advancesValue={s.advancesValue}
        workdaysElapsed={s.workdaysElapsed}
        workdaysTotal={s.workdaysTotal}
        onNaMesaClick={() => setNaMesaOpen(true)}
      />

      {/* Row 3: Funil + Meta×Entregue lado a lado */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-stretch">
        <div className="lg:col-span-2 flex flex-col">
          <FunnelSection
            stages={funnel.data}
            users={funnelUsers}
            selectedUserId={funnelUserId}
            onSelectUser={setFunnelUserId}
          />
        </div>
        <div className="lg:col-span-3 flex flex-col">
          <MetaVsEntregueTable
            closers={closerRows}
            sdrs={sdrRows}
            onSelectUser={isAdminOrHead(role) ? setSelectedUser : undefined}
          />
        </div>
      </div>

      {/* Row 4: Rankings com pódio */}
      <RankingsSection
        closers={rankings.data.closers}
        sdrs={rankings.data.sdrs}
        onSelectUser={setSelectedUser}
      />

      {/* Row 5: Insights (admin/head) */}
      {isAdminOrHead(role) && insights.data && (
        <InsightsSection data={insights.data} onOpenInsight={setInsightType} />
      )}

      <ColaboradorModal
        userId={selectedUser}
        from={dateRange.from}
        to={dateRange.to}
        onClose={() => setSelectedUser(null)}
      />

      <InsightModal
        type={insightType}
        data={insights.data}
        onClose={() => setInsightType(null)}
      />

      {tvMode && (
        <TVModeView
          month={dateRange.from}
          summary={summary.data!}
          funnel={funnel.data!}
          rankings={rankings.data!}
          onClose={() => setTvMode(false)}
          onRefetch={refetchAll}
        />
      )}

      <NaMesaModal
        open={naMesaOpen}
        onClose={() => setNaMesaOpen(false)}
        advances={activeAdvances.data ?? []}
      />
    </div>
  );
}
