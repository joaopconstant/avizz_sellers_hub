"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { IndividualGoalModal, formatGoalTarget } from "./individual-goal-modal";
import { cn } from "@/lib/utils";
import { UserAvatar, ROLE_COLORS } from "./user-avatar";
import type { UserRole } from "@/lib/generated/prisma/enums";
import type { IndividualGoalItem } from "./types";

interface IndividualGoalsSectionProps {
  goalId: string;
  individualGoals: IndividualGoalItem[];
  role: UserRole;
  onSaved: () => void;
}

function fmtRate(v: number | null): string {
  return v === null ? "—" : (v * 100).toFixed(1) + "%";
}

/** Cascade info for a Closer row */
function CloserCascade({ ig }: { ig: IndividualGoalItem }) {
  const salesGoal = ig.sales_goal;
  const rateClose = ig.rate_close;
  const rateNoshow = ig.rate_noshow_max;

  if (salesGoal === null || rateClose === null || rateClose === 0) return null;

  // reuniões necessárias = Meta Vendas / Taxa de Conversão
  const meetingsNeeded = Math.ceil(salesGoal / rateClose);
  // buffer no-show: reuniões necessárias / (1 - taxa no-show máx)
  const bufferNoShow =
    rateNoshow !== null && rateNoshow < 1
      ? Math.ceil(meetingsNeeded / (1 - rateNoshow))
      : null;

  return (
    <div className="text-xs text-muted-foreground space-y-0.5 mt-1">
      <p>
        {salesGoal} vendas → {meetingsNeeded} reuniões necessárias
        {bufferNoShow !== null && ` → ${bufferNoShow} c/ buffer no-show`}
      </p>
    </div>
  );
}

/** Cascade info for an SDR row */
function SdrCascade({ ig }: { ig: IndividualGoalItem }) {
  const rateAnswer = ig.rate_answer;
  const rateSchedule = ig.rate_schedule;

  if (rateAnswer === null && rateSchedule === null) return null;

  const answered =
    rateAnswer !== null ? Math.round(100 * rateAnswer) : null;
  const scheduled =
    rateSchedule !== null && rateAnswer !== null
      ? Math.round(100 * rateAnswer * rateSchedule)
      : rateSchedule !== null
        ? Math.round(100 * rateSchedule)
        : null;

  return (
    <div className="text-xs text-muted-foreground mt-1">
      Para cada 100 ligações →{" "}
      {answered !== null ? `${answered} atendidas` : "—"}
      {scheduled !== null ? ` → ${scheduled} agendamentos` : ""}
    </div>
  );
}

export function IndividualGoalsSection({
  goalId,
  individualGoals,
  role,
  onSaved,
}: IndividualGoalsSectionProps) {
  const isAdmin = role === "admin";
  const [editing, setEditing] = useState<IndividualGoalItem | null>(null);

  if (individualGoals.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4">
        Nenhuma meta individual definida para este mês.
      </p>
    );
  }

  return (
    <>
      <div className="rounded-lg border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30 hover:bg-muted/30">
              <TableHead className="font-semibold">Colaborador</TableHead>
              <TableHead className="font-semibold">Role</TableHead>
              <TableHead className="text-right font-semibold">
                Meta Caixa
              </TableHead>
              <TableHead className="text-right font-semibold">
                Meta Vendas
              </TableHead>
              <TableHead className="text-right font-semibold">
                No-Show Máx.
              </TableHead>
              <TableHead className="text-right font-semibold">
                Conversão / Atend.
              </TableHead>
              <TableHead className="text-right font-semibold">
                Agend.
              </TableHead>
              {isAdmin && <TableHead />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {individualGoals.map((ig) => (
              <TableRow key={ig.id} className="group align-top">
                <TableCell>
                  <div className="flex items-center gap-2.5">
                    <UserAvatar name={ig.user.name} role={ig.user.role} />
                    <div>
                      <span className="font-medium text-sm">{ig.user.name}</span>
                      {ig.user.role === "closer" && (
                        <CloserCascade ig={ig} />
                      )}
                      {ig.user.role === "sdr" && (
                        <SdrCascade ig={ig} />
                      )}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={cn(
                      "capitalize text-xs",
                      ROLE_COLORS[ig.user.role],
                    )}
                  >
                    {ig.user.role}
                  </Badge>
                </TableCell>
                <TableCell className="text-right tabular-nums text-sm font-medium">
                  {formatGoalTarget(ig.cash_goal, "cash")}
                </TableCell>
                <TableCell className="text-right tabular-nums text-sm">
                  {ig.user.role === "sdr"
                    ? "—"
                    : formatGoalTarget(ig.sales_goal, "sales")}
                </TableCell>
                <TableCell className="text-right tabular-nums text-sm">
                  {formatGoalTarget(ig.rate_noshow_max, "rate")}
                </TableCell>
                <TableCell className="text-right tabular-nums text-sm">
                  {ig.user.role === "closer"
                    ? fmtRate(ig.rate_close)
                    : ig.user.role === "sdr"
                      ? fmtRate(ig.rate_answer)
                      : "—"}
                </TableCell>
                <TableCell className="text-right tabular-nums text-sm">
                  {ig.user.role === "sdr" ? fmtRate(ig.rate_schedule) : "—"}
                </TableCell>
                {isAdmin && (
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setEditing(ig)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity h-7 px-2 text-xs"
                    >
                      Editar
                    </Button>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {editing && (
        <IndividualGoalModal
          key={editing.id}
          open
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            onSaved();
          }}
          goalId={goalId}
          user={editing.user}
          existing={editing}
        />
      )}
    </>
  );
}
