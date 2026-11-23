"use client";

import Link from "next/link";
import data from "@/data/accuracy.json";
import { climateKeyFor } from "@/lib/weather/intelligence/climate.service";
import type { Locality } from "@/data/localities";
import { formatUtcAsMU } from "@/lib/time";

interface RainScore {
  days: number;
  agreePct: number;
  rainDaysSeen: number;
  missed: number;
  falseAlarms: number;
}
interface Row {
  name: string;
  region?: string;
  reports?: number;
  rain: RainScore | null;
  tempMaeC: number | null;
}
const ACC = data as unknown as { builtAt: string | null; from: string | null; to: string | null; days: number; method: Record<string, string>; regions: Record<string, Row>; airports: Record<string, Row> };

export const accuracyReady = () => !!ACC.builtAt && Object.keys(ACC.regions).length > 0;

function Line({ r, observed }: { r: Row; observed?: boolean }) {
  if (!r.rain) return null;
  return (
    <li className="rounded-2xl bg-mist p-3 dark:bg-white/5">
      <p className="text-sm font-bold">
        {r.name} <span className="font-normal text-muted dark:text-slate-400">{observed ? "· vs real airport reports" : "· vs model estimate"}</span>
      </p>
      <p className="mt-1 text-sm">
        Rain or no rain called right on <strong className="text-teal-ink dark:text-teal-soft">{r.rain.agreePct}%</strong> of {r.rain.days} days
        {r.tempMaeC !== null ? (
          <>
            {" "}
            · temperature off by <strong>{r.tempMaeC} °C</strong> on average
          </>
        ) : null}
        .
      </p>
      <p className="text-xs text-muted dark:text-slate-400">
        {r.rain.rainDaysSeen} rain days · {r.rain.missed} missed · {r.rain.falseAlarms} false alarm{r.rain.falseAlarms === 1 ? "" : "s"}
      </p>
    </li>
  );
}

/** "How right were the forecasts?" — the day-before forecast checked against what happened, last 30 days. */
export function AccuracyCard({ location, full = false }: { location?: Locality; full?: boolean }) {
  if (!accuracyReady()) {
    return full ? (
      <section className="card">
        <h2 className="label">How right were the forecasts?</h2>
        <p className="mt-2 text-sm text-muted dark:text-slate-400">The first scores appear after the daily accuracy check runs.</p>
      </section>
    ) : null;
  }
  const key = location ? climateKeyFor(location) : null;
  const regions = full ? Object.entries(ACC.regions) : Object.entries(ACC.regions).filter(([k]) => k === key);
  const airports = Object.values(ACC.airports).filter((a) => full || (location && (a.region === key || (location.island === "rodrigues") === (a.region === "rodrigues"))));
  return (
    <section className="card" aria-labelledby="acc-title">
      <h2 id="acc-title" className="label">
        How right were the forecasts? · last {ACC.days} days
      </h2>
      <ul className="mt-2 space-y-2">
        {airports.slice(0, full ? 9 : 1).map((a) => (
          <Line key={a.name} r={a} observed />
        ))}
        {regions.map(([k, r]) => (
          <Line key={k} r={r} />
        ))}
      </ul>
      <p className="mt-2 text-[11px] text-muted dark:text-slate-400">
        We check the forecast made the day before against what happened. Airport scores use real weather reports; area scores compare with the model&apos;s own latest estimate, not rain gauges. Updated {ACC.builtAt ? formatUtcAsMU(ACC.builtAt) : "—"}.{" "}
        {!full && (
          <Link href="/climate#accuracy" className="underline">
            All areas
          </Link>
        )}
      </p>
    </section>
  );
}
