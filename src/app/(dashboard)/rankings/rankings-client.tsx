"use client";

import { useState } from "react";
import { startOfMonth, format } from "date-fns";
import { api } from "@/trpc/react";
import { MonthPicker } from "@/components/dashboard/MonthPicker";
import { RankingsSection } from "@/components/dashboard/RankingsSection";
import { ColaboradorModal } from "@/components/dashboard/ColaboradorModal";

export function RankingsClient() {
  const [month, setMonth] = useState<Date>(startOfMonth(new Date()));
  const [selectedUser, setSelectedUser] = useState<string | null>(null);

  const monthStr = format(month, "yyyy-MM-dd");
  const { data, isLoading } = api.dashboard.getRankings.useQuery({ month: monthStr });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold">Ranking de Vendas</h1>
        <MonthPicker month={month} onChange={setMonth} />
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
        month={month}
        onClose={() => setSelectedUser(null)}
      />
    </div>
  );
}
