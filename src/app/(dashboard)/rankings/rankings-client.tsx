"use client";

import { useState } from "react";
import { startOfMonth, endOfMonth } from "date-fns";
import { format } from "date-fns";
import { api } from "@/trpc/react";
import { DateRangePicker } from "@/components/dashboard/DateRangePicker";
import { RankingsSection } from "@/components/dashboard/RankingsSection";
import { ColaboradorModal } from "@/components/dashboard/ColaboradorModal";

export function RankingsClient() {
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });
  const [selectedUser, setSelectedUser] = useState<string | null>(null);

  const fromStr = format(dateRange.from, "yyyy-MM-dd");
  const toStr = format(dateRange.to, "yyyy-MM-dd");
  const { data, isLoading } = api.dashboard.getRankings.useQuery({ from: fromStr, to: toStr });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold">Ranking de Vendas</h1>
        <DateRangePicker value={dateRange} onChange={setDateRange} />
      </div>

      {isLoading ? (
        <div className="space-y-4 animate-pulse">
          <div className="h-48 rounded-lg bg-muted" />
          <div className="h-48 rounded-lg bg-muted" />
        </div>
      ) : !data ? (
        <p className="text-sm text-muted-foreground">Erro ao carregar ranking.</p>
      ) : (
        <RankingsSection
          closers={data.closers}
          sdrs={data.sdrs}
          onSelectUser={setSelectedUser}
        />
      )}

      <ColaboradorModal
        userId={selectedUser}
        from={dateRange.from}
        to={dateRange.to}
        onClose={() => setSelectedUser(null)}
      />
    </div>
  );
}
