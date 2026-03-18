"use client";

import { formatCurrency, goalPctColor } from "@/lib/formatting";
import { UserAvatar } from "@/components/shared/UserAvatar";

interface CloserRank {
  userId: string;
  name: string;
  avatarUrl: string | null;
  cashRealized: number;
  salesCount: number;
  cashGoal: number | null;
}

interface SdrRank {
  userId: string;
  name: string;
  avatarUrl: string | null;
  cashRealized: number;
  meetingsScheduled: number;
  meetingsHeld: number;
  cashGoal: number | null;
}

interface RankingsSectionProps {
  closers: CloserRank[];
  sdrs: SdrRank[];
  onSelectUser?: (userId: string) => void;
}

interface RankEntry {
  userId: string;
  name: string;
  avatarUrl: string | null;
  cashRealized: number;
  cashGoal: number | null;
  podiumSub: string;
  midValue: string;
}

const PODIUM_ORDER = [1, 0, 2] as const;

const PODIUM_BG: Record<number, string> = {
  0: "bg-amber-500/10 border-amber-500/40",
  1: "bg-muted/50 border-border",
  2: "bg-orange-700/10 border-orange-700/30",
};

const PLACE_BADGE: Record<number, string> = {
  0: "bg-amber-500 text-white",
  1: "bg-muted-foreground/20 text-foreground",
  2: "bg-orange-700/60 text-white",
};

function medalOrRank(idx: number): string | number {
  if (idx === 0) return "🏆";
  if (idx === 1) return "🥈";
  if (idx === 2) return "🥉";
  return idx + 1;
}


function PodiumCard({
  rank,
  entry,
  isFirst,
  onClick,
}: {
  rank: number;
  entry: RankEntry;
  isFirst: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-2 rounded-xl border p-4 transition-colors hover:bg-muted/40 w-full ${PODIUM_BG[rank] ?? "bg-card border-border"} ${isFirst ? "py-6" : "py-4"}`}
    >
      {isFirst && <span className="text-amber-500 text-xl">🏆</span>}
      <UserAvatar
        name={entry.name}
        url={entry.avatarUrl}
        size={isFirst ? "lg" : "md"}
      />
      <p
        className={`font-semibold truncate max-w-full text-center ${isFirst ? "text-base" : "text-sm"}`}
      >
        {entry.name}
      </p>
      <p
        className={`font-bold tabular-nums text-primary ${isFirst ? "text-base" : "text-sm"}`}
      >
        {formatCurrency(entry.cashRealized)}
      </p>
      <p className="text-xs text-muted-foreground">{entry.podiumSub}</p>
      <span
        className={`text-sm font-bold rounded-md px-3 py-1 ${PLACE_BADGE[rank] ?? ""}`}
      >
        {rank + 1}
      </span>
    </button>
  );
}

function RankingBlock({
  title,
  entries,
  midColumnLabel,
  emptyMessage,
  onSelectUser,
}: {
  title: string;
  entries: RankEntry[];
  midColumnLabel: string;
  emptyMessage: string;
  onSelectUser?: (userId: string) => void;
}) {
  if (entries.length === 0) {
    return (
      <div className="rounded-lg border bg-card p-5 space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          {title}
        </h2>
        <p className="text-sm text-muted-foreground">{emptyMessage}</p>
      </div>
    );
  }

  const podium = PODIUM_ORDER.map((i) => entries[i]).filter(
    Boolean,
  ) as RankEntry[];
  const podiumCols =
    entries.length === 1
      ? "grid-cols-1 max-w-xs mx-auto"
      : entries.length === 2
        ? "grid-cols-2"
        : "grid-cols-3";

  return (
    <div className="rounded-lg border bg-card p-5 space-y-4">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </h2>

      <div className={`grid gap-3 ${podiumCols}`}>
        {podium.map((entry, i) => (
          <PodiumCard
            key={entry.userId}
            rank={PODIUM_ORDER[i]!}
            entry={entry}
            isFirst={PODIUM_ORDER[i] === 0}
            onClick={() => onSelectUser?.(entry.userId)}
          />
        ))}
      </div>

      <div className="rounded-md border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/30">
              <th className="text-left px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground w-8">
                #
              </th>
              <th className="text-left px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Nome
              </th>
              <th className="text-right px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {midColumnLabel}
              </th>
              <th className="text-right px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Caixa
              </th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry, idx) => (
              <tr
                key={entry.userId}
                className={`border-b last:border-0 cursor-pointer hover:bg-muted/40 transition-colors ${idx === 0 ? "bg-amber-500/5" : ""}`}
                onClick={() => onSelectUser?.(entry.userId)}
              >
                <td className="px-3 py-2 text-muted-foreground text-xs">
                  {medalOrRank(idx)}
                </td>
                <td className="px-3 py-2 font-medium">{entry.name}</td>
                <td className="px-3 py-2 text-right text-muted-foreground">
                  {entry.midValue}
                </td>
                <td
                  className={`px-3 py-2 text-right font-semibold tabular-nums ${goalPctColor(entry.cashRealized, entry.cashGoal)}`}
                >
                  {formatCurrency(entry.cashRealized)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function RankingsSection({
  closers,
  sdrs,
  onSelectUser,
}: RankingsSectionProps) {
  const closerEntries: RankEntry[] = closers.map((c) => ({
    userId: c.userId,
    name: c.name,
    avatarUrl: c.avatarUrl,
    cashRealized: c.cashRealized,
    cashGoal: c.cashGoal,
    podiumSub: `${c.salesCount} venda${c.salesCount !== 1 ? "s" : ""}`,
    midValue: String(c.salesCount),
  }));

  const sdrEntries: RankEntry[] = sdrs.map((s) => ({
    userId: s.userId,
    name: s.name,
    avatarUrl: s.avatarUrl,
    cashRealized: s.cashRealized,
    cashGoal: s.cashGoal,
    podiumSub: `${s.meetingsHeld}/${s.meetingsScheduled} reuniões`,
    midValue: `${s.meetingsHeld}/${s.meetingsScheduled}`,
  }));

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <RankingBlock
        title="Top SDRs"
        entries={sdrEntries}
        midColumnLabel="Reun."
        emptyMessage="Nenhum SDR cadastrado."
        onSelectUser={onSelectUser}
      />
      <RankingBlock
        title="Top Closers"
        entries={closerEntries}
        midColumnLabel="Vendas"
        emptyMessage="Nenhum closer cadastrado."
        onSelectUser={onSelectUser}
      />
    </div>
  );
}
