"use client";

import { formatInteger } from "@/lib/formatting";

interface FunnelStage {
  label: string;
  count: number;
  conversionFromPrev: number | null;
}

interface FunnelSectionProps {
  stages: FunnelStage[];
}

const MIN_BAR_PCT = 15;

export function FunnelSection({ stages }: FunnelSectionProps) {
  const maxCount = Math.max(...stages.map((s) => s.count), 1);

  return (
    <div className="rounded-lg border bg-card p-5 space-y-3">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        Funil de Conversão
      </h2>

      <div className="flex flex-col gap-1.5">
        {stages.map((stage, idx) => {
          const rawPct = (stage.count / maxCount) * 100;
          const barPct = Math.max(rawPct, MIN_BAR_PCT);
          const isLast = idx === stages.length - 1;

          return (
            <div key={stage.label}>
              {/* Conversion arrow between stages */}
              {stage.conversionFromPrev !== null && (
                <div className="flex items-center gap-2 py-0.5 pl-2">
                  <span className="text-muted-foreground text-xs">↓</span>
                  <span className="text-xs text-muted-foreground">
                    {stage.conversionFromPrev.toFixed(1)}% de conversão
                  </span>
                </div>
              )}

              {/* Funnel bar row */}
              <div className="flex items-center gap-3">
                {/* Label fixed width */}
                <span className="text-xs text-muted-foreground w-28 shrink-0 text-right leading-tight">
                  {stage.label}
                </span>

                {/* Bar + count */}
                <div className="flex-1 flex items-center gap-2">
                  <div
                    className={`h-8 rounded transition-all duration-500 flex items-center justify-end pr-2 ${
                      isLast ? "bg-primary" : "bg-primary/60"
                    }`}
                    style={{ width: `${barPct}%` }}
                  >
                    <span className="text-xs font-bold text-primary-foreground">
                      {formatInteger(stage.count)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
