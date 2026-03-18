"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDatePtBR } from "@/lib/formatting";
import { ADVANCE_STATUS_FLAGS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/shared/EmptyState";

export type AdvanceRow = {
  id: string;
  lead_name: string;
  company_name: string;
  estimated_value: number;
  deadline: string | null;
  lead_score: number;
  status_flags: string[];
  is_converted: boolean;
  converted_sale_id: string | null;
  sdr_id: string | null;
  created_at: Date;
  updated_at: Date;
  closer: { name: string };
  sdr: { name: string } | null;
};

type AdvancesListProps = {
  advances: AdvanceRow[];
  onEdit: (advance: AdvanceRow) => void;
  onConvert: (advance: AdvanceRow) => void;
  onDelete: (id: string) => void;
  isDeleting?: boolean;
};

function ScoreDots({ score }: { score: number }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((dot) => (
        <div
          key={dot}
          className={cn(
            "size-2 rounded-full",
            dot <= score ? "bg-primary" : "bg-muted",
          )}
        />
      ))}
    </div>
  );
}

export function AdvancesList({
  advances,
  onEdit,
  onConvert,
  onDelete,
  isDeleting,
}: AdvancesListProps) {

  if (advances.length === 0) {
    return (
      <EmptyState
        message="Nenhum avanço registrado ainda."
        hint='Clique em "Novo Avanço" para começar.'
      />
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {advances.map((advance) => {
        const flagLabels = ADVANCE_STATUS_FLAGS.filter((f) =>
          advance.status_flags.includes(f.value),
        ).map((f) => f.label);

        const formattedDeadline = advance.deadline
          ? formatDatePtBR(advance.deadline)
          : null;

        return (
          <div
            key={advance.id}
            className={cn(
              "rounded-xl border p-4 flex flex-col gap-3 transition-colors",
              advance.is_converted
                ? "bg-muted/30 border-border/50"
                : "bg-background hover:bg-muted/10",
            )}
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm leading-tight truncate">
                  {advance.lead_name}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {advance.company_name}
                </p>
              </div>
              {advance.is_converted ? (
                <Badge variant="default" className="shrink-0 text-[10px]">
                  Convertido
                </Badge>
              ) : (
                <ScoreDots score={advance.lead_score} />
              )}
            </div>

            {/* Valor estimado */}
            <div>
              <p className="text-xs text-muted-foreground">Valor estimado</p>
              <p className="font-semibold">
                {formatCurrency(advance.estimated_value)}
              </p>
            </div>

            {/* Prazo */}
            {formattedDeadline && (
              <div>
                <p className="text-xs text-muted-foreground">Prazo</p>
                <p className="text-sm">{formattedDeadline}</p>
              </div>
            )}

            {/* Status flags */}
            {flagLabels.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {flagLabels.map((label) => (
                  <Badge
                    key={label}
                    variant="outline"
                    className="text-[10px] py-0"
                  >
                    {label}
                  </Badge>
                ))}
              </div>
            )}

            {/* SDR */}
            {advance.sdr && (
              <p className="text-[10px] text-muted-foreground">
                SDR: {advance.sdr.name}
              </p>
            )}

            {/* Ações */}
            {!advance.is_converted && (
              <div className="flex gap-1.5 pt-1 border-t border-border/50">
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex-1 text-xs h-7"
                  onClick={() => onEdit(advance)}
                >
                  Editar
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex-1 text-xs h-7 text-primary hover:text-primary"
                  onClick={() => onConvert(advance)}
                >
                  Converter
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs h-7 text-destructive hover:text-destructive px-2"
                  onClick={() => onDelete(advance.id)}
                  disabled={isDeleting}
                >
                  ×
                </Button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
