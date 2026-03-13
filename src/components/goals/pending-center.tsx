"use client";

import { useState } from "react";
import { api } from "@/trpc/react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { IndividualGoalModal } from "./individual-goal-modal";
import { AlertCircle, Clock } from "lucide-react";
import type { UserRole } from "@/lib/generated/prisma/enums";

interface PendingCenterProps {
  month: string;
  role: UserRole;
  onGoalDefined: () => void;
}

export function PendingCenter({
  month,
  role,
  onGoalDefined,
}: PendingCenterProps) {
  const isAdmin = role === "admin";

  const { data, isLoading, refetch } = api.goals.getPendingCenter.useQuery(
    { month },
  );

  const [addingForUser, setAddingForUser] = useState<{
    id: string;
    name: string;
    role: string;
    avatar_url: string | null;
  } | null>(null);

  if (isLoading) {
    return (
      <div className="rounded-xl border bg-card p-5">
        <p className="text-sm text-muted-foreground">
          Carregando pendências...
        </p>
      </div>
    );
  }

  if (!data) return null;

  const totalPending = data.withoutGoal.length + data.lateReports.length;
  const hasPending = totalPending > 0;

  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 px-5 py-4 border-b bg-muted/30">
        <div className="flex items-center gap-2">
          <AlertCircle
            className={
              hasPending
                ? "h-4 w-4 text-amber-500"
                : "h-4 w-4 text-muted-foreground"
            }
          />
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Central de Pendências
          </p>
        </div>
        {hasPending && (
          <Badge
            variant="outline"
            className="text-xs bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800"
          >
            {totalPending} pendência{totalPending !== 1 ? "s" : ""}
          </Badge>
        )}
      </div>

      <div className="p-5 space-y-4">
        {!hasPending && (
          <p className="text-sm text-muted-foreground">
            Nenhuma pendência encontrada para este mês.
          </p>
        )}

        {data.withoutGoal.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium">Sem meta definida</p>
              <span className="text-xs text-muted-foreground bg-muted rounded-full px-2 py-0.5">
                {data.withoutGoal.length}
              </span>
            </div>
            <div className="space-y-1.5">
              {data.withoutGoal.map((u) => (
                <div
                  key={u.id}
                  className="flex items-center justify-between rounded-lg border bg-muted/20 px-3 py-2.5"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{u.name}</span>
                    <Badge
                      variant="secondary"
                      className="capitalize text-xs"
                    >
                      {u.role}
                    </Badge>
                  </div>
                  {isAdmin && data.goalId && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setAddingForUser(u)}
                      className="h-7 text-xs"
                    >
                      Definir Meta
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {data.lateReports.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Clock className="h-3.5 w-3.5 text-destructive" />
              <p className="text-sm font-medium">Relatórios atrasados</p>
              <span className="text-xs text-muted-foreground bg-muted rounded-full px-2 py-0.5">
                {data.lateReports.length}
              </span>
            </div>
            <div className="space-y-1.5">
              {data.lateReports.map((u) => (
                <div
                  key={u.id}
                  className="flex items-center justify-between rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2.5"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{u.name}</span>
                    <Badge
                      variant="secondary"
                      className="capitalize text-xs"
                    >
                      {u.role}
                    </Badge>
                  </div>
                  <span className="text-sm text-destructive font-semibold tabular-nums">
                    {u.pending_days}{" "}
                    {u.pending_days === 1 ? "dia" : "dias"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {addingForUser && data.goalId && (
        <IndividualGoalModal
          key={addingForUser.id}
          open
          onClose={() => setAddingForUser(null)}
          onSaved={() => {
            setAddingForUser(null);
            void refetch();
            onGoalDefined();
          }}
          goalId={data.goalId}
          user={addingForUser}
          existing={null}
        />
      )}
    </div>
  );
}
