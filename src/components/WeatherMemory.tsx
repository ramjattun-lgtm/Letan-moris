"use client";

import { useAppState } from "./AppState";
import { useApi } from "@/lib/client/useApi";
import { climateKeyFor } from "@/lib/weather/intelligence/climate.service";
import { memoryFacts } from "@/lib/weather/intelligence/memory.service";
import { todayMU } from "@/lib/time";
import { tr } from "@/lib/i18n";

interface PastDay {
  yearsAgo: number;
  date: string;
  tmax: number | null;
  tmin: number | null;
  rainMm: number | null;
}

const rainWord = (mm: number) => (mm < 0.2 ? "dry" : mm < 5 ? `${mm} mm of light rain` : mm < 20 ? `${mm} mm of rain` : `${mm} mm — a wet day`);

/** Weather Memory: this date in past years, cyclones around this date, and records set this month. */
export function WeatherMemory() {
  const { location, ready, t } = useAppState();
  const api = useApi<{ years: PastDay[]; source: string }>(ready ? `/api/memory?loc=${location.id}` : null);
  const today = todayMU();
  const facts = memoryFacts(climateKeyFor(location), location.island, today);
  const past = (api.data?.years ?? []).filter((y) => y.tmax !== null || y.rainMm !== null);
  if (!facts.length && !past.length) return null;
  return (
    <section className="card" aria-labelledby="memory-title">
      <h2 id="memory-title" className="label">
        {t("memory.title")}
      </h2>
      {past.length > 0 && (
        <ul className="mt-2 grid grid-cols-3 gap-2 text-center">
          {past.map((y) => (
            <li key={y.yearsAgo} className="rounded-2xl bg-mist p-2 dark:bg-white/5">
              <p className="text-xs font-semibold text-muted dark:text-slate-400">{tr(y.date.slice(0, 4))}</p>
              <p className="font-bold">{tr(y.tmax !== null ? `${Math.round(y.tmax)}°` : "—")}<span className="text-sm font-normal"> / {tr(y.tmin !== null ? `${Math.round(y.tmin)}°` : "—")}</span></p>
              <p className="text-[11px]">{tr(y.rainMm !== null ? rainWord(Math.round(y.rainMm * 10) / 10) : "—")}</p>
            </li>
          ))}
        </ul>
      )}
      {facts.length > 0 && (
        <ul className="mt-2 space-y-1.5 text-sm">
          {facts.map((f) => (
            <li key={f.id} className="flex gap-2">
              <span aria-hidden="true">{tr(f.icon)}</span>
              <span>{tr(f.text)}</span>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-2 text-[11px] text-muted dark:text-slate-400">{tr("Past days for")} {tr(location.name)}{tr(": ECMWF ERA5 reanalysis via Open-Meteo (model-based, ~25 km), not station records.")}</p>
    </section>
  );
}
