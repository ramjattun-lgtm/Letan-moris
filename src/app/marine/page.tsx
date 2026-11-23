"use client";

import { SeaWarmthCard } from "@/components/SeaWarmthCard";
import { useState } from "react";
import { useAppState } from "@/components/AppState";
import { BEACH_IDS, getLocality } from "@/data/localities";
import { useApi } from "@/lib/client/useApi";
import type { Forecast, MarineForecast } from "@/lib/weather/types";
import { DataFreshness, ErrorBanner, Skeleton } from "@/components/Status";
import { compass, describeCode, fmt } from "@/lib/weather/weather-codes";
import { addDays, dayLabel, hhmm, hourStart, nowMU, shortDay } from "@/lib/time";
import { WeatherIcon } from "@/components/WeatherIcon";
import { tr } from "@/lib/i18n";
import {
  BEACH_FACING,
  beachHours,
  beachReason,
  bestWindow,
  blockSummary,
  rating,
  RATING_LABEL,
  type BeachRating,
  type WindSide,
} from "@/lib/weather/intelligence/beach.service";

type Ranking = { beaches: { id: string; name: string; dayScore: number | null; bestWindow: { from: number; to: number; score: number } | null; reason: string }[] };

const RATING_CLS: Record<BeachRating, string> = {
  excellent: "bg-teal text-white",
  good: "bg-teal/15 text-teal-ink dark:text-teal-soft",
  fair: "bg-coral/25 text-coral-ink dark:text-coral",
  poor: "bg-rain/15 text-rain dark:text-rain-soft",
};
const SIDE_LABEL: Record<WindSide, string> = { onshore: "onshore", offshore: "offshore", "cross-shore": "cross-shore" };
const h2 = (n: number) => `${String(n).padStart(2, "0")}:00`;

function ScoreChip({ score }: { score: number | null }) {
  const r = rating(score);
  if (!r) return <span className="chip bg-navy/10 text-muted">{tr("No data")}</span>;
  return (
    <span className={`chip ${RATING_CLS[r]}`}>
      {tr(RATING_LABEL[r])} · {tr((score?.toFixed(1)) ?? "")}
    </span>
  );
}

