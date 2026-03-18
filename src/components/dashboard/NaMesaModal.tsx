"use client";

import { useMemo } from "react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatCurrency } from "@/lib/formatting";
import Image from "next/image";

interface ActiveAdvance {
  id: string;
  lead_name: string;
  company_name: string;
  estimated_value: number;
  lead_score: number;
  deadline: string | null;
  closer: {
    id: string;
    name: string;
    avatar_url: string | null;
  };
}

interface NaMesaModalProps {
  open: boolean;
  onClose: () => void;
  advances: ActiveAdvance[];
}

function LeadScoreDots({ score }: { score: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }, (_, i) => (
        <div
          key={i}
          className={`size-2 rounded-full ${i < score ? "bg-primary" : "bg-muted"}`}
        />
      ))}
    </div>
  );
}

function CloserAvatar({
  name,
  avatarUrl,
}: {
  name: string;
  avatarUrl: string | null;
}) {
  if (avatarUrl) {
    return (
      <Image
        src={avatarUrl}
        alt={name}
        width={20}
        height={20}
        className="rounded-full"
      />
    );
  }
  return (
    <div className="size-5 rounded-full bg-muted flex items-center justify-center text-[10px] font-semibold text-muted-foreground">
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

export function NaMesaModal({ open, onClose, advances }: NaMesaModalProps) {
  const groups = useMemo(() => {
    const byCloser = new Map<
      string,
      { closer: ActiveAdvance["closer"]; items: ActiveAdvance[] }
    >();
    for (const adv of advances) {
      const entry = byCloser.get(adv.closer.id) ?? { closer: adv.closer, items: [] };
      entry.items.push(adv);
      byCloser.set(adv.closer.id, entry);
    }
    return [...byCloser.values()];
  }, [advances]);

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Avanços em Aberto</DialogTitle>
          <p className="text-sm text-muted-foreground">
            {advances.length} lead{advances.length !== 1 ? "s" : ""} na mesa
          </p>
        </DialogHeader>

        {advances.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            Nenhum avanço em aberto no momento.
          </p>
        ) : (
          <div className="space-y-5 pt-2">
            {groups.map(({ closer, items }) => (
              <div key={closer.id} className="space-y-2">
                {/* Closer header */}
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <CloserAvatar name={closer.name} avatarUrl={closer.avatar_url} />
                  <span>{closer.name}</span>
                </div>

                {/* Leads */}
                <div className="rounded-lg border divide-y overflow-hidden">
                  {items.map((adv) => (
                    <div key={adv.id} className="px-4 py-3 space-y-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">
                            {adv.lead_name}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {adv.company_name}
                          </p>
                        </div>
                        <p className="text-sm font-semibold tabular-nums shrink-0">
                          {formatCurrency(adv.estimated_value)}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <LeadScoreDots score={adv.lead_score} />
                        {adv.deadline && (
                          <p className="text-xs text-muted-foreground">
                            Prazo:{" "}
                            {format(parseISO(adv.deadline), "dd/MM/yyyy", { locale: ptBR })}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
