"use client";

import { formatCurrency } from "@/lib/formatting";

interface MetaSectionProps {
  cashGoal: number | null;
  cashRealized: number;
  salesGoal: number | null;
  salesCount: number;
  myCashRealized: number | null;
  mySalesCount: number | null;
}

function ProgressBar({
  label,
  realized,
  goal,
  format,
  sublabel,
}: {
  label: string;
  realized: number;
  goal: number | null;
  format: (v: number) => string;
  sublabel?: string;
}) {
  const pct = goal && goal > 0 ? Math.min((realized / goal) * 100, 100) : 0;
  const pctDisplay = goal && goal > 0 ? Math.round((realized / goal) * 100) : null;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">{label}</p>
          {sublabel && <p className="text-xs text-muted-foreground">{sublabel}</p>}
        </div>
        <div className="text-right">
          <span className="text-sm font-semibold">{format(realized)}</span>
          {goal !== null && (
            <span className="text-xs text-muted-foreground ml-1">/ {format(goal)}</span>
          )}
          {pctDisplay !== null && (
            <span className="ml-2 text-xs font-medium text-muted-foreground">
              {pctDisplay}%
            </span>
          )}
        </div>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full bg-primary transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export function MetaSection({
  cashGoal,
  cashRealized,
  salesGoal,
  salesCount,
  myCashRealized,
  mySalesCount,
}: MetaSectionProps) {
  const showPersonal = myCashRealized !== null;

  return (
    <div className="rounded-lg border bg-card p-5 space-y-5">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        Meta da Empresa
      </h2>

      <ProgressBar
        label="Caixa"
        realized={cashRealized}
        goal={cashGoal}
        format={formatCurrency}
      />

      <ProgressBar
        label="Vendas"
        realized={salesCount}
        goal={salesGoal}
        format={(v) => `${Math.round(v)} venda${Math.round(v) !== 1 ? "s" : ""}`}
      />

      {showPersonal && (
        <div className="border-t pt-4">
          <h3 className="text-sm font-medium text-muted-foreground mb-3">
            Minha Performance
          </h3>
          <ProgressBar
            label="Meu Caixa"
            realized={myCashRealized ?? 0}
            goal={cashGoal}
            format={formatCurrency}
          />
          {mySalesCount !== null && (
            <div className="mt-3">
              <ProgressBar
                label="Minhas Vendas"
                realized={mySalesCount}
                goal={salesGoal}
                format={(v) => `${Math.round(v)} venda${Math.round(v) !== 1 ? "s" : ""}`}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
