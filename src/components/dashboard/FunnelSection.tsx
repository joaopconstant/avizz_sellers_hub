"use client";

import { formatInteger } from "@/lib/formatting";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface FunnelStage {
  label: string;
  count: number;
  conversionFromPrev: number | null;
}

interface FunnelUser {
  userId: string;
  name: string;
}

interface FunnelSectionProps {
  stages: FunnelStage[];
  users?: FunnelUser[];
  selectedUserId?: string | null;
  onSelectUser?: (userId: string | null) => void;
}

const MAX_WIDTH = 100;
const MIN_WIDTH = 40;

// Fallback widths when all values are zero
const FALLBACK_WIDTHS = [100, 85, 70, 57, 45];

export function FunnelSection({ stages, users, selectedUserId, onSelectUser }: FunnelSectionProps) {
  let maxCount = 0;
  let allZero = true;
  for (const s of stages) {
    if (s.count > maxCount) maxCount = s.count;
    if (s.count > 0) allZero = false;
  }
  if (maxCount === 0) maxCount = 1;

  const showUserFilter = users && users.length > 0;

  return (
    <div className="rounded-lg border bg-card p-5 space-y-4 h-full">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Funil de Conversão
        </h2>
        {showUserFilter && (
          <Select
            value={selectedUserId ?? "all"}
            onValueChange={(v) => onSelectUser?.(v === "all" ? null : v)}
          >
            <SelectTrigger className="h-7 text-xs w-40">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {users.map((u) => (
                <SelectItem key={u.userId} value={u.userId}>
                  {u.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      <div className="flex flex-col items-center gap-2">
        {stages.map((stage, idx) => {
          const dataWidth = (stage.count / maxCount) * (MAX_WIDTH - MIN_WIDTH) + MIN_WIDTH;
          const width = allZero ? (FALLBACK_WIDTHS[idx] ?? MIN_WIDTH) : dataWidth;
          const isLast = idx === stages.length - 1;

          return (
            <div
              key={stage.label}
              className={`flex flex-col items-center justify-center rounded-xl py-2.5 px-4 transition-all duration-700 ${
                isLast ? "bg-primary" : "bg-primary/65"
              }`}
              style={{ width: `${width}%` }}
            >
              <span className="text-[10px] font-semibold uppercase tracking-widest text-primary-foreground/80 text-center leading-tight">
                {stage.label}
              </span>
              <span className="text-lg font-bold text-primary-foreground tabular-nums leading-tight">
                {formatInteger(stage.count)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
