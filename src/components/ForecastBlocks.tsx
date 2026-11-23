"use client";

import Link from "next/link";
import type { Forecast } from "@/lib/weather/types";
import { compass, describeCode, fmt, uvLabel } from "@/lib/weather/weather-codes";
import { hhmm, hourStart, nowMU, shortDay } from "@/lib/time";
import { rainOutlook } from "@/lib/weather/intelligence/rainfall-intelligence.service";
import type { Assessment, Verdict } from "@/lib/weather/intelligence/decision-engine.service";
import { ConfidenceChip } from "./Status";
import { WeatherIcon } from "./WeatherIcon";
import { tr } from "@/lib/i18n";

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-2xl bg-mist px-3 py-2.5 dark:bg-white/5">
      <div className="label">{tr(label)}</div>
      <div className="mt-0.5 text-lg font-bold">{tr(value)}</div>
      {sub ? <div className="text-xs text-muted dark:text-slate-400">{tr(sub)}</div> : null}
    </div>
  );
}

export function CurrentCard({ f }: { f: Forecast }) {
  const c = f.current;
  const d = describeCode(c.weatherCode);
  const today = f.daily[0];
  const nowHour = f.hourly.find((h) => h.time === hourStart(nowMU()));
  return (
    <section className="card relative overflow-hidden" aria-labelledby="now-title">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 id="now-title" className="label">
            {tr("Now (model estimate,")} {tr(hhmm(c.time))})
          </h2>
          <div className="mt-1 flex items-end gap-2">
            <span className="font-[family-name:var(--font-display)] text-6xl font-extrabold tracking-tight">{tr(fmt(c.temperature, "°", 0))}</span>
            <span className="mb-2 text-sm text-muted dark:text-slate-400">{tr("feels like")} {tr(fmt(c.feelsLike, "°C"))}</span>
          </div>
          <p className="text-lg font-semibold">{tr(d.label)}</p>
          {today && (
            <p className="text-sm text-muted dark:text-slate-400">
              {tr("Today")} {tr(fmt(today.tempMin, "°"))} / {tr(fmt(today.tempMax, "°"))}
            </p>
          )}
        </div>
        <WeatherIcon kind={d.icon} night={c.isDay === false} size={96} animated />
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat label={tr("Rain chance")} value={fmt(nowHour?.rainProbability ?? null, "%")} sub={tr("this hour")} />
        <Stat label={tr("Wind")} value={fmt(c.windSpeed, " km/h")} sub={`from ${compass(c.windDirection)}`} />
        <Stat label={tr("Gusts")} value={fmt(c.windGusts, " km/h")} />
        <Stat label={tr("Humidity")} value={fmt(c.humidity, "%")} />
        <Stat label={tr("UV today")} value={fmt(today?.uvIndexMax ?? null, "", 0)} sub={uvLabel(today?.uvIndexMax ?? null)} />
        <Stat label={tr("Cloud")} value={fmt(c.cloudCover, "%")} />
        <Stat label={tr("Sunrise")} value={hhmm(today?.sunrise)} />
        <Stat label={tr("Sunset")} value={hhmm(today?.sunset)} />
      </div>
    </section>
  );
}

export function RainOutlookCard({ f, compact = false }: { f: Forecast; compact?: boolean }) {
  const o = rainOutlook(f.hourly);
  const wet = o.periods.length > 0;
  return (
    <section className={`card ${wet ? "ring-2 ring-rain/30" : ""}`} aria-labelledby="rain-title">
      <div className="flex items-center justify-between gap-2">
        <h2 id="rain-title" className="label">
          {tr("Rain outlook")}
        </h2>
        <ConfidenceChip level={o.confidence} />
      </div>
      <p className="mt-2 font-[family-name:var(--font-display)] text-xl font-bold leading-snug">{tr(o.headline)}</p>
      <p className="mt-1 text-sm text-muted dark:text-slate-400">{tr(o.detail)}</p>
      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        {[o.next3h, o.next6h, o.next24h].map((w) => (
          <div key={w.label} className="rounded-2xl bg-mist px-2 py-2 dark:bg-white/5">
            <div className="text-[11px] font-semibold text-muted dark:text-slate-400">{tr(w.label)}</div>
            <div className="text-lg font-bold text-rain dark:text-rain-soft">{tr(fmt(w.maxProbability, "%"))}</div>
            <div className="text-[11px] text-muted dark:text-slate-400">{tr(w.totalMm === null ? "—" : `${w.totalMm} mm`)}</div>
          </div>
        ))}
      </div>
      <p className="mt-2 text-[11px] text-muted dark:text-slate-400">
        {tr(o.resolutionNote)} {tr("Percentages are the highest hourly chance in each period.")}
        {compact ? (
          <>
            {" "}
            <Link href="/rain" className="font-semibold text-teal-ink underline dark:text-teal-soft">
              {tr("Full rain details")}
            </Link>
          </>
        ) : null}
      </p>
    </section>
  );
}

