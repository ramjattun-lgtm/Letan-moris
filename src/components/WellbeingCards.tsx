"use client";

import Link from "next/link";
import { useApi } from "@/lib/client/useApi";
import { useAppState } from "./AppState";
import type { Forecast, HourlyPoint } from "@/lib/weather/types";
import { HEAT_ADVICE, HEAT_BANDS, heatDay, MOSQUITO_RULE, windowText, type HeatLevel, type MosquitoLevel } from "@/lib/weather/intelligence/wellbeing.service";
import { DARK_SITES, skyTonight } from "@/lib/weather/intelligence/sky.service";
import { hhmm } from "@/lib/time";
import { tr } from "@/lib/i18n";

const HEAT_TONE: Record<HeatLevel, string> = {
  low: "bg-teal/15 text-teal-ink",
  caution: "bg-[#F7D774] text-navy",
  high: "bg-coral text-navy",
  danger: "bg-[#D9480F] text-white",
};
const HEAT_LABEL: Record<HeatLevel, string> = { low: "Low", caution: "Caution", high: "High", danger: "Danger" };

/** Heat stress for outdoor work today (or a chosen day). Hidden on cool days. */
export function HeatCard({ hours, date, always }: { hours: HourlyPoint[]; date: string; always?: boolean }) {
  const h = heatDay(hours, date);
  if (!h.peak || (!always && h.peak.level === "low")) return null;
  const lvl = h.peak.level;
  return (
    <section className={`card ${lvl === "danger" || lvl === "high" ? "ring-2 ring-coral" : ""}`} aria-labelledby="heat-title">
      <div className="flex items-center justify-between gap-2">
        <h2 id="heat-title" className="label">{tr("Heat stress · outdoor work & sport")}</h2>
        <span className={`chip ${HEAT_TONE[lvl]}`}>{tr(HEAT_LABEL[lvl])}</span>
      </div>
      <p className={`mt-2 ${lvl === "low" ? "text-sm" : "text-base font-semibold"}`}>
        {tr("Feels like up to")} {h.peak.feels}{tr("°C around")} {tr(hhmm(h.peak.time))}.
        {tr(h.windows.length ? ` Take care ${h.windows.map((w) => `${windowText(w)} (${HEAT_LABEL[w.level].toLowerCase()})`).join(", ")}.` : "")}
      </p>
      <p className="mt-1 text-sm">{tr(HEAT_ADVICE[lvl])}</p>
      {h.uvMax !== null && h.uvMax >= 8 && <p className="mt-1 text-sm">{tr("UV up to")} {h.uvMax}{tr(": cover up, hat and sunscreen — sun adds to the heat load.")}</p>}
      <p className="mt-2 text-[11px] text-muted dark:text-slate-400">
        {tr("Based on the \"feels like\" temperature (heat and humidity), with bands after the US National Weather Service heat index: caution from")} {HEAT_BANDS.caution}{tr("°C, high from")} {HEAT_BANDS.high}{tr("°C, danger from")} {HEAT_BANDS.danger}{tr("°C. In full sun it feels hotter still. Not medical advice — in an emergency call 114 (SAMU).")}
      </p>
    </section>
  );
}

