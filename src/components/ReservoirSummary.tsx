"use client";

import Link from "next/link";
import { useAppState } from "./AppState";
import { useApi } from "@/lib/client/useApi";
import { TREND_TEXT, type Comparison, type OutlookPeriod } from "@/lib/weather/intelligence/reservoir.service";

interface Summary {
  island?: string;
  historyReady: boolean;
  overall: { past: { m1: Comparison; m6: Comparison } };
  outlook: { weeks: OutlookPeriod | null };
}

/** One-line rain-over-the-reservoirs summary on Today, linking to the Reservoirs page. */
export function ReservoirSummary() {
  const { island, ready } = useAppState();
  const api = useApi<Summary>(ready ? `/api/reservoirs?island=${island}` : null);
  const d = api.data && (api.data.island ?? "mauritius") === island ? api.data : null;
  if (!d) return null;
  const m1 = d.overall.past.m1;
  const m6 = d.overall.past.m6;
  const rod = island === "rodrigues";
  const line = (label: string, c: Comparison) =>
    c.pctNormal !== null ? `${label}: ${c.pctNormal}% of normal rain level` : c.mm !== null ? `${label}: ${Math.round(c.mm)} mm` : null;
  const parts = [line("Last month", m1), line("Last 6 months", m6)].filter((x): x is string => !!x);
  if (!parts.length) return null;
  const dry = m6.trend === "much-drier" || m6.trend === "drier";
  return (
    <Link href="/reservoirs" className={`card flex items-center justify-between gap-3 hover:bg-white/80 ${dry ? "ring-1 ring-coral" : ""}`}>
      <span className="min-w-0">
        <span className="label block">💧 {rod ? "Rain over Rodrigues" : "Rain over the reservoirs"}</span>
        {parts.map((p) => (
          <span key={p} className="mt-0.5 block text-sm font-semibold">{p}</span>
        ))}
        {d.outlook.weeks?.trend && <span className="block text-sm text-muted dark:text-slate-400">Next month: {TREND_TEXT[d.outlook.weeks.trend].toLowerCase()}</span>}
      </span>
      <span aria-hidden="true" className="text-teal-ink dark:text-teal-soft">→</span>
    </Link>
  );
}
