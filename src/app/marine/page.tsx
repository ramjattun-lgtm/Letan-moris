"use client";

import { useState } from "react";
import { useAppState } from "@/components/AppState";
import { BEACH_IDS, getLocality } from "@/data/localities";
import { useApi } from "@/lib/client/useApi";
import type { Forecast, MarineForecast } from "@/lib/weather/types";
import { DataFreshness, ErrorBanner, Skeleton } from "@/components/Status";
import { compass, fmt } from "@/lib/weather/weather-codes";
import { dayLabel, hhmm, hourStart, nowMU } from "@/lib/time";
import { assessDay } from "@/lib/weather/intelligence/decision-engine.service";

export default function MarinePage() {
  const { island, ready } = useAppState();
  const beaches = BEACH_IDS.map((id) => getLocality(id)!).filter((b) => b.island === island);
  const [beachId, setBeachId] = useState<string | null>(null);
  const current = beaches.find((b) => b.id === beachId) ?? beaches[0];
  const marine = useApi<MarineForecast>(ready && current ? `/api/marine?loc=${current.id}` : null);
  const weather = useApi<Forecast>(ready && current ? `/api/forecast?loc=${current.id}` : null);
  const m = marine.data;
  const start = hourStart(nowMU());
  const nextHours = m ? m.hourly.filter((h) => h.time >= start).filter((_, i) => i % 3 === 0).slice(0, 8) : [];
  const now = nextHours[0];
  const beachVerdict = weather.data ? assessDay(weather.data.hourly, weather.data.daily, start.slice(0, 10), 0).find((a) => a.id === "beach") : null;

  return (
    <>
      <h1 className="mb-3 font-[family-name:var(--font-display)] text-2xl font-extrabold">Marine &amp; beaches — {island === "rodrigues" ? "Rodrigues" : "Mauritius"}</h1>
      <div className="mb-4 rounded-2xl bg-coral/15 px-4 py-3 text-sm">
        <strong>Weather suitability is not swimming safety.</strong> These are open-sea model values. Conditions inside lagoons, near reefs and passes can be very different. Always follow lifeguard flags, local advice and official sea warnings from MMS.
      </div>
      <div role="group" aria-label="Choose beach" className="scroll-x mb-4">
        {beaches.map((b) => (
          <button key={b.id} type="button" aria-pressed={current?.id === b.id} onClick={() => setBeachId(b.id)} className={`min-h-10 shrink-0 rounded-full px-4 text-sm font-semibold ${current?.id === b.id ? "bg-navy text-white dark:bg-teal-soft dark:text-navy" : "bg-white text-muted ring-1 ring-navy/10 dark:bg-night-card dark:text-slate-300"}`}>
            {b.name}
          </button>
        ))}
      </div>
      <ErrorBanner error={marine.error} hasData={!!m} savedAt={marine.savedAt} />
      {!m ? (
        marine.loading || !ready ? <Skeleton className="h-80" /> : null
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <section className="card">
            <h2 className="label">Sea now (model) — {current?.name}</h2>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {[
                ["Wave height", fmt(now?.waveHeight ?? null, " m", 1)],
                ["Wave direction", `from ${compass(now?.waveDirection ?? null)}`],
                ["Wave period", fmt(now?.wavePeriod ?? null, " s", 0)],
                ["Swell", fmt(now?.swellHeight ?? null, " m", 1)],
                ["Sea temperature", fmt(now?.seaTemperature ?? null, "°C", 1)],
                ["Wind", weather.data ? `${fmt(weather.data.current.windSpeed, " km/h")} from ${compass(weather.data.current.windDirection)}` : "—"],
              ].map(([k, v]) => (
                <div key={k} className="rounded-2xl bg-mist px-3 py-2 dark:bg-white/5">
                  <div className="label">{k}</div>
                  <div className="text-lg font-bold">{v}</div>
                </div>
              ))}
            </div>
            {nextHours.every((h) => h.waveHeight === null) && <p className="mt-2 text-sm text-muted">No wave data for this point — the marine model may treat it as land. Values are left blank rather than guessed.</p>}
            <DataFreshness provenance={m.provenance} savedAt={marine.savedAt} stale={!!marine.error} />
            <p className="text-[11px] text-muted dark:text-slate-400">{m.provenance.resolutionNote}</p>
          </section>
          <section className="card">
            <h2 className="label">Beach weather today</h2>
            {beachVerdict ? (
              <>
                <p className="mt-2 text-lg font-bold">{beachVerdict.summary}</p>
                <ul className="mt-2 list-disc pl-5 text-sm text-muted dark:text-slate-400">
                  {beachVerdict.reasons.map((r) => (
                    <li key={r}>{r}</li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="mt-2 text-sm text-muted">{weather.error ? "Weather forecast unavailable." : "Loading…"}</p>
            )}
            <h2 className="label mt-4">Waves — next 24 hours</h2>
            <ul className="mt-2 grid grid-cols-4 gap-2 text-center text-sm">
              {nextHours.map((h) => (
                <li key={h.time} className="rounded-2xl bg-mist px-1 py-2 dark:bg-white/5">
                  <div className="text-[11px] text-muted dark:text-slate-400">{h.time.slice(0, 10) === start.slice(0, 10) ? hhmm(h.time) : `${dayLabel(h.time.slice(0, 10)).slice(0, 3)} ${hhmm(h.time)}`}</div>
                  <div className="font-bold">{fmt(h.waveHeight, " m", 1)}</div>
                  <div className="text-[11px]">{fmt(h.wavePeriod, " s")}</div>
                </li>
              ))}
            </ul>
          </section>
        </div>
      )}
    </>
  );
}