/** "Mosquito weather": shown only when warm, wet weather favours breeding. */
export function MosquitoCard() {
  const { location, ready } = useAppState();
  const api = useApi<{ rain14: number | null; temp14: number | null; level: MosquitoLevel | null; rainNext7: number | null }>(ready ? `/api/mosquito?loc=${location.id}` : null);
  const d = api.data;
  if (!d || !d.level || d.level === "low") return null;
  const high = d.level === "very-favourable";
  return (
    <section className="card" aria-labelledby="mos-title">
      <div className="flex items-center justify-between gap-2">
        <h2 id="mos-title" className="label">{tr("🦟 Mosquito weather")}</h2>
        <span className={`chip ${high ? "bg-coral text-navy" : "bg-[#F7D774] text-navy"}`}>{tr(high ? tr("Very favourable") : "Favourable")}</span>
      </div>
      <p className="mt-2 text-base font-semibold">
        {tr("About")} {d.rain14} {tr("mm of rain in the last 2 weeks and warm days (average")} {d.temp14}{tr("°C): good conditions for mosquitoes to breed.")}
      </p>
      <p className="mt-1 text-sm">{tr("This weekend: empty or cover anything holding water — buckets, tyres, plant saucers, gutters, coconut shells. Use repellent at dawn and dusk.")}</p>
      <p className="mt-2 text-[11px] text-muted dark:text-slate-400">
        {tr("A simple weather rule (")}{MOSQUITO_RULE.rain} {tr("mm+ of rain in 14 days and")} {MOSQUITO_RULE.temp}{tr("°C+ average; \"very\" from")} {MOSQUITO_RULE.rainHigh} {tr("mm and")} {MOSQUITO_RULE.tempHigh}{tr("°C). It is not a dengue or disease forecast. For health advice follow the")}{" "}
        <a className="underline" href="https://health.govmu.org/" target="_blank" rel="noreferrer">{tr("Ministry of Health and Wellness")}</a>.
      </p>
    </section>
  );
}

const SKY_TONE = { excellent: "bg-navy text-white", good: "bg-teal/20 text-teal-ink", fair: "bg-[#F7D774] text-navy", poor: "bg-mist text-muted" } as const;

/** Stargazing tonight. */
export function SkyCard({ f, date }: { f: Forecast; date: string }) {
  const { island } = useAppState();
  const s = skyTonight(f.hourly, date);
  if (!s) return null;
  return (
    <section className="card" aria-labelledby="sky-title">
      <div className="flex items-center justify-between gap-2">
        <h2 id="sky-title" className="label">{tr("✨ Stargazing tonight")}</h2>
        <span className={`chip capitalize ${SKY_TONE[s.verdict]}`}>{tr(s.verdict)}</span>
      </div>
      <p className="mt-2 text-base font-semibold">{tr(s.summary)}</p>
      {s.bestWindow && (
        <p className="text-sm">
          {tr("Best:")} {tr(hhmm(s.bestWindow.from))}–{tr(hhmm(s.bestWindow.to))} {tr("(about")} {s.bestWindow.cloud}{tr("% cloud).")}
        </p>
      )}
      <div className="mt-2 flex gap-0.5" aria-label={tr("Cloud cover by hour tonight")}>
        {s.hours.map((h) => (
          <div key={h.time} className="flex-1 text-center text-[10px]">
            <div className="mx-auto h-6 w-full rounded" style={{ background: h.cloud === null ? "#ccc" : `rgba(11,42,60,${0.15 + (1 - h.cloud / 100) * 0.85})` }} title={`${hhmm(h.time)}: ${h.cloud ?? "—"}% cloud`} />
            <div className="text-muted">{tr(hhmm(h.time).slice(0, 2))}</div>
          </div>
        ))}
      </div>
      <p className="mt-1 text-[11px] text-muted dark:text-slate-400">{tr("Darker = clearer sky.")}</p>
      <p className="mt-2 text-sm">
        🌙 {tr(s.moon.name)}, {s.moon.illumination}{tr("% lit.")}
      </p>
      <p className="mt-1 text-sm">{tr("Darker spots away from town lights:")} {tr(DARK_SITES[island].join("; "))}{tr(". Go with others, take a torch and park safely.")}</p>
    </section>
  );
}

export function ExploreLink() {
  return (
    <Link href="/explore" className="card flex items-center justify-between font-semibold text-teal-ink hover:bg-white/80 dark:text-teal-soft">
      <span>{tr("More tools — trip planner, event dates, stars, reservoirs…")}</span>
      <span aria-hidden="true">→</span>
    </Link>
  );
}
