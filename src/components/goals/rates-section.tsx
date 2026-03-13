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
import { IndividualGoalModal } from "./individual-goal-modal";
import { formatPercent } from "@/lib/formatting";
import { cn } from "@/lib/utils";
import { UserAvatar, ROLE_COLORS } from "./user-avatar";
import type { UserRole } from "@/lib/generated/prisma/enums";
import type { IndividualGoalItem } from "./types";

function fmtRate(v: number | null): string {
  return v === null ? "—" : formatPercent(v);
}

function RoleRateCell({
  rate,
  applicableRole,
  userRole,
}: {
  rate: number | null;
  applicableRole: string;
  userRole: string;
}) {
  if (userRole !== applicableRole) return <span className="text-muted-foreground">—</span>;
  return <span className="font-medium">{fmtRate(rate)}</span>;
}

interface RatesSectionProps {
  goalId: string;
  individualGoals: IndividualGoalItem[];
  role: UserRole;
  onSaved: () => void;
}

export function RatesSection({
  goalId,
  individualGoals,
  role,
  onSaved,
}: RatesSectionProps) {
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
                Atendimento
              </TableHead>
              <TableHead className="text-right font-semibold">
                Agendamento
              </TableHead>
              <TableHead className="text-right font-semibold">
                No-Show Máx.
              </TableHead>
              <TableHead className="text-right font-semibold">
                Conversão
              </TableHead>
              {isAdmin && <TableHead />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {individualGoals.map((ig) => (
              <TableRow key={ig.id} className="group">
                <TableCell>
                  <div className="flex items-center gap-2.5">
                    <UserAvatar name={ig.user.name} role={ig.user.role} />
                    <span className="font-medium text-sm">{ig.user.name}</span>
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
                <TableCell className="text-right tabular-nums text-sm">
                  <RoleRateCell rate={ig.rate_answer} applicableRole="sdr" userRole={ig.user.role} />
                </TableCell>
                <TableCell className="text-right tabular-nums text-sm">
                  <RoleRateCell rate={ig.rate_schedule} applicableRole="sdr" userRole={ig.user.role} />
                </TableCell>
                <TableCell className="text-right tabular-nums text-sm font-medium">
                  {fmtRate(ig.rate_noshow_max)}
                </TableCell>
                <TableCell className="text-right tabular-nums text-sm">
                  <RoleRateCell rate={ig.rate_close} applicableRole="closer" userRole={ig.user.role} />
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
