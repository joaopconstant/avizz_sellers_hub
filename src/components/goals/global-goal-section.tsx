"use client";

import { useState } from "react";
import { api } from "@/trpc/react";
import { formatCurrency } from "@/lib/formatting";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DollarSign, ShoppingCart } from "lucide-react";
import type { UserRole } from "@/lib/generated/prisma/enums";

interface SerializedGoal {
  id: string;
  month: string;
  cash_goal: number;
  sales_goal: number;
  created_at: string;
}

interface GlobalGoalSectionProps {
  month: string; // "YYYY-MM-DD"
  goal: SerializedGoal | null;
  role: UserRole;
  onSaved: () => void;
}

function MetricCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border bg-muted/30 p-5 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
          {icon}
        </div>
      </div>
      <p className="text-3xl font-bold tabular-nums">{value}</p>
    </div>
  );
}

export function GlobalGoalSection({
  month,
  goal,
  role,
  onSaved,
}: GlobalGoalSectionProps) {
  const isAdmin = role === "admin";

  const [cashGoal, setCashGoal] = useState(goal ? String(goal.cash_goal) : "");
  const [salesGoal, setSalesGoal] = useState(
    goal ? String(goal.sales_goal) : "",
  );
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  const upsert = api.goals.upsertGoal.useMutation({
    onSuccess: () => {
      setReason("");
      setError(null);
      onSaved();
    },
    onError: (e) => setError(e.message),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const cash = parseFloat(cashGoal);
    const sales = parseInt(salesGoal);
    if (isNaN(cash) || cash <= 0) {
      setError("Meta Caixa deve ser um valor positivo.");
      return;
    }
    if (isNaN(sales) || sales <= 0) {
      setError("Meta de Vendas deve ser um número inteiro positivo.");
      return;
    }
    if (goal && !reason.trim()) {
      setError("Informe o motivo da alteração.");
      return;
    }
    upsert.mutate({
      month,
      cash_goal: cash,
      sales_goal: sales,
      reason: reason || undefined,
    });
  }

  // ─── Head: somente leitura ───────────────────────────────────────────────
  if (!isAdmin) {
    if (!goal) {
      return (
        <div className="py-8 text-center">
          <p className="text-sm text-muted-foreground">
            Nenhuma meta definida para este mês.
          </p>
        </div>
      );
    }
    return (
      <div className="space-y-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Meta do Mês
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <MetricCard
            label="Meta Caixa"
            value={formatCurrency(goal.cash_goal)}
            icon={<DollarSign className="h-4 w-4 text-primary" />}
          />
          <MetricCard
            label="Meta de Vendas"
            value={`${goal.sales_goal} venda${goal.sales_goal !== 1 ? "s" : ""}`}
            icon={<ShoppingCart className="h-4 w-4 text-primary" />}
          />
        </div>
      </div>
    );
  }

  // ─── Admin: formulário ───────────────────────────────────────────────────
  return (
    <div className="space-y-5">
      {goal && (
        <div className="rounded-lg border-l-4 border-l-primary bg-primary/5 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            Meta atual
          </p>
          <div className="flex flex-wrap gap-6">
            <div>
              <p className="text-xs text-muted-foreground">Caixa</p>
              <p className="text-lg font-bold tabular-nums">
                {formatCurrency(goal.cash_goal)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Vendas</p>
              <p className="text-lg font-bold tabular-nums">{goal.sales_goal}</p>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="cash_goal">Meta Caixa (R$)</Label>
            <Input
              id="cash_goal"
              type="number"
              min="0"
              step="0.01"
              placeholder="Ex: 80000"
              value={cashGoal}
              onChange={(e) => setCashGoal(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="sales_goal">Meta de Vendas</Label>
            <Input
              id="sales_goal"
              type="number"
              min="1"
              step="1"
              placeholder="Ex: 8"
              value={salesGoal}
              onChange={(e) => setSalesGoal(e.target.value)}
              required
            />
          </div>
        </div>

        {goal && (
          <div className="space-y-1.5">
            <Label htmlFor="reason">
              Motivo da alteração{" "}
              <span className="text-destructive font-medium">*</span>
            </Label>
            <Textarea
              id="reason"
              placeholder="Descreva o motivo da alteração da meta..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
            />
          </div>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button
          type="submit"
          disabled={upsert.isPending}
          className="w-full sm:w-auto"
        >
          {upsert.isPending
            ? "Salvando..."
            : goal
              ? "Atualizar Meta"
              : "Criar Meta"}
        </Button>
      </form>
    </div>
  );
}
