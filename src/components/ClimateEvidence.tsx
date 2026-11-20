"use client";

import { useState } from "react";
import rainHours from "@/data/rain-hours.json";
import { useApi } from "@/lib/client/useApi";
import { timingSentence } from "@/lib/weather/intelligence/rain-timing";
export { timingSentence };

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const FULL = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

interface RainHours {
  builtAt: string | null;
  period: string;
  wetMm: number;
  regionSource: string;
  airportSource: string;
  regions: Record<string, { chance: (number | null)[][]; meanMm: (number | null)[][] }>;
  airports: Record<string, { name: string; island: string; reports: number; chance: (number | null)[][] }>;
}
const RH = rainHours as unknown as RainHours;

const cellColor = (p: number | null, max: number) => (p === null ? "#E7EEF2" : `rgba(47,125,225,${0.08 + 0.92 * Math.min(1, p / Math.max(1, max))})`);
const hh = (h: number) => `${String(h).padStart(2, "0")}:00`;

function Heat({ grid, month, onMonth }: { grid: (number | null)[][]; month: number; onMonth: (m: number) => void }) {
  const max = Math.max(...grid.flat().filter((x): x is number => x !== null), 1);
  return (
    <div className="overflow-x-auto">
      <table className="border-separate text-[9px]" style={{ borderSpacing: 1 }}>
        <thead>
          <tr>
            <th />
            {Array.from({ length: 24 }, (_, h) => (
              <th key={h} className="w-3 font-normal text-muted">{h % 3 === 0 ? h : ""}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {grid.map((row, m) => (
            <tr key={m} onClick={() => onMonth(m)} className="cursor-pointer">
              <td className={`pr-1 text-right ${m === month ? "font-bold text-navy dark:text-white" : "text-muted"}`}>{MONTHS[m]}</td>
              {row.map((p, h) => (
                <td key={h} title={`${MONTHS[m]} ${hh(h)}: ${p ?? "—"}%`} style={{ background: cellColor(p, max), outline: m === month ? "1px solid #0B2A3C" : undefined }} className="h-3 w-3 rounded-[2px]" />
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** "When does it usually rain here?" — by hour and month, model-based per region and observed at the airport. */
export function RainTiming({ regionKey, regionLabel, island }: { regionKey: string; regionLabel: string; island: "mauritius" | "rodrigues" }) {
  const [month, setMonth] = useState(() => Number(new Date().toLocaleString("en-GB", { month: "numeric", timeZone: "Indian/Mauritius" })) - 1);
  const reg = RH.regions[regionKey];
  const airport = Object.entries(RH.airports).find(([, a]) => a.island === island);
  if (!RH.builtAt || !reg) {
    return (
      <section className="card lg:col-span-2">
        <h2 className="label">When does it usually rain here?</h2>
        <p className="mt-2 text-sm text-muted">Appears once the &quot;Rain timing history&quot; job has run on GitHub (about 30 minutes).</p>
      </section>
    );
  }
  const row = reg.chance[month];
  const max = Math.max(...row.filter((x): x is number => x !== null), 1);
  const sentence = timingSentence(row, regionLabel, month);
  const obs = airport ? airport[1].chance[month] : null;
  const obsSentence = airport && obs ? timingSentence(obs, `${airport[1].name.split(" (")[0]} airport`, month) : null;
  return (
    <section className="card lg:col-span-2" aria-labelledby="timing">
      <h2 id="timing" className="label">When does it usually rain here? · {regionLabel}</h2>
      <div role="group" aria-label="Month" className="scroll-x mt-2">
        {MONTHS.map((m, i) => (
          <button key={m} type="button" aria-pressed={i === month} onClick={() => setMonth(i)} className={`min-h-9 shrink-0 rounded-full px-3 text-xs font-semibold ${i === month ? "bg-navy text-white dark:bg-teal-soft dark:text-navy" : "bg-mist text-muted dark:bg-white/10"}`}>
            {m}
          </button>
        ))}
      </div>
      {sentence && <p className="mt-2 text-base font-semibold">{sentence}</p>}
      <div className="mt-2 flex h-28 items-end gap-[2px]" role="img" aria-label={`Chance of rain by hour in ${FULL[month]}`}>
        {row.map((p, h) => (
          <div key={h} className="flex h-full flex-1 flex-col items-center justify-end">
            <div className="w-full rounded-t bg-rain" style={{ height: `${p === null ? 0 : Math.max(2, (p / max) * 100)}%`, opacity: h >= 6 && h <= 21 ? 1 : 0.45 }} title={`${hh(h)}: ${p ?? "—"}%`} />
          </div>
        ))}
      </div>
      <div className="flex justify-between text-[10px] text-muted">
        <span>00</span><span>06</span><span>12</span><span>18</span><span>23</span>
      </div>
      <p className="mt-1 text-[11px] text-muted dark:text-slate-400">% of hours with at least {RH.wetMm} mm of rain, {RH.period}. Night hours are faded.</p>

      {obs && airport && (
        <div className="mt-3 rounded-2xl bg-mist p-3 dark:bg-white/5">
          <p className="text-sm font-bold">Observed at {airport[1].name}</p>
          {obsSentence && <p className="text-sm">{obsSentence}</p>}
          <div className="mt-1 flex h-16 items-end gap-[2px]">
            {obs.map((p, h) => (
              <div key={h} className="flex h-full flex-1 flex-col justify-end">
                <div className="w-full rounded-t bg-teal" style={{ height: `${p === null ? 0 : Math.max(2, (p / Math.max(1, ...obs.filter((x): x is number => x !== null))) * 100)}%` }} title={`${hh(h)}: ${p ?? "—"}%`} />
              </div>
            ))}
          </div>
          <div className="flex justify-between text-[10px] text-muted">
            <span>00</span><span>06</span><span>12</span><span>18</span><span>23</span>
          </div>
          <p className="mt-1 text-[11px] text-muted dark:text-slate-400">
            % of weather reports mentioning rain, drizzle, showers or thunder ({airport[1].reports.toLocaleString()} reports). Real observations — the best check of the model pattern above.
          </p>
        </div>
      )}

      <details className="mt-3">
        <summary className="cursor-pointer text-sm font-semibold">Whole year at a glance</summary>
        <div className="mt-2">
          <Heat grid={reg.chance} month={month} onMonth={setMonth} />
          <p className="mt-1 text-[11px] text-muted dark:text-slate-400">Rows = months, columns = hours (0–23). Darker blue = rain more likely. Tap a month.</p>
        </div>
      </details>
      <p className="mt-2 text-[11px] text-muted dark:text-slate-400">
        Region pattern: {RH.regionSource} — global models tend to start tropical showers a little too early in the day, so compare with the airport. Airport: {RH.airportSource}.
      </p>
    </section>
  );
}

interface ClimateValidation {
  days: number;
  skillVsFlatPct: number;
  bins: { from: number; to: number; said: number | null; rained: number | null; days: number }[];
}
interface AnalogueValidation {
  cases: number;
  analogueErrorPct: number;
  assumeNormalErrorPct: number;
  beatsNormalPct: number;
  correlation: number;
  drierCallHitPct: number | null;
  drierBaseRatePct: number;
  method: string;
}

/** "Does history help?" — the app testing its own use of past data. */
export function HistoryCheck({ v, regionLabel }: { v: ClimateValidation | null | undefined; regionLabel: string }) {
  const api = useApi<{ analogues: AnalogueValidation | null }>("/api/validation");
  const a = api.data?.analogues ?? null;
  const helpful = a ? a.analogueErrorPct < a.assumeNormalErrorPct - 1 : null;
  return (
    <section className="card lg:col-span-2" aria-labelledby="hist-check">
      <h2 id="hist-check" className="label">Does history help? Our own test</h2>
      <p className="mt-1 text-sm">We replay the past: each year is hidden in turn and &quot;predicted&quot; from all the other years only, then checked against what really happened.</p>

      <h3 className="mt-3 text-sm font-bold">1. &quot;Chance of a rainy day&quot; from history · {regionLabel}</h3>
      {v ? (
        <>
          <p className="text-sm">
            Knowing the time of year makes rain chances <strong>{v.skillVsFlatPct}% more accurate</strong> than using one average for the whole year
            {v.skillVsFlatPct >= 10 ? " — the season really matters." : v.skillVsFlatPct > 0 ? " — a modest gain." : " — no gain here."}
          </p>
          <table className="mt-2 w-full text-xs [&_td]:py-1 [&_th]:text-left">
            <thead>
              <tr className="text-muted"><th>History said</th><th>It actually rained</th><th>Days tested</th></tr>
            </thead>
            <tbody>
              {v.bins.map((b) => (
                <tr key={b.from} className="border-t border-navy/5 dark:border-white/5">
                  <td>{b.said}%</td>
                  <td>
                    <strong>{b.rained}%</strong> {b.said !== null && b.rained !== null && Math.abs(b.said - b.rained) <= 7 ? "✓" : ""}
                  </td>
                  <td>{b.days.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-[11px] text-muted dark:text-slate-400">✓ = within 7 points: when history says 30%, it should rain on about 30% of those days. {v.days.toLocaleString()} days tested.</p>
        </>
      ) : (
        <p className="text-sm text-muted">Appears once the &quot;Climate history&quot; job has run again.</p>
      )}

      <h3 className="mt-3 text-sm font-bold">2. &quot;Similar years&quot; for the next 3 months of rain (reservoir catchments)</h3>
      {a ? (
        <>
          <p className="text-sm">
            {helpful ? (
              <>
                Similar years were <strong>closer to what happened in {a.beatsNormalPct}% of cases</strong> than simply assuming normal rain (average error {a.analogueErrorPct} vs {a.assumeNormalErrorPct} points).
              </>
            ) : (
              <>
                Similar years were <strong>no better than simply assuming normal rain</strong> (average error {a.analogueErrorPct} vs {a.assumeNormalErrorPct} points). We show them as context, not as a prediction.
              </>
            )}
          </p>
          {a.drierCallHitPct !== null && (
            <p className="text-sm">
              When similar years pointed to a drier-than-normal 3 months, it was drier {a.drierCallHitPct}% of the time (vs {a.drierBaseRatePct}% by chance).
            </p>
          )}
          <p className="text-[11px] text-muted dark:text-slate-400">
            {a.cases.toLocaleString()} tests ({a.method}). Link between the last 6 months and the next 3: {a.correlation} (0 = none, 1 = perfect).
          </p>
        </>
      ) : (
        <p className="text-sm text-muted">{api.loading ? "Loading…" : "Appears once the \"Reservoir rain history\" job has run."}</p>
      )}
      <p className="mt-2 text-[11px] text-muted dark:text-slate-400">The weather forecast itself is checked separately every day on the Today page (&quot;How did the forecast do?&quot;).</p>
    </section>
  );
}
