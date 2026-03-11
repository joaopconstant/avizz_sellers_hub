"use client";

import { formatCurrency } from "@/lib/formatting";
import type { InsightType, InsightsData } from "./types";

interface InsightsSectionProps {
  data: InsightsData;
  onOpenInsight: (type: InsightType) => void;
}

function InsightCard({
  title,
  primary,
  secondary,
  onClick,
}: {
  title: string;
  primary: string;
  secondary: string;
  onClick: () => void;
}) {
  return (
    <button
      className="rounded-lg border bg-card p-4 text-left hover:bg-muted/30 transition-colors space-y-1 w-full"
      onClick={onClick}
    >
      <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
        {title}
      </p>
      <p className="text-lg font-bold">{primary}</p>
      <p className="text-xs text-muted-foreground">{secondary}</p>
    </button>
  );
}

export function InsightsSection({ data, onOpenInsight }: InsightsSectionProps) {
  const lastMom = data.mom[data.mom.length - 1];
  const prevMom = data.mom[data.mom.length - 2];
  const momDelta = lastMom?.delta;

  const topTier = data.clientProfile[0];
  const topProduct = data.topProducts[0];
  // .slice() prevents in-place mutation of the prop
  const topOrigin = data.saleOrigins.slice().sort((a, b) => b.count - a.count)[0];

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        Insights
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <InsightCard
          title="Válidas vs Upsells"
          primary={`${data.validasVsUpsells.valid.count} válidas`}
          secondary={`${data.validasVsUpsells.upsell.count} upsells — ${formatCurrency(data.validasVsUpsells.upsell.total)}`}
          onClick={() => onOpenInsight("validasVsUpsells")}
        />

        <InsightCard
          title="Histórico MoM"
          primary={
            momDelta !== null && momDelta !== undefined
              ? `${momDelta >= 0 ? "+" : ""}${momDelta.toFixed(1)}%`
              : "—"
          }
          secondary={
            prevMom
              ? `vs ${prevMom.month}: ${formatCurrency(prevMom.cashRealized)}`
              : "Sem histórico anterior"
          }
          onClick={() => onOpenInsight("mom")}
        />

        <InsightCard
          title="Perfil de Clientes"
          primary={topTier ? topTier.tier : "—"}
          secondary={
            topTier
              ? `${topTier.count} cliente${topTier.count !== 1 ? "s" : ""} — ${formatCurrency(topTier.total)}`
              : "Sem dados"
          }
          onClick={() => onOpenInsight("clientProfile")}
        />

        <InsightCard
          title="Composição por Prazos"
          primary={
            data.prazoComposition.length > 0
              ? `${data.prazoComposition.length} faixa${data.prazoComposition.length !== 1 ? "s" : ""}`
              : "—"
          }
          secondary={
            data.prazoComposition[0]
              ? `Mais comum: ${data.prazoComposition[0].months} ${data.prazoComposition[0].months === 1 ? "mês" : "meses"} — TME ${formatCurrency(data.prazoComposition[0].tme)}`
              : "Sem dados"
          }
          onClick={() => onOpenInsight("prazoComposition")}
        />

        <InsightCard
          title="Origem das Vendas"
          primary={topOrigin ? topOrigin.origin : "—"}
          secondary={
            topOrigin
              ? `${topOrigin.count} venda${topOrigin.count !== 1 ? "s" : ""} — ${formatCurrency(topOrigin.total)}`
              : "Sem dados"
          }
          onClick={() => onOpenInsight("saleOrigins")}
        />

        <InsightCard
          title="Top Produtos"
          primary={topProduct ? topProduct.productName : "—"}
          secondary={
            topProduct
              ? `${topProduct.count} venda${topProduct.count !== 1 ? "s" : ""} — ${formatCurrency(topProduct.total)}`
              : "Sem dados"
          }
          onClick={() => onOpenInsight("topProducts")}
        />
      </div>
    </div>
  );
}
