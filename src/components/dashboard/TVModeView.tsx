"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { HugeiconsIcon } from "@hugeicons/react";
import { Cancel01Icon } from "@hugeicons/core-free-icons";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "@/server/routers/_app";
import { formatCurrency, formatInteger } from "@/lib/formatting";

type RouterOutputs = inferRouterOutputs<AppRouter>;
type SummaryData = RouterOutputs["dashboard"]["getSummary"];
type FunnelData = RouterOutputs["dashboard"]["getFunnel"];
type RankingsData = RouterOutputs["dashboard"]["getRankings"];

interface TVModeViewProps {
  month: Date;
  summary: SummaryData;
  funnel: FunnelData;
  rankings: RankingsData;
  onClose: () => void;
  onRefetch: () => void;
}

const MIN_BAR_PCT = 12;

function rankBadge(index: number) {
  if (index === 0) return "🥇";
  if (index === 1) return "🥈";
  if (index === 2) return "🥉";
  return `${index + 1}`;
}

function tvRankColor(index: number, realized: number, goal: number | null): string {
  if (index === 0) return "text-amber-400 font-bold";
  if (goal === null || goal === 0) return "text-white";
  const pct = realized / goal;
  if (pct >= 0.8) return "text-green-400";
  if (pct >= 0.5) return "text-amber-400";
  return "text-red-400";
}

function Initials({ name, url }: { name: string; url: string | null }) {
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt={name} className="w-10 h-10 rounded-full object-cover shrink-0" />;
  }
  return (
    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold text-primary shrink-0">
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

function GoalBar({ realized, goal, label, valueLabel }: {
  realized: number;
  goal: number | null;
  label: string;
  valueLabel: string;
}) {
  const pct = goal && goal > 0 ? Math.min((realized / goal) * 100, 100) : 0;
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-xs uppercase tracking-widest text-white/40">{label}</span>
        <span className="text-2xl font-bold tabular-nums text-primary">{Math.round(pct)}%</span>
      </div>
      <div className="text-4xl font-bold tabular-nums text-white leading-none">{valueLabel}</div>
      <div className="h-3 rounded-full bg-white/10 overflow-hidden">
        <div
          className="h-full rounded-full bg-primary transition-all duration-700"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="text-xs text-white/40">
        meta {goal && goal > 0 ? formatCurrency(goal) : "—"}
      </div>
    </div>
  );
}

