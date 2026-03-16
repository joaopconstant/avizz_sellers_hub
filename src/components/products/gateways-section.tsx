"use client";

import { useState } from "react";
import { api } from "@/trpc/react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { GatewayRateModal, type GatewayItem } from "./gateway-rate-modal";
import { Plus, Settings2 } from "lucide-react";

interface GatewaysSectionProps {
  gateways: GatewayItem[];
  isLoading: boolean;
  onRefetch: () => void;
}

export function GatewaysSection({
  gateways,
  isLoading,
  onRefetch,
}: GatewaysSectionProps) {
  const [rateGateway, setRateGateway] = useState<GatewayItem | null>(null);
  const [newName, setNewName] = useState("");
  const [creatingError, setCreatingError] = useState("");

  const createMutation = api.gateways.create.useMutation({
    onSuccess: () => {
      setNewName("");
      setCreatingError("");
      onRefetch();
    },
    onError: (e) => setCreatingError(e.message),
  });

  const toggleMutation = api.gateways.toggleActive.useMutation({
    onSuccess: onRefetch,
  });

  function handleCreate() {
    if (!newName.trim()) return;
    createMutation.mutate({ name: newName.trim() });
  }

  if (isLoading) {
    return (
      <div className="py-12 text-center text-sm text-muted-foreground">
        Carregando gateways...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Criar novo gateway */}
      <div className="space-y-2">
        <p className="text-sm font-medium">Novo Gateway de Pagamento</p>
        <div className="flex gap-2">
          <Input
            placeholder="Nome do gateway (ex: Pagar.me)"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            className="max-w-xs"
          />
          <Button
            onClick={handleCreate}
            disabled={createMutation.isPending || !newName.trim()}
            size="sm"
            className="gap-1.5"
          >
            <Plus className="h-4 w-4" />
            Adicionar
          </Button>
        </div>
        {creatingError && (
          <p className="text-sm text-destructive">{creatingError}</p>
        )}
      </div>

      {/* Lista de gateways */}
      {gateways.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
          Nenhum gateway cadastrado.
        </div>
      ) : (
        <div className="space-y-3">
          {gateways.map((gateway) => (
            <div key={gateway.id} className="rounded-lg border p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{gateway.name}</span>
                  <Badge
                    variant={gateway.is_active ? "default" : "secondary"}
                    className="text-xs"
                  >
                    {gateway.is_active ? "Ativo" : "Inativo"}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setRateGateway(gateway)}
                    className="gap-1.5 h-8 text-xs"
                  >
                    <Settings2 className="h-3.5 w-3.5" />
                    Taxas
                  </Button>
                  <Button
                    size="sm"
                    variant={gateway.is_active ? "outline" : "default"}
                    onClick={() =>
                      toggleMutation.mutate({ gatewayId: gateway.id })
                    }
                    disabled={toggleMutation.isPending}
                    className="h-8 text-xs"
                  >
                    {gateway.is_active ? "Desativar" : "Ativar"}
                  </Button>
                </div>
              </div>

              {/* Mini tabela de taxas */}
              {gateway.rates.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {gateway.rates.map((r) => (
                    <span
                      key={r.installments}
                      className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-xs font-mono"
                    >
                      {r.installments}x{" "}
                      <span className="text-muted-foreground">
                        {r.rate_percent.toFixed(2)}%
                      </span>
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Nenhuma taxa configurada
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      <GatewayRateModal
        key={rateGateway?.id}
        gateway={rateGateway}
        open={!!rateGateway}
        onClose={() => setRateGateway(null)}
        onSaved={() => {
          onRefetch();
        }}
      />
    </div>
  );
}
