"use client";

import { formatCurrency, formatInteger } from "@/lib/formatting";

interface ProjectionBoxesProps {
  cashRealized: number;
  cashProjected: number;
  netRealized: number;
  futureRevenue: number;
  salesCount: number;
  workdaysElapsed: number;
  workdaysTotal: number;
}

function KpiBox({
  label,
  value,
  sub,
  highlight,
}: {
  label: string;
  value: string;
  sub?: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border p-4 space-y-1 ${
        highlight ? "bg-primary/5 border-primary/20" : "bg-card"
      }`}
    >
      <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
        {label}
      </p>
      <p className="text-xl font-bold">{value}</p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

export function ProjectionBoxes({
  cashRealized,
  cashProjected,
  netRealized,
  futureRevenue,
  salesCount,
  workdaysElapsed,
  workdaysTotal,
}: ProjectionBoxesProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
      <KpiBox
        label="Caixa Realizado"
        value={formatCurrency(cashRealized)}
      />
      <KpiBox
        label="Projeção Caixa"
        value={formatCurrency(cashProjected)}
        sub={`Baseado em ${workdaysElapsed}/${workdaysTotal} dias úteis`}
        highlight
      />
      <KpiBox
        label="Receita Líquida"
        value={formatCurrency(netRealized)}
      />
      <KpiBox
        label="Receita Futura"
        value={formatCurrency(futureRevenue)}
        sub="Parcelas a receber"
      />
      <KpiBox
        label="Vendas Realizadas"
        value={formatInteger(salesCount)}
        sub="Contratos válidos"
      />
    </div>
  );
}
