"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency } from "@/lib/formatting";
import { REVENUE_TIER_OPTIONS, SALE_ORIGIN_OPTIONS } from "@/lib/constants";
import type { InsightType, InsightsData } from "./types";

interface InsightModalProps {
  type: InsightType | null;
  data: InsightsData | null | undefined;
  onClose: () => void;
}

function tierLabel(tier: string) {
  return REVENUE_TIER_OPTIONS.find((t) => t.value === tier)?.label ?? tier;
}

function originLabel(origin: string) {
  return SALE_ORIGIN_OPTIONS.find((o) => o.value === origin)?.label ?? origin;
}

export function InsightModal({ type, data, onClose }: InsightModalProps) {
  if (!type || !data) return null;

  const titles: Record<InsightType, string> = {
    validasVsUpsells: "Válidas vs Upsells",
    mom: "Histórico Mês a Mês",
    clientProfile: "Perfil de Clientes",
    prazoComposition: "Composição por Prazos",
    saleOrigins: "Origem das Vendas",
    topProducts: "Top Produtos",
  };

  return (
    <Dialog open={!!type} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{titles[type]}</DialogTitle>
        </DialogHeader>

        {type === "validasVsUpsells" && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tipo</TableHead>
                <TableHead className="text-right">Quantidade</TableHead>
                <TableHead className="text-right">Total Caixa</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="font-medium">Vendas Válidas</TableCell>
                <TableCell className="text-right">{data.validasVsUpsells.valid.count}</TableCell>
                <TableCell className="text-right">{formatCurrency(data.validasVsUpsells.valid.total)}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Upsells</TableCell>
                <TableCell className="text-right">{data.validasVsUpsells.upsell.count}</TableCell>
                <TableCell className="text-right">{formatCurrency(data.validasVsUpsells.upsell.total)}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        )}

        {type === "mom" && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mês</TableHead>
                <TableHead className="text-right">Caixa</TableHead>
                <TableHead className="text-right">Δ%</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.mom.map((m) => (
                <TableRow key={m.month}>
                  <TableCell>{m.month}</TableCell>
                  <TableCell className="text-right">{formatCurrency(m.cashRealized)}</TableCell>
                  <TableCell className="text-right">
                    {m.delta === null ? (
                      <span className="text-muted-foreground">—</span>
                    ) : (
                      <span className={m.delta >= 0 ? "text-green-600" : "text-red-500"}>
                        {m.delta >= 0 ? "+" : ""}{m.delta.toFixed(1)}%
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {type === "clientProfile" && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Perfil</TableHead>
                <TableHead className="text-right">Clientes</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.clientProfile.map((c) => (
                <TableRow key={c.tier}>
                  <TableCell>{tierLabel(c.tier)}</TableCell>
                  <TableCell className="text-right">{c.count}</TableCell>
                  <TableCell className="text-right">{formatCurrency(c.total)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {type === "prazoComposition" && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Prazo</TableHead>
                <TableHead className="text-right">Contratos</TableHead>
                <TableHead className="text-right">TME</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.prazoComposition.map((p) => (
                <TableRow key={p.months}>
                  <TableCell>{p.months} {p.months === 1 ? "mês" : "meses"}</TableCell>
                  <TableCell className="text-right">{p.count}</TableCell>
                  <TableCell className="text-right">{formatCurrency(p.tme)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {type === "saleOrigins" && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Origem</TableHead>
                <TableHead className="text-right">Vendas</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.saleOrigins.map((o) => (
                <TableRow key={o.origin}>
                  <TableCell>{originLabel(o.origin)}</TableCell>
                  <TableCell className="text-right">{o.count}</TableCell>
                  <TableCell className="text-right">{formatCurrency(o.total)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {type === "topProducts" && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Produto</TableHead>
                <TableHead className="text-right">Vendas</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.topProducts.map((p) => (
                <TableRow key={p.productName}>
                  <TableCell>{p.productName}</TableCell>
                  <TableCell className="text-right">{p.count}</TableCell>
                  <TableCell className="text-right">{formatCurrency(p.total)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </DialogContent>
    </Dialog>
  );
}
