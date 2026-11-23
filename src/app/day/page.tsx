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
import { ExploreLink, HeatCard, SkyCard } from "@/components/WellbeingCards";
import Link from "next/link";
import { tr } from "@/lib/i18n";

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
      <h1 className="mb-1 font-[family-name:var(--font-display)] text-2xl font-extrabold">{tr("My Weather Day")}</h1>
      <p className="mb-3 text-sm text-muted dark:text-slate-400">{tr("Pick a day and get a plan based on the forecast.")}</p>
      <LocationPicker />
      <div role="group" aria-label={tr("Choose day")} className="scroll-x mb-4">
        {days.map((d) => (
          <button key={d} type="button" aria-pressed={d === date} onClick={() => setDate(d)} className={`min-h-10 shrink-0 rounded-full px-4 text-sm font-semibold ${d === date ? "bg-navy text-white dark:bg-teal-soft dark:text-navy" : "bg-white text-muted ring-1 ring-navy/10 dark:bg-night-card dark:text-slate-300"}`}>
            {tr(dayLabel(d))}
          </button>
        ))}
      </div>
      <ErrorBanner error={api.error} hasData={!!f} savedAt={api.savedAt} />
      {!f ? (
        api.loading || !ready ? <Skeleton className="h-96" /> : null
      ) : !day ? (
        <div className="card">{tr("No forecast available for this day.")}</div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[1fr_2fr]">
          <section className="card">
            <div className="flex items-center justify-between">
              <h2 className="label">{tr(dayLabel(date))} · {tr(location.name)}</h2>
              <ConfidenceChip level={decayWithLeadTime("high", ahead)} />
            </div>
            <div className="mt-2 flex items-center gap-3">
              <WeatherIcon kind={describeCode(day.weatherCode).icon} size={72} />
              <div>
                <p className="text-3xl font-extrabold">{tr(fmt(day.tempMin, "°"))} / {tr(fmt(day.tempMax, "°"))}</p>
                <p className="font-semibold">{tr(describeCode(day.weatherCode).label)}</p>
              </div>
            </div>
            <ul className="mt-3 space-y-1 text-sm">
              <li>{tr("Rain: up to")} {tr(fmt(day.rainProbabilityMax, "%"))} {tr("chance, about")} {tr(fmt(day.precipitationSum, " mm", 1))}</li>
              <li>
                {tr("Rain periods (06:00–21:00):")}{" "}
                {tr(periods.length ? periods.map((p) => `${hhmm(p.start)}–${hhmm(p.end)}`).join(", ") : tr("none expected"))}
              </li>
              <li>{tr("Wind: up to")} {tr(fmt(day.windSpeedMax, " km/h"))}{tr(", gusts")} {tr(fmt(day.windGustsMax, " km/h"))}</li>
              <li>{tr("UV:")} {tr(fmt(day.uvIndexMax))} ({tr(uvLabel(day.uvIndexMax))})</li>
              <li>{tr("Sun:")} {tr(hhmm(day.sunrise))} – {tr(hhmm(day.sunset))}</li>
            </ul>
            {ahead >= 3 && <p className="mt-3 rounded-xl bg-coral/15 p-2 text-xs">{tr("This day is")} {ahead} {tr("days away. Forecasts this far ahead often change — check again closer to the day.")}</p>}
            <DataFreshness provenance={f.provenance} savedAt={api.savedAt} stale={!!api.error} />
          </section>
          <div className="flex flex-col gap-4">
            <DecisionList items={assessDay(f.hourly, f.daily, date, Math.max(0, ahead))} title={tr("Your plan for the day")} />
            <HeatCard hours={f.hourly} date={date} />
            {date === today && <SkyCard f={f} date={date} />}
            <Link href="/event" className="card flex items-center justify-between font-semibold text-teal-ink hover:bg-white/80 dark:text-teal-soft">
              <span>{tr("Further ahead? Check any date in the next year")}</span>
              <span aria-hidden="true">→</span>
            </Link>
            <ExploreLink />
          </div>
        </div>
      )}
    </>
  );
}
