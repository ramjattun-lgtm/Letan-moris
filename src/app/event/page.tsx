"use client";

import { useState } from "react";
import { useAppState } from "@/components/AppState";
import { LocationPicker } from "@/components/LocationPicker";
import { Skeleton } from "@/components/Status";
import { useApi } from "@/lib/client/useApi";
import type { Forecast } from "@/lib/weather/types";
import { climateKeyFor, climateReady, normalFor, region } from "@/lib/weather/intelligence/climate.service";
import { TREND_TEXT, type Trend } from "@/lib/weather/intelligence/reservoir.service";
import { addDays, todayMU } from "@/lib/time";
import { describeCode, fmt } from "@/lib/weather/weather-codes";
import { tr } from "@/lib/i18n";

interface EventApi {
  storm: { pct: number; seasons: number; from: number; km: number } | null;
  outlook: { kind: "week" | "month"; label: string; pctNormal: number | null; trend: Trend | null; wetterChance: number | null } | null;
}

const longDate = (d: string) => new Date(`${d}T12:00:00Z`).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

export default function EventPage() {
  const { location, island, ready } = useAppState();
  const today = todayMU();
  const [date, setDate] = useState(addDays(today, 30));
  const valid = /^\d{4}-\d{2}-\d{2}$/.test(date) && date >= today && date <= addDays(today, 365);
  const ev = useApi<EventApi>(ready && valid ? `/api/event?island=${island}&date=${date}` : null);
  const ahead = valid ? Math.round((Date.parse(date) - Date.parse(today)) / 86_400_000) : -1;
  const fc = useApi<Forecast>(ready && valid && ahead <= 6 ? `/api/forecast?loc=${location.id}` : null);
  const day = fc.data?.daily.find((d) => d.date === date);

  const key = climateKeyFor(location);
  const n = valid && climateReady() ? normalFor(key, date) : null;
  const month = valid ? region(key)?.monthly[Number(date.slice(5, 7)) - 1] : undefined;
  // Drier dates within ±14 days (by the usual chance of a rainy day).
  const nearby = valid && climateReady()
    ? Array.from({ length: 29 }, (_, i) => addDays(date, i - 14))
        .filter((d) => d >= today && d !== date)
        .map((d) => ({ d, c: normalFor(key, d)?.rainChance ?? 101 }))
        .sort((a, b) => a.c - b.c)
        .slice(0, 3)
    : [];

  return (
    <>
      <h1 className="mb-1 font-[family-name:var(--font-display)] text-2xl font-extrabold">{tr("Event date checker")}</h1>
      <p className="mb-3 text-sm text-muted dark:text-slate-400">{tr("Planning a wedding, party or outing? See what the weather is usually like on that date — and the outlook when it gets closer.")}</p>
      <LocationPicker />
      <label className="card mb-3 block text-sm font-semibold">
        {tr("Date of the event")}
        <input type="date" value={date} min={today} max={addDays(today, 365)} onChange={(e) => setDate(e.target.value)} className="mt-1 block min-h-11 w-full rounded-xl border border-navy/15 bg-white px-3 text-base dark:bg-night-card" />
      </label>
      {!valid ? (
        <div className="card text-sm">{tr("Choose a date between today and one year from now.")}</div>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          <section className="card">
            <h2 className="label">{tr(longDate(date))} · {tr(location.name)}</h2>
            {ahead <= 6 && (
              <div className="mt-2 rounded-2xl bg-teal/10 p-3 text-sm">
                <strong>{tr("Forecast (")}{tr(ahead === 0 ? "today" : `${ahead} day${ahead === 1 ? "" : "s"} away`)}):</strong>{" "}
                {tr(day ? `${describeCode(day.weatherCode).label}, ${fmt(day.tempMin, "°")}–${fmt(day.tempMax, "°")}C, rain chance up to ${fmt(day.rainProbabilityMax, "%")} (about ${fmt(day.precipitationSum, " mm", 1)}).` : fc.loading ? "loading…" : tr("not available."))}
              </div>
            )}
            {n ? (
              <>
                <h3 className="mt-3 text-sm font-bold">{tr("Usually on this date (30 years)")}</h3>
                <ul className="mt-1 space-y-1 text-sm">
                  <li>
                    {tr("Chance of a rainy day:")} <strong>{n.rainChance}%</strong> {tr(n.rainChance <= 30 ? tr("— usually dry") : n.rainChance >= 60 ? tr("— rain is common") : "")}
                  </li>
                  <li>
                    {tr("Day high about")} <strong>{tr(fmt(n.tmax, "°C"))}</strong>{tr(", night low about")} {tr(fmt(n.tmin, "°C"))}
                  </li>
                  {n.meanRain !== null && <li>{tr("Average rain that day: about")} {tr(fmt(n.meanRain, " mm", 1))} {tr("(normal rain level)")}</li>}
                  {month && (
                    <li>
                      {tr("In")} {tr(new Date(`${date}T12:00:00Z`).toLocaleDateString("en-GB", { month: "long", timeZone: "UTC" }))}{tr(": about")} {month.rainyDays} {tr("rainy days")}{tr(month.sunHours !== null ? `, ${month.sunHours} hours of sun a day` : "")}
                      {tr(month.gustMax !== null ? `, strongest gusts on record about ${month.gustMax} km/h` : "")}.
                    </li>
                  )}
                </ul>
                {nearby.length > 0 && nearby[0].c < n.rainChance - 5 && (
                  <p className="mt-2 text-sm">
                    {tr("Usually drier dates nearby:")} {tr(nearby.map((x) => `${new Date(`${x.d}T12:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" })} (${x.c}%)`).join(", "))}.
                  </p>
                )}
              </>
            ) : (
              <p className="mt-2 text-sm text-muted">{tr("The 30-year climate data appears once the \"Climate history\" job has run on GitHub.")}</p>
            )}
          </section>

          <section className="card text-sm">
            <h2 className="label">{tr("Outlook & cyclone risk")}</h2>
            {!ev.data ? (
              <Skeleton className="mt-2 h-24" />
            ) : (
              <ul className="mt-2 space-y-2">
                <li>
                  <strong>{tr("Rain outlook:")}</strong>{" "}
                  {tr(ahead < 7
                    ? tr("see the forecast.")
                    : ev.data.outlook?.trend
                      ? `${TREND_TEXT[ev.data.outlook.trend]} for the ${ev.data.outlook.kind === "week" ? "week" : `month of ${new Date(`${date}T12:00:00Z`).toLocaleDateString("en-GB", { month: "long", timeZone: "UTC" })}`} (${ev.data.outlook.pctNormal}% of normal rain level, long-range ECMWF outlook — a tendency only).`
                      : ahead > 200
                        ? tr("too far ahead for a long-range outlook — use the usual weather on the left.")
                        : tr("not available right now."))}
                </li>
                <li>
                  <strong>{tr("Cyclone risk:")}</strong>{" "}
                  {tr(ev.data.storm
                    ? ev.data.storm.pct === 0
                      ? `in the ${ev.data.storm.seasons} seasons since ${ev.data.storm.from}, no storm passed within ${ev.data.storm.km} km within a week of this date.`
                      : `in ${ev.data.storm.pct}% of the ${ev.data.storm.seasons} seasons since ${ev.data.storm.from}, a storm passed within ${ev.data.storm.km} km within a week of this date.`
                    : tr("cyclone history not available yet."))}
                  {ev.data.storm && ev.data.storm.pct >= 10 && tr(" Have a backup plan and follow MMS bulletins in the days before.")}
                </li>
              </ul>
            )}
            <p className="mt-3 text-[11px] text-muted dark:text-slate-400">
              {tr("\"Usually\" = averages for the date ±7 days over 1995–2024 (reanalysis). Forecasts appear 7 days before; long-range outlooks up to about 6 months ahead. Storm history: NOAA IBTrACS.")}
            </p>
          </section>
        </div>
      )}
    </>
  );
}