export function HourlyStrip({ f, hours = 24 }: { f: Forecast; hours?: number }) {
  const start = hourStart(nowMU());
  const list = f.hourly.filter((h) => h.time >= start).slice(0, hours);
  return (
    <section className="card" aria-labelledby="hourly-title">
      <h2 id="hourly-title" className="label">
        {tr("Next")} {hours} {tr("hours")}
      </h2>
      <ol className="scroll-x mt-3">
        {list.map((h, i) => {
          const d = describeCode(h.weatherCode);
          const hr = Number(h.time.slice(11, 13));
          return (
            <li key={h.time} className="relative flex min-w-16 flex-col items-center gap-1 rounded-2xl bg-mist px-2 py-2 text-center dark:bg-white/5">
              <span className="text-xs font-semibold text-muted dark:text-slate-400">{tr(i === 0 ? "Now" : hhmm(h.time))}</span>
              <WeatherIcon kind={d.icon} size={34} night={hr < 6 || hr >= 18} />
              <span className="sr-only">{tr(d.label)}</span>
              <span className="font-bold">{tr(fmt(h.temperature, "°"))}</span>
              <span className="text-xs font-semibold text-rain dark:text-rain-soft">{tr(fmt(h.rainProbability, "%"))}</span>
              <span className="text-[10px] text-muted dark:text-slate-400">{tr(h.precipitation === null ? "—" : h.precipitation >= 0.1 ? `${h.precipitation} mm` : "dry")}</span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

export function DailyList({ f }: { f: Forecast }) {
  const temps = f.daily.flatMap((d) => [d.tempMin, d.tempMax]).filter((x): x is number => x !== null);
  const lo = Math.min(...temps);
  const hi = Math.max(...temps);
  return (
    <section className="card" aria-labelledby="daily-title">
      <h2 id="daily-title" className="label">
        {tr("7-day forecast")}
      </h2>
      <ul className="mt-2 divide-y divide-navy/5 dark:divide-white/5">
        {f.daily.map((d) => {
          const desc = describeCode(d.weatherCode);
          const left = d.tempMin === null ? 0 : ((d.tempMin - lo) / Math.max(1, hi - lo)) * 100;
          const right = d.tempMax === null ? 100 : ((d.tempMax - lo) / Math.max(1, hi - lo)) * 100;
          return (
            <li key={d.date}>
              <Link href={`/day?date=${d.date}`} className="grid min-h-14 grid-cols-[3.5rem_2.5rem_1fr_auto] items-center gap-2 py-1.5 hover:bg-mist/60 dark:hover:bg-white/5">
                <span className="font-semibold">{tr(shortDay(d.date))}</span>
                <WeatherIcon kind={desc.icon} size={34} />
                <span className="flex items-center gap-2">
                  <span className="w-8 text-right text-sm text-muted dark:text-slate-400">{tr(fmt(d.tempMin, "°"))}</span>
                  <span className="relative h-1.5 flex-1 rounded-full bg-navy/10 dark:bg-white/10" aria-hidden="true">
                    <span className="absolute h-1.5 rounded-full bg-gradient-to-r from-teal to-coral" style={{ left: `${left}%`, right: `${100 - right}%` }} />
                  </span>
                  <span className="w-8 text-sm font-semibold">{tr(fmt(d.tempMax, "°"))}</span>
                </span>
                <span className="w-24 text-right text-xs">
                  <span className="block font-semibold text-rain dark:text-rain-soft">{tr(fmt(d.rainProbabilityMax, "%"))}</span>
                  <span className="text-muted dark:text-slate-400">{tr(d.precipitationSum === null ? "—" : `${d.precipitationSum} mm`)}</span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
      <p className="mt-2 text-[11px] text-muted dark:text-slate-400">{tr("Days 4–7 are less certain. Tap a day for your plan.")}</p>
    </section>
  );
}

export const VERDICT_STYLE: Record<Verdict, { label: string; cls: string }> = {
  good: { label: "Good", cls: "bg-teal/15 text-teal-ink dark:text-teal-soft" },
  fair: { label: "Fair", cls: "bg-coral/20 text-coral-ink dark:text-coral" },
  poor: { label: "Poor", cls: "bg-rain/15 text-rain dark:text-rain-soft" },
  unknown: { label: "No data", cls: "bg-navy/10 text-muted dark:bg-white/10 dark:text-slate-300" },
};

export function DecisionList({ items, title = "Plan your day" }: { items: Assessment[]; title?: string }) {
  return (
    <section className="card" aria-labelledby="decide-title">
      <h2 id="decide-title" className="label">
        {tr(title)}
      </h2>
      <ul className="mt-3 grid gap-2 sm:grid-cols-2">
        {items.map((a) => (
          <li key={a.id} className="rounded-2xl bg-mist p-3 dark:bg-white/5">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-bold">{tr(a.title)}</h3>
              <span className={`chip ${VERDICT_STYLE[a.verdict].cls}`}>{tr(VERDICT_STYLE[a.verdict].label)}</span>
            </div>
            <p className="mt-1 text-sm">{tr(a.summary)}</p>
            {a.id === "commute" && (
              <Link href="/drive" className="mt-2 inline-flex min-h-9 items-center gap-1 rounded-full bg-navy px-3 text-xs font-semibold text-white dark:bg-teal-soft dark:text-navy">
                {tr("🚗 Plan a trip: best time to leave →")}
              </Link>
            )}
            <details className="mt-1 text-xs text-muted dark:text-slate-400">
              <summary className="cursor-pointer font-semibold">{tr("Why? (")}{tr(a.period)})</summary>
              <ul className="mt-1 list-disc pl-4">
                {a.reasons.map((r) => (
                  <li key={r}>{tr(r)}</li>
                ))}
                <li>{tr(a.confidence === "high" ? "High" : a.confidence === "medium" ? "Medium" : "Low")} {tr("confidence.")}</li>
              </ul>
            </details>
          </li>
        ))}
      </ul>
    </section>
  );
}