export function TVModeView({ month, summary: s, funnel, rankings, onClose, onRefetch }: TVModeViewProps) {
  const [clock, setClock] = useState("");
  const [lastRefresh, setLastRefresh] = useState(new Date());

  // Fullscreen API
  useEffect(() => {
    document.documentElement.requestFullscreen().catch(() => {});
    const handler = () => {
      if (!document.fullscreenElement) onClose();
    };
    document.addEventListener("fullscreenchange", handler);
    return () => {
      document.removeEventListener("fullscreenchange", handler);
      if (document.fullscreenElement) void document.exitFullscreen();
    };
  }, [onClose]);

  // Auto-refresh 60s
  useEffect(() => {
    const id = setInterval(() => {
      onRefetch();
      setLastRefresh(new Date());
    }, 60_000);
    return () => clearInterval(id);
  }, [onRefetch]);

  // Live clock
  useEffect(() => {
    setClock(format(new Date(), "HH:mm:ss"));
    const id = setInterval(() => setClock(format(new Date(), "HH:mm:ss")), 1000);
    return () => clearInterval(id);
  }, []);

  const monthLabel = format(month, "MMMM 'de' yyyy", { locale: ptBR });
  const monthLabelCapitalized = monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1);

  return (
    <div className="fixed inset-0 z-50 bg-[oklch(0.145_0_0)] text-white flex flex-col select-none">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 h-14 border-b border-white/10 shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-xl font-bold text-primary">Avizz Hub</span>
          <span className="text-white/20">|</span>
          <span className="text-base text-white/60">{monthLabelCapitalized}</span>
        </div>
        <div className="flex items-center gap-5">
          <span className="text-xs text-white/30">
            Atualizado {format(lastRefresh, "HH:mm")}
          </span>
          <span className="text-2xl font-mono tabular-nums text-white/80">{clock}</span>
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 text-sm text-white/50 hover:text-white transition-colors px-2 py-1 rounded hover:bg-white/10"
          >
            <HugeiconsIcon icon={Cancel01Icon} size={16} />
            Sair
          </button>
        </div>
      </div>

      {/* Main grid */}
      <div className="flex-1 grid grid-cols-5 gap-5 p-6 overflow-hidden">

        {/* LEFT — col-span-2 */}
        <div className="col-span-2 flex flex-col gap-4">

          {/* Metas */}
          <div className="rounded-xl border border-white/10 bg-white/5 p-6 space-y-6">
            <span className="text-xs uppercase tracking-widest text-white/40">Metas do Mês</span>
            <GoalBar
              label="Caixa"
              realized={s.cashRealized}
              goal={s.cashGoal}
              valueLabel={formatCurrency(s.cashRealized)}
            />
            <GoalBar
              label="Vendas"
              realized={s.salesCount}
              goal={s.salesGoal ?? 0}
              valueLabel={formatInteger(s.salesCount)}
            />
          </div>

          {/* KPIs 2x2 */}
          <div className="grid grid-cols-2 gap-3 flex-1">
            {/* Projeção */}
            <div className="rounded-xl border border-primary/40 bg-primary/5 p-4 flex flex-col justify-between">
              <span className="text-xs uppercase tracking-widest text-white/40">Projeção Caixa</span>
              <div>
                <div className="text-3xl font-bold tabular-nums text-white mt-2">
                  {formatCurrency(s.cashProjected)}
                </div>
                <div className="text-xs text-white/30 mt-1">
                  {s.workdaysElapsed} de {s.workdaysTotal} dias úteis
                </div>
              </div>
            </div>

            {/* Vendas count */}
            <div className="rounded-xl border border-white/10 bg-white/5 p-4 flex flex-col justify-between">
              <span className="text-xs uppercase tracking-widest text-white/40">Vendas</span>
              <div className="text-5xl font-bold tabular-nums text-white mt-2 leading-none">
                {formatInteger(s.salesCount)}
              </div>
            </div>

            {/* Receita Líquida */}
            <div className="rounded-xl border border-white/10 bg-white/5 p-4 flex flex-col justify-between">
              <span className="text-xs uppercase tracking-widest text-white/40">Receita Líquida</span>
              <div className="text-3xl font-bold tabular-nums text-white mt-2">
                {formatCurrency(s.netRealized)}
              </div>
            </div>

            {/* Receita Futura */}
            <div className="rounded-xl border border-white/10 bg-white/5 p-4 flex flex-col justify-between">
              <span className="text-xs uppercase tracking-widest text-white/40">Receita Futura</span>
              <div className="text-3xl font-bold tabular-nums text-white mt-2">
                {formatCurrency(s.futureRevenue)}
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT — col-span-3 */}
        <div className="col-span-3 flex flex-col gap-4">

          {/* Rankings */}
          <div className="grid grid-cols-2 gap-4 flex-1">
            {/* Closers */}
            <div className="rounded-xl border border-white/10 bg-white/5 p-5 flex flex-col gap-3 overflow-hidden">
              <span className="text-xs uppercase tracking-widest text-white/40 shrink-0">Ranking Closers</span>
              {rankings.closers.length === 0 ? (
                <p className="text-sm text-white/30">Nenhum closer cadastrado.</p>
              ) : (
                <div className="space-y-1 overflow-hidden">
                  {rankings.closers.slice(0, 5).map((c, idx) => (
                    <div key={c.userId} className="flex items-center gap-3 py-2 border-b border-white/5 last:border-0">
                      <span className={`text-xl w-8 text-center shrink-0 ${idx >= 3 ? "text-sm text-white/40" : ""}`}>
                        {rankBadge(idx)}
                      </span>
                      <Initials name={c.name} url={c.avatarUrl} />
                      <div className="flex-1 min-w-0">
                        <p className={`text-base font-medium truncate ${tvRankColor(idx, c.cashRealized, c.cashGoal)}`}>
                          {c.name}
                        </p>
                        <p className="text-xs text-white/40">
                          {c.salesCount} venda{c.salesCount !== 1 ? "s" : ""}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className={`text-lg font-bold tabular-nums ${tvRankColor(idx, c.cashRealized, c.cashGoal)}`}>
                          {formatCurrency(c.cashRealized)}
                        </p>
                        {c.cashGoal !== null && (
                          <p className="text-xs text-white/30">meta {formatCurrency(c.cashGoal)}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* SDRs */}
            <div className="rounded-xl border border-white/10 bg-white/5 p-5 flex flex-col gap-3 overflow-hidden">
              <span className="text-xs uppercase tracking-widest text-white/40 shrink-0">Ranking SDRs</span>
              {rankings.sdrs.length === 0 ? (
                <p className="text-sm text-white/30">Nenhum SDR cadastrado.</p>
              ) : (
                <div className="space-y-1 overflow-hidden">
                  {rankings.sdrs.slice(0, 5).map((u, idx) => (
                    <div key={u.userId} className="flex items-center gap-3 py-2 border-b border-white/5 last:border-0">
                      <span className={`text-xl w-8 text-center shrink-0 ${idx >= 3 ? "text-sm text-white/40" : ""}`}>
                        {rankBadge(idx)}
                      </span>
                      <Initials name={u.name} url={u.avatarUrl} />
                      <div className="flex-1 min-w-0">
                        <p className={`text-base font-medium truncate ${tvRankColor(idx, u.cashRealized, u.cashGoal)}`}>
                          {u.name}
                        </p>
                        <p className="text-xs text-white/40">
                          {u.meetingsHeld}/{u.meetingsScheduled} reuniões
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className={`text-lg font-bold tabular-nums ${tvRankColor(idx, u.cashRealized, u.cashGoal)}`}>
                          {formatCurrency(u.cashRealized)}
                        </p>
                        {u.cashGoal !== null && (
                          <p className="text-xs text-white/30">meta {formatCurrency(u.cashGoal)}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Funil */}
          <div className="rounded-xl border border-white/10 bg-white/5 p-5 flex flex-col gap-2 shrink-0">
            <span className="text-xs uppercase tracking-widest text-white/40 mb-1">Funil de Conversão</span>
            {funnel.map((stage, idx) => {
              const maxCount = Math.max(...funnel.map((s) => s.count), 1);
              const rawPct = (stage.count / maxCount) * 100;
              const barPct = Math.max(rawPct, MIN_BAR_PCT);

              return (
                <div key={stage.label}>
                  {stage.conversionFromPrev !== null && (
                    <div className="flex items-center gap-2 py-0.5 pl-2">
                      <span className="text-white/30 text-xs">↓</span>
                      <span className="text-xs text-white/30">
                        {stage.conversionFromPrev.toFixed(1)}% de conversão
                      </span>
                    </div>
                  )}
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-white/40 w-36 shrink-0 text-right leading-tight">
                      {stage.label}
                    </span>
                    <div className="flex-1 flex items-center gap-2">
                      <div
                        className={`h-10 rounded flex items-center justify-end pr-3 transition-all duration-500 ${
                          idx === funnel.length - 1 ? "bg-primary" : "bg-primary/50"
                        }`}
                        style={{ width: `${barPct}%` }}
                      >
                        <span className="text-sm font-bold text-white/90 tabular-nums">
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
      </div>
    </div>
  );
}