export default function BeachSeaPage() {
  const { island, ready } = useAppState();
  const beaches = BEACH_IDS.map((id) => getLocality(id)!).filter((b) => b.island === island);
  const [beachId, setBeachId] = useState<string | null>(null);
  const [day, setDay] = useState(0);
  const current = beaches.find((b) => b.id === beachId) ?? beaches[0];
  const ranking = useApi<Ranking>(ready ? `/api/beaches?island=${island}` : null);
  const marine = useApi<MarineForecast>(ready && current ? `/api/marine?loc=${current.id}` : null);
  const weather = useApi<Forecast>(ready && current ? `/api/forecast?loc=${current.id}` : null);
  const today = nowMU().slice(0, 10);
  const date = addDays(today, day);
  const facing = current ? BEACH_FACING[current.id] ?? 270 : 270;
  const f = weather.data;
  const m = marine.data;
  const hours = f ? beachHours(f.hourly, m?.hourly ?? [], facing, date, 6, 19) : [];
  const blocks = blockSummary(hours);
  const best = bestWindow(hours);
  const dayInfo = f?.daily.find((d) => d.date === date);
  const seaNow = m?.hourly.find((h) => h.time === hourStart(nowMU())) ?? m?.hourly[0];

  return (
    <>
      <h1 className="mb-3 font-[family-name:var(--font-display)] text-2xl font-extrabold">{tr("Beach & Sea —")} {tr(island === "rodrigues" ? "Rodrigues" : "Mauritius")}</h1>
      <div className="mb-4 rounded-2xl bg-coral/15 px-4 py-3 text-sm">
        <strong>{tr("Good beach weather is not the same as safe swimming.")}</strong> {tr("Wave figures are open-sea model values; lagoons, reefs and passes can be very different. Follow lifeguard flags, local advice and official sea warnings from MMS.")}
      </div>

      <SeaWarmthCard />

      <section className="card mb-4" aria-labelledby="best">
        <h2 id="best" className="label">{tr("Best beaches today")}</h2>
        {!ranking.data ? (
          ranking.error ? <p className="mt-2 text-sm text-muted">{tr("Ranking unavailable right now.")}</p> : <Skeleton className="mt-2 h-24" />
        ) : (
          <ol className="mt-2 space-y-2">
            {ranking.data.beaches.slice(0, island === "rodrigues" ? 4 : 5).map((b, i) => (
              <li key={b.id}>
                <button type="button" onClick={() => { setBeachId(b.id); setDay(0); }} className="flex w-full items-start gap-3 rounded-2xl bg-mist p-3 text-left hover:bg-mist/70 dark:bg-white/5">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-navy font-bold text-white dark:bg-teal-soft dark:text-navy">{i + 1}</span>
                  <span className="flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <strong>{tr(b.name)}</strong>
                      <ScoreChip score={b.dayScore} />
                    </span>
                    <span className="block text-sm">{tr(b.bestWindow ? `Best ${h2(b.bestWindow.from)}–${h2(b.bestWindow.to)}` : tr("No good 2-hour window left today"))}</span>
                    <span className="block text-xs text-muted dark:text-slate-400">{tr(b.reason)}</span>
                  </span>
                </button>
              </li>
            ))}
          </ol>
        )}
        <p className="mt-2 text-[11px] text-muted dark:text-slate-400">{tr("Beach score 0–10 from rain, wind on that beach (onshore or sheltered), cloud, warmth and waves, for the rest of today.")}</p>
      </section>

      <div role="group" aria-label={tr("Choose beach")} className="scroll-x mb-3">
        {beaches.map((b) => (
          <button key={b.id} type="button" aria-pressed={current?.id === b.id} onClick={() => setBeachId(b.id)} className={`min-h-10 shrink-0 rounded-full px-4 text-sm font-semibold ${current?.id === b.id ? "bg-navy text-white dark:bg-teal-soft dark:text-navy" : "bg-white text-muted ring-1 ring-navy/10 dark:bg-night-card dark:text-slate-300"}`}>
            {tr(b.name)}
          </button>
        ))}
      </div>
      <div role="group" aria-label={tr("Choose day")} className="scroll-x mb-4">
        {Array.from({ length: 7 }, (_, i) => (
          <button key={i} type="button" aria-pressed={day === i} onClick={() => setDay(i)} className={`min-h-9 shrink-0 rounded-full px-3 text-sm font-semibold ${day === i ? "bg-teal text-white" : "bg-white text-muted ring-1 ring-navy/10 dark:bg-night-card dark:text-slate-300"}`}>
            {tr(i === 0 ? "Today" : shortDay(addDays(today, i)))}
          </button>
        ))}
      </div>

      <ErrorBanner error={weather.error} hasData={!!f} savedAt={weather.savedAt} />
      {!f ? (
        weather.loading || !ready ? <Skeleton className="h-96" /> : null
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <section className="card">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-bold">
                {tr(current?.name)} · {tr(dayLabel(date))}
              </h2>
              <ScoreChip score={hours.length ? Math.round(((hours.filter((h) => h.score !== null).reduce((a, h) => a + (h.score ?? 0), 0) / Math.max(1, hours.filter((h) => h.score !== null).length)) * 10)) / 10 : null} />
            </div>
            <p className="mt-1 text-sm">{best ? <>{tr("Best time:")} <strong>{tr(h2(best.from))}–{tr(h2(best.to))}</strong>. </> : tr("No good 2-hour window. ")}{tr((() => { const r = beachReason(hours); return r.charAt(0).toUpperCase() + r.slice(1); })())}.</p>
            <p className="mt-1 text-xs text-muted dark:text-slate-400">{tr("This beach faces")} {tr(compass(facing))}{tr(". Wind from the")} {tr(compass(facing))} {tr("blows onshore (choppier); wind from the land is offshore (calmer water, but take care with inflatables).")}</p>
            <ul className="mt-3 grid grid-cols-3 gap-2 text-center">
              {blocks.map((b) => (
                <li key={b.key} className="rounded-2xl bg-mist p-2 dark:bg-white/5">
                  <div className="text-xs font-semibold text-muted dark:text-slate-400">{tr(b.label)}</div>
                  <div className="my-1"><ScoreChip score={b.score} /></div>
                  <div className="text-xs">{tr(fmt(b.temp, "°"))} {tr("· rain")} {tr(fmt(b.rainProb, "%"))}</div>
                  <div className="text-xs">{tr("wind")} {tr(fmt(b.wind, ""))} {tr("km/h")} {tr(b.side ? SIDE_LABEL[b.side] : "")}</div>
                  <div className="text-xs">{tr("UV")} {tr(fmt(b.uv))}</div>
                </li>
              ))}
            </ul>
            {dayInfo && (
              <p className="mt-3 text-sm">
                {tr("Sunrise")} {tr(hhmm(dayInfo.sunrise))} {tr("· sunset")} <strong>{tr(hhmm(dayInfo.sunset))}</strong> {tr("· max UV")} {tr(fmt(dayInfo.uvIndexMax))}
              </p>
            )}
          </section>

          <section className="card">
            <h2 className="label">{tr("Sea (open-water model)")}</h2>
            {m ? (
              <>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {[
                    ["Waves now", `${fmt(seaNow?.waveHeight ?? null, " m", 1)} · ${fmt(seaNow?.wavePeriod ?? null, " s")}`],
                    ["From", compass(seaNow?.waveDirection ?? null)],
                    ["Swell", fmt(seaNow?.swellHeight ?? null, " m", 1)],
                    ["Sea temperature", fmt(seaNow?.seaTemperature ?? null, "°C", 1)],
                  ].map(([k, v]) => (
                    <div key={k} className="rounded-2xl bg-mist px-3 py-2 dark:bg-white/5">
                      <div className="label">{tr(k)}</div>
                      <div className="text-lg font-bold">{tr(v)}</div>
                    </div>
                  ))}
                </div>
                <p className="mt-2 text-[11px] text-muted dark:text-slate-400">{tr(m.provenance.resolutionNote)} {tr("Missing values are left blank, never guessed.")}</p>
              </>
            ) : (
              <p className="mt-2 text-sm text-muted">{tr(marine.error ? tr("Sea data unavailable right now.") : "Loading…")}</p>
            )}
          </section>

          <section className="card lg:col-span-2">
            <h2 className="label">{tr("Hour by hour ·")} {tr(dayLabel(date))}</h2>
            <div className="mt-2 overflow-x-auto">
              <table className="w-full whitespace-nowrap text-sm [&_td]:px-1.5 [&_th]:px-1.5">
                <thead>
                  <tr className="text-left text-xs text-muted dark:text-slate-400">
                    <th>{tr("Time")}</th><th>{tr("Sky")}</th><th>{tr("Score")}</th><th>{tr("Temp")}</th><th>{tr("Rain")}</th><th>{tr("Wind")}</th><th>{tr("UV")}</th><th>{tr("Waves")}</th>
                  </tr>
                </thead>
                <tbody>
                  {hours.map((h) => (
                    <tr key={h.time} className="border-t border-navy/5 dark:border-white/5">
                      <td className="py-1.5 font-semibold">{tr(hhmm(h.time))}</td>
                      <td><WeatherIcon kind={describeCode(h.weatherCode).icon} size={26} /><span className="sr-only">{tr(describeCode(h.weatherCode).label)}</span></td>
                      <td>{tr(h.score === null ? "—" : h.score.toFixed(1))}</td>
                      <td>{tr(fmt(h.temp, "°"))}</td>
                      <td>{tr(fmt(h.rainProb, "%"))}</td>
                      <td>
                        {tr(fmt(h.wind, ""))} {tr(h.windDir)}
                        {h.side && <span className="ml-1 text-xs text-muted dark:text-slate-400">{tr(SIDE_LABEL[h.side])}</span>}
                      </td>
                      <td>{tr(fmt(h.uv))}</td>
                      <td>{tr(fmt(h.waveHeight, " m", 1))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-1 text-[11px] text-muted dark:text-slate-400">{tr("Wind in km/h, from the direction shown. Score 8+ excellent, 6–8 good, 4–6 fair, below 4 poor.")}</p>
          </section>

          <section className="card lg:col-span-2">
            <h2 className="label">{tr("7-day beach outlook ·")} {tr(current?.name)}</h2>
            <ul className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {f.daily.map((d, i) => {
                const hs = beachHours(f.hourly, m?.hourly ?? [], facing, d.date, 7, 18);
                const sc = hs.filter((h) => h.score !== null);
                const s = sc.length ? Math.round((sc.reduce((a, h) => a + (h.score ?? 0), 0) / sc.length) * 10) / 10 : null;
                const bw = bestWindow(hs);
                return (
                  <li key={d.date}>
                    <button type="button" onClick={() => setDay(i)} className="flex w-full items-center gap-3 rounded-2xl bg-mist p-2.5 text-left dark:bg-white/5">
                      <WeatherIcon kind={describeCode(d.weatherCode).icon} size={36} />
                      <span className="flex-1">
                        <span className="block font-semibold">{tr(dayLabel(d.date))}</span>
                        <span className="block text-xs text-muted dark:text-slate-400">
                          {tr(fmt(d.tempMax, "°"))} {tr("· rain")} {tr(fmt(d.rainProbabilityMax, "%"))} {tr("· wind")} {tr(fmt(d.windSpeedMax, ""))} {tr("km/h")} {tr(bw ? `· best ${h2(bw.from)}–${h2(bw.to)}` : "")}
                        </span>
                      </span>
                      <ScoreChip score={s} />
                    </button>
                  </li>
                );
              })}
            </ul>
            <p className="mt-1 text-[11px] text-muted dark:text-slate-400">{tr("Days 4–7 are less certain.")}</p>
            <DataFreshness provenance={f.provenance} savedAt={weather.savedAt} stale={!!weather.error} />
          </section>
        </div>
      )}
    </>
  );
}
