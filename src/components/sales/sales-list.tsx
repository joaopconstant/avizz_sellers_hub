"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDatePtBR } from "@/lib/formatting";
import { PAYMENT_LABELS, ORIGIN_LABELS } from "@/lib/constants";
import { EmptyState } from "@/components/shared/EmptyState";

type SaleRow = {
  id: string;
  sale_date: string;
  client_name: string;
  client_company: string;
  contract_value: number;
  payment_method: string;
  cash_value: number;
  net_value: number;
  counts_as_sale: boolean;
  sale_origin: string;
  is_recovered: boolean;
  product: { name: string };
  closer: { name: string };
  sdr: { name: string } | null;
};

type SalesListProps = {
  sales: SaleRow[];
  onDelete: (id: string) => void;
  isDeleting?: boolean;
};

// ─── Component ────────────────────────────────────────────────────────────────

export function SalesList({
  sales,
  onDelete,
  isDeleting,
}: SalesListProps) {
  if (sales.length === 0) {
    return (
      <EmptyState
        message="Nenhuma venda registrada ainda."
        hint='Clique em "Nova Venda" para registrar.'
      />
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left">
            <th className="pb-3 pr-4 font-medium text-muted-foreground text-xs whitespace-nowrap">Data</th>
            <th className="pb-3 pr-4 font-medium text-muted-foreground text-xs whitespace-nowrap">Cliente / Empresa</th>
            <th className="pb-3 pr-4 font-medium text-muted-foreground text-xs whitespace-nowrap">Produto</th>
            <th className="pb-3 pr-4 font-medium text-muted-foreground text-xs whitespace-nowrap text-right">Valor</th>
            <th className="pb-3 pr-4 font-medium text-muted-foreground text-xs whitespace-nowrap text-right">Caixa</th>
            <th className="pb-3 pr-4 font-medium text-muted-foreground text-xs whitespace-nowrap">Pagamento</th>
            <th className="pb-3 pr-4 font-medium text-muted-foreground text-xs whitespace-nowrap">Origem</th>
            <th className="pb-3 font-medium text-muted-foreground text-xs whitespace-nowrap">Ações</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {sales.map((sale) => (
              <tr key={sale.id} className="group hover:bg-muted/30">
                <td className="py-3 pr-4 text-xs text-muted-foreground whitespace-nowrap">
                  {formatDatePtBR(sale.sale_date)}
                </td>
                <td className="py-3 pr-4">
                  <p className="font-medium text-sm leading-tight">{sale.client_name}</p>
                  <p className="text-xs text-muted-foreground leading-tight">{sale.client_company}</p>
                </td>
                <td className="py-3 pr-4">
                  <div className="flex flex-col gap-1">
                    <span className="text-sm">{sale.product.name}</span>
                    {!sale.counts_as_sale && (
                      <Badge variant="outline" className="w-fit text-[10px] py-0">
                        Upsell
                      </Badge>
                    )}
                  </div>
                </td>
                <td className="py-3 pr-4 text-right tabular-nums font-medium whitespace-nowrap">
                  {formatCurrency(sale.contract_value)}
                </td>
                <td className="py-3 pr-4 text-right tabular-nums text-muted-foreground whitespace-nowrap">
                  {formatCurrency(sale.cash_value)}
                </td>
                <td className="py-3 pr-4 text-xs text-muted-foreground whitespace-nowrap">
                  {PAYMENT_LABELS[sale.payment_method] ?? sale.payment_method}
                </td>
                <td className="py-3 pr-4">
                  <div className="flex flex-col gap-1">
                    <span className="text-xs text-muted-foreground">
                      {ORIGIN_LABELS[sale.sale_origin] ?? sale.sale_origin}
                    </span>
                    {sale.is_recovered && (
                      <Badge variant="secondary" className="w-fit text-[10px] py-0">
                        Recuperada
                      </Badge>
                    )}
                    {sale.sdr && (
                      <span className="text-[10px] text-muted-foreground">
                        SDR: {sale.sdr.name}
                      </span>
                    )}
                  </div>
                </td>
                <td className="py-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive text-xs h-7 px-2 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => onDelete(sale.id)}
                    disabled={isDeleting}
                  >
                    Excluir
                  </Button>
                </td>
              </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
