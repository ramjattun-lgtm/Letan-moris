"use client";

import Link from "next/link";
import data from "@/data/accuracy.json";
import { climateKeyFor } from "@/lib/weather/intelligence/climate.service";
import type { Locality } from "@/data/localities";
import { formatUtcAsMU } from "@/lib/time";

interface RainScore {
  days: number;
  rainDaysSeen: number;
  missed: number;
  falseAlarms: number;
  /** New scoring (three steps, like the app's wording). */
  said?: { likely: { days: number; rained: number }; possible: { days: number; rained: number }; dry: { days: number; stayedDry: number } };
  clearCallPct?: number | null;
  /** Old scoring (two steps), kept so older files still display. */
  agreePct?: number;
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

/** One line on how reliable rain forecasts have been in this area lately (or null). */
export function trackRecord(location: Locality): string | null {
  const r = accuracyReady() ? ACC.regions[climateKeyFor(location)] : undefined;
  const sd = r?.rain?.said;
  if (!r?.rain || !sd || sd.likely.days === 0) return null;
  return `Track record in ${r.name}, last ${r.rain.days} days: when we said rain likely, it rained on ${sd.likely.rained} of ${sd.likely.days} days.`;
}

const days = (n: number) => `${n} day${n === 1 ? "" : "s"}`;

function Line({ r, observed }: { r: Row; observed?: boolean }) {
  const rain = r.rain;
  if (!rain) return null;
  const sd = rain.said;
  return (
    <li className="rounded-2xl bg-mist p-3 dark:bg-white/5">
      <p className="text-sm font-bold">
        {r.name} <span className="font-normal text-muted dark:text-slate-400">{observed ? "· vs real airport reports" : "· vs model estimate"}</span>
        {sd && rain.clearCallPct !== null && rain.clearCallPct !== undefined && (
          <span className="chip ml-1 bg-teal/15 text-teal-ink dark:text-teal-soft">{rain.clearCallPct}% of clear calls right</span>
        )}
      </p>
      {sd ? (
        <ul className="mt-1 space-y-0.5 text-sm">
          {sd.likely.days > 0 && (
            <li>
              Said <strong>rain likely</strong>: it rained on {sd.likely.rained} of {days(sd.likely.days)}.
            </li>
          )}
          {sd.dry.days > 0 && (
            <li>
              Said <strong>dry</strong>: it stayed dry on {sd.dry.stayedDry} of {days(sd.dry.days)}.
            </li>
          )}
          {sd.possible.days > 0 && (
            <li className="text-muted dark:text-slate-400">
              Said &quot;showers possible&quot; on {days(sd.possible.days)} — rain came on {sd.possible.rained}.
            </li>
          )}
        </ul>
      ) : (
        <p className="mt-1 text-sm">Rain or no rain called right on {rain.agreePct}% of {rain.days} days.</p>
      )}
      {r.tempMaeC !== null && (
        <p className="text-xs text-muted dark:text-slate-400">
          Temperature off by {r.tempMaeC} °C on average{observed ? " (one coastal spot vs a wider forecast area)" : ""}.
        </p>
      )}
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
        We check the forecast made the day before against what happened, using the same three steps as our wording: dry (under 0.5 mm), showers possible, rain likely (2 mm or more). A &quot;maybe&quot; can&apos;t be right or wrong, so clear calls are scored. Airport reports describe one spot; area scores compare with the model&apos;s own estimate, not rain gauges. Updated {ACC.builtAt ? formatUtcAsMU(ACC.builtAt) : "—"}.{" "}
        {!full && (
          <Link href="/climate#accuracy" className="underline">
            All areas
          </Link>
        )}
      </p>
    </section>
  );
}
