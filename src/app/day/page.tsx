"use client";

import { useEffect, useState } from "react";
import { useAppState } from "@/components/AppState";
import { LocationPicker } from "@/components/LocationPicker";
import { DecisionList } from "@/components/ForecastBlocks";
import { ConfidenceChip, DataFreshness, ErrorBanner, Skeleton } from "@/components/Status";
import { useApi } from "@/lib/client/useApi";
import type { Forecast } from "@/lib/weather/types";
import { assessDay } from "@/lib/weather/intelligence/decision-engine.service";
import { findRainPeriods } from "@/lib/weather/intelligence/rainfall-intelligence.service";
import { decayWithLeadTime } from "@/lib/weather/intelligence/confidence.service";
import { addDays, dayLabel, hhmm, todayMU } from "@/lib/time";
import { describeCode, fmt, uvLabel } from "@/lib/weather/weather-codes";
import { WeatherIcon } from "@/components/WeatherIcon";

export default function DayPage() {
  const { location, ready } = useAppState();
  const today = todayMU();
  const [date, setDate] = useState(today);
  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get("date");
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (q && /^\d{4}-\d{2}-\d{2}$/.test(q)) setDate(q);
  }, []);
  const api = useApi<Forecast>(ready ? `/api/forecast?loc=${location.id}` : null);
  const f = api.data;
  const days = Array.from({ length: 7 }, (_, i) => addDays(today, i));
  const ahead = days.indexOf(date);
  const day = f?.daily.find((d) => d.date === date);
  const periods = f ? findRainPeriods(f.hourly.filter((h) => h.time.startsWith(date) && Number(h.time.slice(11, 13)) >= 6 && Number(h.time.slice(11, 13)) < 21)) : [];

  return (
    <>
      <h1 className="mb-1 font-[family-name:var(--font-display)] text-2xl font-extrabold">My Weather Day</h1>
      <p className="mb-3 text-sm text-muted dark:text-slate-400">Pick a day and get a plan based on the forecast.</p>
      <LocationPicker />
      <div role="group" aria-label="Choose day" className="scroll-x mb-4">
        {days.map((d) => (
          <button key={d} type="button" aria-pressed={d === date} onClick={() => setDate(d)} className={`min-h-10 shrink-0 rounded-full px-4 text-sm font-semibold ${d === date ? "bg-navy text-white dark:bg-teal-soft dark:text-navy" : "bg-white text-muted ring-1 ring-navy/10 dark:bg-night-card dark:text-slate-300"}`}>
            {dayLabel(d)}
          </button>
        ))}
      </div>
      <ErrorBanner error={api.error} hasData={!!f} savedAt={api.savedAt} />
      {!f ? (
        api.loading || !ready ? <Skeleton className="h-96" /> : null
      ) : !day ? (
        <div className="card">No forecast available for this day.</div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[1fr_2fr]">
          <section className="card">
            <div className="flex items-center justify-between">
              <h2 className="label">{dayLabel(date)} · {location.name}</h2>
              <ConfidenceChip level={decayWithLeadTime("high", ahead)} />
            </div>
            <div className="mt-2 flex items-center gap-3">
              <WeatherIcon kind={describeCode(day.weatherCode).icon} size={72} />
              <div>
                <p className="text-3xl font-extrabold">{fmt(day.tempMin, "°")} / {fmt(day.tempMax, "°")}</p>
                <p className="font-semibold">{describeCode(day.weatherCode).label}</p>
              </div>
            </div>
            <ul className="mt-3 space-y-1 text-sm">
              <li>Rain: up to {fmt(day.rainProbabilityMax, "%")} chance, about {fmt(day.precipitationSum, " mm", 1)}</li>
              <li>
                Rain periods (06:00–21:00):{" "}
                {periods.length ? periods.map((p) => `${hhmm(p.start)}–${hhmm(p.end)}`).join(", ") : "none expected"}
              </li>
              <li>Wind: up to {fmt(day.windSpeedMax, " km/h")}, gusts {fmt(day.windGustsMax, " km/h")}</li>
              <li>UV: {fmt(day.uvIndexMax)} ({uvLabel(day.uvIndexMax)})</li>
              <li>Sun: {hhmm(day.sunrise)} – {hhmm(day.sunset)}</li>
            </ul>
            {ahead >= 3 && <p className="mt-3 rounded-xl bg-coral/15 p-2 text-xs">This day is {ahead} days away. Forecasts this far ahead often change — check again closer to the day.</p>}
            <DataFreshness provenance={f.provenance} savedAt={api.savedAt} stale={!!api.error} />
          </section>
          <DecisionList items={assessDay(f.hourly, f.daily, date, Math.max(0, ahead))} title="Your plan for the day" />
        </div>
      )}
    </>
  );
}
