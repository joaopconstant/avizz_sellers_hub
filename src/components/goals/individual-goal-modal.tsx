"use client";

import { useState } from "react";
import { api } from "@/trpc/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatCurrency } from "@/lib/formatting";

interface IndividualGoalModalProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  goalId: string;
  user: {
    id: string;
    name: string;
    role: string;
    avatar_url: string | null;
  };
  existing?: {
    id: string;
    cash_goal: number;
    sales_goal: number | null;
    rate_answer: number | null;
    rate_schedule: number | null;
    rate_noshow_max: number | null;
    rate_close: number | null;
  } | null;
}

function pctToDecimal(v: string): number | null {
  const n = parseFloat(v);
  if (isNaN(n)) return null;
  return n / 100;
}

function decimalToPct(v: number | null | undefined): string {
  if (v === null || v === undefined) return "";
  return (v * 100).toFixed(1);
}

export function IndividualGoalModal({
  open,
  onClose,
  onSaved,
  goalId,
  user,
  existing,
}: IndividualGoalModalProps) {
  const isSDR = user.role === "sdr";
  const isCloser = user.role === "closer";

  const [cashGoal, setCashGoal] = useState(
    existing ? String(existing.cash_goal) : "",
  );
  const [salesGoal, setSalesGoal] = useState(
    existing?.sales_goal != null ? String(existing.sales_goal) : "",
  );
  const [rateAnswer, setRateAnswer] = useState(
    decimalToPct(existing?.rate_answer),
  );
  const [rateSchedule, setRateSchedule] = useState(
    decimalToPct(existing?.rate_schedule),
  );
  const [rateNoShowMax, setRateNoShowMax] = useState(
    decimalToPct(existing?.rate_noshow_max),
  );
  const [rateClose, setRateClose] = useState(
    decimalToPct(existing?.rate_close),
  );
  const [error, setError] = useState<string | null>(null);

  const upsert = api.goals.upsertIndividualGoal.useMutation({
    onSuccess: () => {
      setError(null);
      onSaved();
      onClose();
    },
    onError: (e) => setError(e.message),
  });

  const deleteGoal = api.goals.deleteIndividualGoal.useMutation({
    onSuccess: () => {
      onSaved();
      onClose();
    },
    onError: (e) => setError(e.message),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const cash = parseFloat(cashGoal);
    if (isNaN(cash) || cash < 0) {
      setError("Meta Caixa deve ser um valor válido.");
      return;
    }

    let salesGoalValue: number | null = null;
    if (isCloser) {
      const s = parseInt(salesGoal);
      if (isNaN(s) || s < 0) {
        setError("Meta de Vendas deve ser um número inteiro.");
        return;
      }
      salesGoalValue = s;
    }

    upsert.mutate({
      goalId,
      userId: user.id,
      cash_goal: cash,
      sales_goal: salesGoalValue,
      rate_answer: isSDR ? pctToDecimal(rateAnswer) : null,
      rate_schedule: isSDR ? pctToDecimal(rateSchedule) : null,
      rate_noshow_max: pctToDecimal(rateNoShowMax),
      rate_close: isCloser ? pctToDecimal(rateClose) : null,
    });
  }

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Meta Individual — {user.name}</DialogTitle>
          <p className="text-sm text-muted-foreground capitalize">
            {user.role}
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label htmlFor="ig_cash_goal">Meta Caixa (R$)</Label>
            <Input
              id="ig_cash_goal"
              type="number"
              min="0"
              step="0.01"
              placeholder="Ex: 20000"
              value={cashGoal}
              onChange={(e) => setCashGoal(e.target.value)}
              required
            />
          </div>

          {isCloser && (
            <div className="space-y-1.5">
              <Label htmlFor="ig_sales_goal">Meta de Vendas</Label>
              <Input
                id="ig_sales_goal"
                type="number"
                min="0"
                step="1"
                placeholder="Ex: 3"
                value={salesGoal}
                onChange={(e) => setSalesGoal(e.target.value)}
              />
            </div>
          )}

          {isSDR && (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="rate_answer">Taxa de Atendimento (%)</Label>
                <Input
                  id="rate_answer"
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  placeholder="Ex: 80"
                  value={rateAnswer}
                  onChange={(e) => setRateAnswer(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="rate_schedule">Taxa de Agendamento (%)</Label>
                <Input
                  id="rate_schedule"
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  placeholder="Ex: 20"
                  value={rateSchedule}
                  onChange={(e) => setRateSchedule(e.target.value)}
                />
              </div>
            </>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="rate_noshow_max">No-Show Máximo (%)</Label>
            <Input
              id="rate_noshow_max"
              type="number"
              min="0"
              max="100"
              step="0.1"
              placeholder="Ex: 20"
              value={rateNoShowMax}
              onChange={(e) => setRateNoShowMax(e.target.value)}
            />
          </div>

          {isCloser && (
            <div className="space-y-1.5">
              <Label htmlFor="rate_close">Taxa de Conversão Meta (%)</Label>
              <Input
                id="rate_close"
                type="number"
                min="0"
                max="100"
                step="0.1"
                placeholder="Ex: 30"
                value={rateClose}
                onChange={(e) => setRateClose(e.target.value)}
              />
            </div>
          )}

          {/* ── Cascata calculada ──────────────────────────────────────── */}
          {isCloser && (() => {
            const sg = parseInt(salesGoal);
            const rc = parseFloat(rateClose);
            const rn = parseFloat(rateNoShowMax);
            if (!isNaN(sg) && sg > 0 && !isNaN(rc) && rc > 0) {
              const reunioes = Math.ceil(sg / (rc / 100));
              const comBuffer = !isNaN(rn) && rn < 100
                ? Math.ceil(reunioes / (1 - rn / 100))
                : null;
              return (
                <div className="rounded-md border border-border bg-muted/40 p-3 text-xs space-y-1">
                  <p className="font-medium text-muted-foreground">Cascata (estimativa)</p>
                  <p>Meta vendas: <span className="font-semibold">{sg}</span></p>
                  <p>→ Reuniões necessárias: <span className="font-semibold">{reunioes}</span></p>
                  {comBuffer !== null && (
                    <p>→ Com buffer no-show: <span className="font-semibold">{comBuffer}</span></p>
                  )}
                </div>
              );
            }
            return null;
          })()}

          {isSDR && (() => {
            const ra = parseFloat(rateAnswer);
            const rs = parseFloat(rateSchedule);
            if (!isNaN(ra) && ra > 0) {
              const atendidas = Math.round(100 * (ra / 100));
              const agendamentos = !isNaN(rs) && rs > 0
                ? Math.round(atendidas * (rs / 100))
                : null;
              return (
                <div className="rounded-md border border-border bg-muted/40 p-3 text-xs space-y-1">
                  <p className="font-medium text-muted-foreground">Cascata (estimativa)</p>
                  <p>Para cada 100 ligações →</p>
                  <p>→ Atendidas: <span className="font-semibold">{atendidas}</span></p>
                  {agendamentos !== null && (
                    <p>→ Agendamentos: <span className="font-semibold">{agendamentos}</span></p>
                  )}
                </div>
              );
            }
            return null;
          })()}

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex gap-2 pt-2">
            <Button
              type="submit"
              disabled={upsert.isPending}
              className="flex-1"
            >
              {upsert.isPending
                ? "Salvando..."
                : existing
                  ? "Atualizar"
                  : "Definir Meta"}
            </Button>
            {existing && (
              <Button
                type="button"
                variant="destructive"
                disabled={deleteGoal.isPending}
                onClick={() => deleteGoal.mutate({ id: existing.id })}
              >
                {deleteGoal.isPending ? "..." : "Remover"}
              </Button>
            )}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Versão para exibir o valor alvo em formatação amigável
export function formatGoalTarget(
  value: number | null,
  type: "cash" | "sales" | "rate",
): string {
  if (value === null) return "—";
  if (type === "cash") return formatCurrency(value);
  if (type === "sales") return String(value);
  return (value * 100).toFixed(1) + "%";
}
