"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency } from "@/lib/formatting";

interface UserRow {
  userId: string;
  name: string;
  cashGoal: number | null;
  cashRealized: number;
  salesGoal: number | null;
  salesCount: number;
}

interface MetaVsEntregueTableProps {
  closers: UserRow[];
  sdrs: UserRow[];
  onSelectUser?: (userId: string) => void;
}

function PctCell({ realized, goal }: { realized: number; goal: number | null }) {
  if (!goal) return <TableCell className="text-right text-muted-foreground">—</TableCell>;
  const pct = Math.round((realized / goal) * 100);
  const color = pct >= 80 ? "text-green-600" : pct >= 50 ? "text-amber-500" : "text-red-500";
  return (
    <TableCell className={`text-right font-medium ${color}`}>{pct}%</TableCell>
  );
}

function UserTable({
  title,
  rows,
  onSelectUser,
}: {
  title: string;
  rows: UserRow[];
  onSelectUser?: (userId: string) => void;
}) {
  if (rows.length === 0) return null;

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
      <div className="rounded-md border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Colaborador</TableHead>
              <TableHead className="text-right">Meta Caixa</TableHead>
              <TableHead className="text-right">Caixa</TableHead>
              <TableHead className="text-right">%</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow
                key={row.userId}
                className={onSelectUser ? "cursor-pointer hover:bg-muted/50" : ""}
                onClick={() => onSelectUser?.(row.userId)}
              >
                <TableCell className="font-medium">{row.name}</TableCell>
                <TableCell className="text-right text-muted-foreground">
                  {row.cashGoal !== null ? formatCurrency(row.cashGoal) : "—"}
                </TableCell>
                <TableCell className="text-right">{formatCurrency(row.cashRealized)}</TableCell>
                <PctCell realized={row.cashRealized} goal={row.cashGoal} />
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

export function MetaVsEntregueTable({
  closers,
  sdrs,
  onSelectUser,
}: MetaVsEntregueTableProps) {
  return (
    <div className="rounded-lg border bg-card p-5 space-y-4">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        Meta × Entregue
      </h2>
      <UserTable title="Closers" rows={closers} onSelectUser={onSelectUser} />
      <UserTable title="SDRs" rows={sdrs} onSelectUser={onSelectUser} />
    </div>
  );
}
