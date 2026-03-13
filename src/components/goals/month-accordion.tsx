"use client";

import { useState } from "react";
import { api } from "@/trpc/react";
import { formatCurrency } from "@/lib/formatting";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { AuditLogModal } from "./audit-log-modal";
import { History } from "lucide-react";

interface MonthAccordionProps {
  currentMonth: string; // excluir do histórico (já exibido nas tabs acima)
}

export function MonthAccordion({ currentMonth }: MonthAccordionProps) {
  const { data: goals, isLoading } = api.goals.listGoals.useQuery();
  const [auditGoalId, setAuditGoalId] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="rounded-xl border bg-card p-5">
        <p className="text-sm text-muted-foreground">Carregando histórico...</p>
      </div>
    );
  }

  // Filtrar meses anteriores ao mês atual
  const pastGoals = (goals ?? []).filter(
    (g) => g.month.substring(0, 7) !== currentMonth.substring(0, 7),
  );

  if (pastGoals.length === 0) {
    return null;
  }

  return (
    <>
      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="px-5 py-4 border-b bg-muted/30">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Histórico de Meses
          </p>
        </div>

        <div className="px-5">
          <Accordion type="multiple" className="divide-y">
            {pastGoals.map((g) => (
              <AccordionItem
                key={g.id}
                value={g.id}
                className="border-0 py-0"
              >
                <AccordionTrigger className="py-4 hover:no-underline hover:bg-transparent">
                  <div className="flex items-center justify-between w-full pr-2 gap-4">
                    <span className="text-sm font-semibold capitalize">
                      {format(new Date(g.month), "MMMM yyyy", { locale: ptBR })}
                    </span>
                    <div className="flex items-center gap-2 flex-wrap justify-end">
                      <span className="text-xs bg-muted rounded-md px-2 py-0.5 tabular-nums font-medium">
                        {formatCurrency(g.cash_goal)}
                      </span>
                      <span className="text-xs bg-muted rounded-md px-2 py-0.5 tabular-nums font-medium">
                        {g.sales_goal} vendas
                      </span>
                      {g.individualGoalsCount > 0 && (
                        <span className="text-xs text-muted-foreground">
                          {g.individualGoalsCount} individual
                          {g.individualGoalsCount !== 1 ? "is" : ""}
                        </span>
                      )}
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pb-4">
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-lg border bg-muted/30 p-3">
                        <p className="text-xs text-muted-foreground mb-1">
                          Meta Caixa
                        </p>
                        <p className="font-semibold tabular-nums">
                          {formatCurrency(g.cash_goal)}
                        </p>
                      </div>
                      <div className="rounded-lg border bg-muted/30 p-3">
                        <p className="text-xs text-muted-foreground mb-1">
                          Meta Vendas
                        </p>
                        <p className="font-semibold tabular-nums">
                          {g.sales_goal}
                        </p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setAuditGoalId(g.id)}
                      className="gap-1.5 h-8 text-xs"
                    >
                      <History className="h-3.5 w-3.5" />
                      Ver Histórico de Alterações
                    </Button>
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>

      <AuditLogModal
        goalId={auditGoalId}
        open={!!auditGoalId}
        onClose={() => setAuditGoalId(null)}
      />
    </>
  );
}
