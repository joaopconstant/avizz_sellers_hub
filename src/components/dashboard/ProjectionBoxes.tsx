"use client";

import { formatCurrency, formatInteger } from "@/lib/formatting";

interface ProjectionBoxesProps {
  cashRealized: number;
  cashProjected: number;
  cashGoal: number | null;
  advancesValue: number;
  workdaysElapsed: number;
  workdaysTotal: number;
}

function KpiBox({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className={`rounded-lg border p-4 space-y-1`}>
      <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
        {label}
      </p>
      <p className="text-2xl font-bold tabular-nums">{value}</p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

export function ProjectionBoxes({
  cashRealized,
  cashProjected,
  cashGoal,
  advancesValue,
  workdaysElapsed,
  workdaysTotal,
}: ProjectionBoxesProps) {
  const dailyRate = workdaysElapsed > 0 ? cashRealized / workdaysElapsed : 0;
  const remaining =
    cashGoal != null ? Math.max(0, cashGoal - cashRealized) : null;
  const workdaysLeft = workdaysTotal - workdaysElapsed;

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
      <KpiBox
        label="Projeção"
        value={formatCurrency(cashProjected)}
        sub={`Baseado em ${workdaysElapsed}/${workdaysTotal} dias úteis`}
      />
      <KpiBox
        label="/dia"
        value={formatCurrency(dailyRate)}
        sub={`Média sobre ${workdaysElapsed} dia${workdaysElapsed !== 1 ? "s" : ""} útil${workdaysElapsed !== 1 ? "s" : ""}`}
      />
      <KpiBox
        label="Faltam"
        value={remaining != null ? formatCurrency(remaining) : "—"}
        sub={
          cashGoal != null
            ? `Meta: ${formatCurrency(cashGoal)}`
            : "Meta não definida"
        }
      />
      <KpiBox
        label="Dias"
        value={formatInteger(workdaysLeft)}
        sub={`${workdaysLeft} dia${workdaysLeft !== 1 ? "s" : ""} útil${workdaysLeft !== 1 ? "s" : ""} restante${workdaysLeft !== 1 ? "s" : ""}`}
      />
      <KpiBox
        label="Na mesa"
        value={formatCurrency(advancesValue)}
        sub="Avanços em aberto"
      />
    </div>
  );
}
