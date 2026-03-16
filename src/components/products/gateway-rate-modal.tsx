"use client";

import { useState } from "react";
import { api } from "@/trpc/react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Save, Trash2 } from "lucide-react";

export type GatewayItem = {
  id: string;
  name: string;
  is_active: boolean;
  created_at: string;
  rates: { id: string; installments: number; rate_percent: number }[];
};

interface GatewayRateModalProps {
  gateway: GatewayItem | null;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export function GatewayRateModal({
  gateway,
  open,
  onClose,
  onSaved,
}: GatewayRateModalProps) {
  const [rates, setRates] = useState<Record<number, string>>(() => {
    const initial: Record<number, string> = {};
    for (const r of gateway?.rates ?? []) {
      initial[r.installments] = String(r.rate_percent);
    }
    return initial;
  });
  const [savingRow, setSavingRow] = useState<number | null>(null);
  const [deletingRow, setDeletingRow] = useState<number | null>(null);

  const upsertMutation = api.gateways.upsertRate.useMutation({
    onSuccess: () => {
      setSavingRow(null);
      onSaved();
    },
    onError: () => setSavingRow(null),
  });

  const deleteMutation = api.gateways.deleteRate.useMutation({
    onSuccess: () => {
      setDeletingRow(null);
      onSaved();
    },
    onError: () => setDeletingRow(null),
  });

  function handleSave(installments: number) {
    if (!gateway) return;
    const val = parseFloat(rates[installments] ?? "");
    if (isNaN(val) || val < 0 || val > 100) return;
    setSavingRow(installments);
    upsertMutation.mutate({
      gatewayId: gateway.id,
      installments,
      rate_percent: val,
    });
  }

  function handleDelete(installments: number) {
    if (!gateway) return;
    setDeletingRow(installments);
    setRates((prev) => {
      const next = { ...prev };
      delete next[installments];
      return next;
    });
    deleteMutation.mutate({ gatewayId: gateway.id, installments });
  }

  const existingInstallments = new Set(gateway?.rates.map((r) => r.installments) ?? []);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>
            Taxas — {gateway?.name ?? ""}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-1 py-2">
          <div className="grid grid-cols-[auto_1fr_auto_auto] gap-x-2 gap-y-1 items-center text-xs text-muted-foreground px-1 pb-1">
            <span>Parcelas</span>
            <span>Taxa (%)</span>
            <span></span>
            <span></span>
          </div>
          {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => {
            const hasRate = existingInstallments.has(n);
            const isSaving = savingRow === n;
            const isDeleting = deletingRow === n;
            return (
              <div
                key={n}
                className="grid grid-cols-[auto_1fr_auto_auto] gap-x-2 items-center"
              >
                <span className="text-sm font-medium w-8 text-right">{n}x</span>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  step={0.01}
                  placeholder="–"
                  value={rates[n] ?? ""}
                  onChange={(e) =>
                    setRates((prev) => ({ ...prev, [n]: e.target.value }))
                  }
                  className="h-8 text-sm"
                />
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8"
                  onClick={() => handleSave(n)}
                  disabled={isSaving || isDeleting || !rates[n]}
                  title="Salvar"
                >
                  {isSaving ? (
                    <div className="h-3 w-3 animate-spin rounded-full border border-current border-t-transparent" />
                  ) : (
                    <Save className="h-3.5 w-3.5" />
                  )}
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-destructive hover:text-destructive"
                  onClick={() => handleDelete(n)}
                  disabled={!hasRate || isSaving || isDeleting}
                  title="Remover"
                >
                  {isDeleting ? (
                    <div className="h-3 w-3 animate-spin rounded-full border border-current border-t-transparent" />
                  ) : (
                    <Trash2 className="h-3.5 w-3.5" />
                  )}
                </Button>
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
