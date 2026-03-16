"use client";

import { useState } from "react";
import { api } from "@/trpc/react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertTriangle } from "lucide-react";

export type ProductItem = {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  counts_as_sale: boolean;
  is_primary: boolean;
  sort_order: number;
  created_at: Date;
};

interface ProductModalProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  existing: ProductItem | null;
  nextSortOrder?: number;
}

export function ProductModal({
  open,
  onClose,
  onSaved,
  existing,
  nextSortOrder = 0,
}: ProductModalProps) {
  const [name, setName] = useState(() => existing?.name ?? "");
  const [description, setDescription] = useState(() => existing?.description ?? "");
  const [isActive, setIsActive] = useState(() => existing?.is_active ?? true);
  const [countsAsSale, setCountsAsSale] = useState(() => existing?.counts_as_sale ?? true);
  const [isPrimary, setIsPrimary] = useState(() => existing?.is_primary ?? false);
  const [sortOrder, setSortOrder] = useState(() => existing?.sort_order ?? nextSortOrder);
  const [error, setError] = useState("");

  const createMutation = api.products.create.useMutation({
    onSuccess: onSaved,
    onError: (e) => setError(e.message),
  });

  const updateMutation = api.products.update.useMutation({
    onSuccess: onSaved,
    onError: (e) => setError(e.message),
  });

  const isLoading = createMutation.isPending || updateMutation.isPending;

  function handleSubmit() {
    setError("");
    if (!name.trim()) {
      setError("Nome é obrigatório.");
      return;
    }
    const payload = {
      name: name.trim(),
      description: description.trim() || null,
      is_active: isActive,
      counts_as_sale: countsAsSale,
      is_primary: isPrimary,
      sort_order: sortOrder,
    };
    if (existing) {
      updateMutation.mutate({ id: existing.id, ...payload });
    } else {
      createMutation.mutate(payload);
    }
  }

  const auditedFieldsWillChange =
    existing &&
    (existing.counts_as_sale !== countsAsSale ||
      existing.is_active !== isActive ||
      existing.is_primary !== isPrimary);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {existing ? "Editar Produto" : "Novo Produto"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="prod-name">Nome *</Label>
            <Input
              id="prod-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Consultoria Mensal"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="prod-desc">Descrição</Label>
            <Input
              id="prod-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descrição opcional"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="prod-order">Ordem de exibição</Label>
            <Input
              id="prod-order"
              type="number"
              min={0}
              value={sortOrder}
              onChange={(e) => setSortOrder(Number(e.target.value))}
            />
          </div>

          <div className="rounded-lg border p-3 space-y-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Configurações (geram auditoria ao alterar)
            </p>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="h-4 w-4 rounded border"
              />
              <span className="text-sm">Produto ativo</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={countsAsSale}
                onChange={(e) => setCountsAsSale(e.target.checked)}
                className="h-4 w-4 rounded border"
              />
              <span className="text-sm">
                Conta como venda{" "}
                <span className="text-muted-foreground">(meta de vendas)</span>
              </span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={isPrimary}
                onChange={(e) => setIsPrimary(e.target.checked)}
                className="h-4 w-4 rounded border"
              />
              <span className="text-sm">Produto principal</span>
            </label>
          </div>

          {auditedFieldsWillChange && (
            <div className="flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 p-3 text-amber-800">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <p className="text-xs">
                Alterar Ativo, Conta como Venda ou Principal gerará um registro
                de auditoria.
              </p>
            </div>
          )}

          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? "Salvando..." : existing ? "Salvar" : "Criar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
