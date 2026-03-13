"use client";

import { useState } from "react";
import { api } from "@/trpc/react";
import { format, startOfMonth, subMonths, addMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GlobalGoalSection } from "./global-goal-section";
import { IndividualGoalsSection } from "./individual-goals-section";
import { RatesSection } from "./rates-section";
import { AuditLogModal } from "./audit-log-modal";
import { PendingCenter } from "./pending-center";
import { MonthAccordion } from "./month-accordion";
import { IndividualGoalModal } from "./individual-goal-modal";
import type { UserRole } from "@/lib/generated/prisma/enums";
import { ChevronLeft, ChevronRight, History, Target } from "lucide-react";

// ─── Botão para adicionar meta a colaborador sem meta ──────────────────────

function AddIndividualGoalButton({
  goalId,
  month,
  existingUserIds,
  onSaved,
}: {
  goalId: string;
  month: string;
  existingUserIds: string[];
  onSaved: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<{
    id: string;
    name: string;
    role: string;
    avatar_url: string | null;
  } | null>(null);

  const { data } = api.goals.getPendingCenter.useQuery({ month });

  const availableUsers = (data?.withoutGoal ?? []).filter(
    (u) => !existingUserIds.includes(u.id),
  );

  if (availableUsers.length === 0) return null;

  return (
    <>
      <div className="flex gap-2 flex-wrap">
        {availableUsers.map((u) => (
          <Button
            key={u.id}
            size="sm"
            variant="outline"
            onClick={() => {
              setSelectedUser(u);
              setOpen(true);
            }}
          >
            + {u.name}
          </Button>
        ))}
      </div>
      {selectedUser && (
        <IndividualGoalModal
          key={selectedUser.id}
          open={open}
          onClose={() => {
            setOpen(false);
            setSelectedUser(null);
          }}
          onSaved={() => {
            setOpen(false);
            setSelectedUser(null);
            onSaved();
          }}
          goalId={goalId}
          user={selectedUser}
          existing={null}
        />
      )}
    </>
  );
}

// ─── Componente principal ──────────────────────────────────────────────────

interface GoalsClientProps {
  role: UserRole;
}

export function GoalsClient({ role }: GoalsClientProps) {
  const [selectedMonth, setSelectedMonth] = useState<Date>(
    startOfMonth(new Date()),
  );
  const [auditOpen, setAuditOpen] = useState(false);

  const monthStr = format(selectedMonth, "yyyy-MM-dd");

  const { data, isLoading, refetch } = api.goals.getGoalForMonth.useQuery({
    month: monthStr,
  });

  function prevMonth() {
    setSelectedMonth((m) => startOfMonth(subMonths(m, 1)));
  }

  function nextMonth() {
    const next = startOfMonth(addMonths(selectedMonth, 1));
    if (next <= startOfMonth(new Date())) {
      setSelectedMonth(next);
    }
  }

  const isCurrentMonth =
    format(selectedMonth, "yyyy-MM") === format(new Date(), "yyyy-MM");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <Target className="h-4 w-4 text-primary" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Gestão de Metas</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            {role === "head"
              ? "Visualização das metas — edição exclusiva do admin"
              : "Configure as metas globais e individuais da equipe"}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Month navigator — bordered pill group */}
          <div className="flex items-center rounded-lg border bg-card overflow-hidden divide-x">
            <Button
              size="icon"
              variant="ghost"
              onClick={prevMonth}
              className="rounded-none h-9 w-9 border-0"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="px-4 min-w-36 text-center text-sm font-semibold capitalize">
              {format(selectedMonth, "MMMM yyyy", { locale: ptBR })}
            </span>
            <Button
              size="icon"
              variant="ghost"
              onClick={nextMonth}
              disabled={isCurrentMonth}
              className="rounded-none h-9 w-9 border-0"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {data?.goal && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAuditOpen(true)}
              className="gap-1.5 h-9"
            >
              <History className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Histórico</span>
            </Button>
          )}
        </div>
      </div>

      {/* Conteúdo principal */}
      {isLoading ? (
        <div className="rounded-xl border bg-card p-16 text-center">
          <div className="inline-flex flex-col items-center gap-3">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <span className="text-sm text-muted-foreground">Carregando metas...</span>
          </div>
        </div>
      ) : (
        <Tabs defaultValue="global" className="space-y-0">
          <div className="rounded-xl border bg-card overflow-hidden">
            <div className="border-b px-6 pt-4">
              <TabsList variant="line" className="gap-0 bg-transparent h-auto p-0 rounded-none">
                <TabsTrigger value="global" className="rounded-none px-3 pb-3 pt-0 text-sm">
                  Meta Geral
                </TabsTrigger>
                <TabsTrigger
                  value="individual"
                  disabled={!data?.goal}
                  className="rounded-none px-3 pb-3 pt-0 text-sm"
                >
                  Metas Individuais
                </TabsTrigger>
                <TabsTrigger
                  value="rates"
                  disabled={!data?.goal}
                  className="rounded-none px-3 pb-3 pt-0 text-sm"
                >
                  Taxas
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="global" className="p-6 space-y-0 mt-0">
              <GlobalGoalSection
                key={monthStr}
                month={monthStr}
                goal={data?.goal ?? null}
                role={role}
                onSaved={() => void refetch()}
              />
            </TabsContent>

            <TabsContent value="individual" className="p-6 space-y-4 mt-0">
              {data?.goal && (
                <>
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <p className="text-sm font-semibold">Metas Individuais</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {data.individualGoals.length === 0
                          ? "Nenhum colaborador com meta definida"
                          : `${data.individualGoals.length} colaborador${data.individualGoals.length !== 1 ? "es" : ""} com meta definida`}
                      </p>
                    </div>
                    {role === "admin" && (
                      <AddIndividualGoalButton
                        goalId={data.goal.id}
                        month={monthStr}
                        existingUserIds={data.individualGoals.map(
                          (ig) => ig.user_id,
                        )}
                        onSaved={() => void refetch()}
                      />
                    )}
                  </div>
                  <IndividualGoalsSection
                    goalId={data.goal.id}
                    individualGoals={data.individualGoals}
                    role={role}
                    onSaved={() => void refetch()}
                  />
                </>
              )}
            </TabsContent>

            <TabsContent value="rates" className="p-6 space-y-4 mt-0">
              {data?.goal && (
                <>
                  <div>
                    <p className="text-sm font-semibold">Taxas por Colaborador</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Metas de performance e taxas de conversão individuais
                    </p>
                  </div>
                  <RatesSection
                    goalId={data.goal.id}
                    individualGoals={data.individualGoals}
                    role={role}
                    onSaved={() => void refetch()}
                  />
                </>
              )}
            </TabsContent>
          </div>
        </Tabs>
      )}

      {/* Central de Pendências */}
      <PendingCenter
        month={monthStr}
        role={role}
        onGoalDefined={() => void refetch()}
      />

      {/* Histórico de meses anteriores */}
      <MonthAccordion currentMonth={monthStr} />

      {/* Modal de auditoria */}
      {data?.goal && (
        <AuditLogModal
          goalId={data.goal.id}
          open={auditOpen}
          onClose={() => setAuditOpen(false)}
        />
      )}
    </div>
  );
}
