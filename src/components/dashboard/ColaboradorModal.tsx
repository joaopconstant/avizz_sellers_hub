"use client";

import { useState } from "react";
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
import { Badge } from "@/components/ui/badge";
import { api } from "@/trpc/react";
import { formatCurrency } from "@/lib/formatting";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ColaboradorModalProps {
  userId: string | null;
  month: Date;
  onClose: () => void;
}

export function ColaboradorModal({ userId, month, onClose }: ColaboradorModalProps) {
  const { data, isLoading } = api.dashboard.getColaboradorDetail.useQuery(
    { userId: userId ?? "", month: month.toISOString().slice(0, 10) },
    { enabled: !!userId },
  );

  return (
    <Dialog open={!!userId} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {data ? data.user.name : isLoading ? "Carregando..." : "Colaborador"}
          </DialogTitle>
          {data && (
            <p className="text-sm text-muted-foreground capitalize">{data.user.role}</p>
          )}
        </DialogHeader>

        {isLoading || !data ? (
          <div className="py-8 text-center text-muted-foreground text-sm">
            {isLoading ? "Carregando..." : "Nenhum dado encontrado."}
          </div>
        ) : (
          <>
            {/* KPIs */}
            <div className="grid grid-cols-2 gap-3 py-2">
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Caixa Realizado</p>
                <p className="text-lg font-bold">{formatCurrency(data.cashRealized)}</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Vendas Válidas</p>
                <p className="text-lg font-bold">{data.salesCount}</p>
              </div>
              {data.user.role === "closer" && (
                <>
                  <div className="rounded-lg border p-3">
                    <p className="text-xs text-muted-foreground">Ligações Feitas</p>
                    <p className="text-lg font-bold">{data.activity.callsDone}</p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-xs text-muted-foreground">No-Shows</p>
                    <p className="text-lg font-bold">{data.activity.noShows}</p>
                  </div>
                </>
              )}
              {data.user.role === "sdr" && (
                <>
                  <div className="rounded-lg border p-3">
                    <p className="text-xs text-muted-foreground">Agendamentos</p>
                    <p className="text-lg font-bold">{data.activity.meetingsScheduled}</p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-xs text-muted-foreground">Reuniões Realizadas</p>
                    <p className="text-lg font-bold">{data.activity.meetingsHeld}</p>
                  </div>
                </>
              )}
            </div>

            {/* Sales list */}
            {data.sales.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold mb-2">Vendas do mês</h3>
                <div className="rounded-md border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Cliente</TableHead>
                        <TableHead>Produto</TableHead>
                        <TableHead className="text-right">Caixa</TableHead>
                        <TableHead>Data</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.sales.map((s) => (
                        <TableRow key={s.id}>
                          <TableCell>
                            <p className="font-medium text-sm">{s.clientName}</p>
                            <p className="text-xs text-muted-foreground">{s.clientCompany}</p>
                          </TableCell>
                          <TableCell className="text-sm">
                            {s.productName}
                            {!s.countsAsSale && (
                              <Badge variant="secondary" className="ml-1 text-xs">
                                Upsell
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right font-medium text-sm">
                            {formatCurrency(s.cashValue)}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {format(new Date(s.saleDate), "dd/MM", { locale: ptBR })}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            {data.sales.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhuma venda registrada neste mês.
              </p>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
