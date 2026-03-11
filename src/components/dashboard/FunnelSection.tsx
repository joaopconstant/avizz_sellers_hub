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

export function FunnelSection({ stages }: FunnelSectionProps) {
  const maxCount = Math.max(...stages.map((s) => s.count), 1);

  return (
    <div className="rounded-lg border bg-card p-5 space-y-4">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        Funil de Conversão
      </h2>

      <div className="flex items-end gap-2">
        {stages.map((stage, idx) => {
          const pct = (stage.count / maxCount) * 100;
          const isLast = idx === stages.length - 1;

          return (
            <div key={stage.label} className="flex-1 flex flex-col items-center gap-1">
              {/* Conversion badge */}
              {stage.conversionFromPrev !== null && (
                <span className="text-xs text-muted-foreground bg-muted rounded-full px-2 py-0.5">
                  {stage.conversionFromPrev.toFixed(1)}%
                </span>
              )}

              {/* Bar */}
              <div className="w-full flex flex-col items-center">
                <p className="text-sm font-bold mb-1">{formatInteger(stage.count)}</p>
                <div className="w-full bg-muted rounded-t overflow-hidden" style={{ height: 80 }}>
                  <div
                    className={`w-full rounded-t transition-all duration-500 ${
                      isLast ? "bg-primary" : "bg-primary/60"
                    }`}
                    style={{ height: `${pct}%`, marginTop: `${100 - pct}%` }}
                  />
                </div>
              </div>

              {/* Label */}
              <p className="text-xs text-center text-muted-foreground leading-tight mt-1">
                {stage.label}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
