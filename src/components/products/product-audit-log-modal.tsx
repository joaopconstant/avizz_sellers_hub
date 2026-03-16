"use client";

import { api } from "@/trpc/react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ProductAuditLogModalProps {
  productId: string | null;
  productName?: string;
  open: boolean;
  onClose: () => void;
}

function BooleanBadge({ label, value }: { label: string; value: unknown }) {
  const isTrue = value === true || value === "true";
  return (
    <span className="inline-flex items-center gap-1 text-xs">
      <span className="text-muted-foreground">{label}:</span>
      <Badge variant={isTrue ? "default" : "secondary"} className="text-xs py-0 px-1.5">
        {isTrue ? "Sim" : "Não"}
      </Badge>
    </span>
  );
}

export function ProductAuditLogModal({
  productId,
  productName,
  open,
  onClose,
}: ProductAuditLogModalProps) {
  const { data, isLoading } = api.products.getAuditLog.useQuery(
    { productId: productId! },
    { enabled: !!productId && open },
  );

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Histórico de Auditoria{productName ? ` — ${productName}` : ""}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            Carregando...
          </div>
        ) : !data || data.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            Nenhuma alteração registrada.
          </div>
        ) : (
          <div className="space-y-3 py-2">
            {data.map((log) => (
              <div key={log.id} className="rounded-lg border p-4 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{log.changed_by.name}</span>
                  <span className="text-muted-foreground text-xs">
                    {format(new Date(log.changed_at), "dd/MM/yyyy 'às' HH:mm", {
                      locale: ptBR,
                    })}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div className="space-y-1">
                    <p className="font-medium text-muted-foreground uppercase tracking-wide text-[10px]">
                      Antes
                    </p>
                    <div className="flex flex-col gap-1">
                      <BooleanBadge
                        label="Ativo"
                        value={log.previous_values.is_active}
                      />
                      <BooleanBadge
                        label="Conta como venda"
                        value={log.previous_values.counts_as_sale}
                      />
                      <BooleanBadge
                        label="Principal"
                        value={log.previous_values.is_primary}
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="font-medium text-muted-foreground uppercase tracking-wide text-[10px]">
                      Depois
                    </p>
                    <div className="flex flex-col gap-1">
                      <BooleanBadge
                        label="Ativo"
                        value={log.new_values.is_active}
                      />
                      <BooleanBadge
                        label="Conta como venda"
                        value={log.new_values.counts_as_sale}
                      />
                      <BooleanBadge
                        label="Principal"
                        value={log.new_values.is_primary}
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
