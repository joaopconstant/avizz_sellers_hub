"use client";

import { formatCurrency, formatInteger } from "@/lib/formatting";

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

function rankColor(index: number, realized: number, goal: number | null): string {
  if (index === 0) return "text-amber-600 font-bold";
  if (goal === null || goal === 0) return "";
  const pct = realized / goal;
  if (pct >= 0.8) return "text-green-600";
  if (pct >= 0.5) return "text-amber-500";
  return "text-red-500";
}

function Avatar({ name, url }: { name: string; url: string | null }) {
  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt={name}
        className="w-8 h-8 rounded-full object-cover"
      />
    );
  }
  return (
    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary">
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

function RankBadge({ index }: { index: number }) {
  if (index === 0) return <span className="text-amber-500 font-bold text-sm">🥇</span>;
  if (index === 1) return <span className="text-slate-400 font-bold text-sm">🥈</span>;
  if (index === 2) return <span className="text-amber-700 font-bold text-sm">🥉</span>;
  return <span className="text-muted-foreground text-xs w-5 text-center">{index + 1}</span>;
}

export function RankingsSection({ closers, sdrs, onSelectUser }: RankingsSectionProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Closers */}
      <div className="rounded-lg border bg-card p-5 space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Ranking Closers
        </h2>
        {closers.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum closer cadastrado.</p>
        ) : (
          <div className="space-y-2">
            {closers.map((c, idx) => (
              <button
                key={c.userId}
                className="w-full flex items-center gap-3 rounded-md p-2 hover:bg-muted/50 transition-colors text-left"
                onClick={() => onSelectUser?.(c.userId)}
              >
                <RankBadge index={idx} />
                <Avatar name={c.name} url={c.avatarUrl} />
                <div className="flex-1 min-w-0">
                  <p className={`text-sm truncate ${rankColor(idx, c.cashRealized, c.cashGoal)}`}>
                    {c.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {c.salesCount} venda{c.salesCount !== 1 ? "s" : ""}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className={`text-sm font-semibold ${rankColor(idx, c.cashRealized, c.cashGoal)}`}>
                    {formatCurrency(c.cashRealized)}
                  </p>
                  {c.cashGoal !== null && (
                    <p className="text-xs text-muted-foreground">
                      meta {formatCurrency(c.cashGoal)}
                    </p>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* SDRs */}
      <div className="rounded-lg border bg-card p-5 space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Ranking SDRs
        </h2>
        {sdrs.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum SDR cadastrado.</p>
        ) : (
          <div className="space-y-2">
            {sdrs.map((s, idx) => (
              <button
                key={s.userId}
                className="w-full flex items-center gap-3 rounded-md p-2 hover:bg-muted/50 transition-colors text-left"
                onClick={() => onSelectUser?.(s.userId)}
              >
                <RankBadge index={idx} />
                <Avatar name={s.name} url={s.avatarUrl} />
                <div className="flex-1 min-w-0">
                  <p className={`text-sm truncate ${rankColor(idx, s.cashRealized, s.cashGoal)}`}>
                    {s.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {s.meetingsHeld}/{s.meetingsScheduled} reuniões
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className={`text-sm font-semibold ${rankColor(idx, s.cashRealized, s.cashGoal)}`}>
                    {formatCurrency(s.cashRealized)}
                  </p>
                  {s.cashGoal !== null && (
                    <p className="text-xs text-muted-foreground">
                      meta {formatCurrency(s.cashGoal)}
                    </p>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
