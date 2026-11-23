"use client";

import type { HourlyPoint } from "@/lib/weather/types";
import { useApi } from "@/lib/client/useApi";
import { useAppState } from "./AppState";
import { WeatherIcon } from "./WeatherIcon";
import { describeCode, fmt } from "@/lib/weather/weather-codes";
import { ago, formatUtcAsMU, hhmm } from "@/lib/time";
import type { AccuracySummary } from "@/lib/weather/intelligence/accuracy.service";
import { useLapli } from "@/lib/client/useLapli";
import { distanceKm } from "@/lib/weather/providers/gdacs.provider";
import { tr } from "@/lib/i18n";

type Accuracy = {
  modelCheck: AccuracySummary | null;
  airportCheck: (AccuracySummary & { airport: string; km: number; raw: string }) | null;
  forecastRainLast3h: boolean;
};

function line(a: AccuracySummary) {
  const parts: string[] = [];
  if (a.rainMatchPct !== null) parts.push(`rain right for ${a.rainMatchPct}% of hours`);
  if (a.tempErrAvg !== null) parts.push(`temperature off by ${a.tempErrAvg}°C on average`);
  return parts.join(" · ");
}

function AccuracyBlock({ acc }: { acc: Accuracy }) {
  const { location } = useAppState();
  const { places } = useLapli();
  const near = (places ?? []).filter((p) => p.loc.island === location.island && distanceKm(location, p.loc) <= 10 && p.minutesAgo <= 180);
  const rainReports = near.filter((p) => p.kind !== "stopped");
  if (!acc.modelCheck && !acc.airportCheck && !near.length) return null;
  return (
    <div className="mt-3 rounded-2xl bg-mist p-3 text-sm dark:bg-white/5">
      <p className="font-bold">{tr("How did the forecast do? (last 3 hours)")}</p>
      <ul className="mt-1 space-y-1.5">
        {acc.airportCheck && (
          <li>
            <span className="chip mr-1 bg-teal text-white">{tr("Measured")}</span>
            {tr("At")} {tr(acc.airportCheck.airport)} ({acc.airportCheck.km} {tr("km away):")} {tr(line(acc.airportCheck))}. {tr(acc.airportCheck.verdict)}
          </li>
        )}
        {acc.modelCheck && (
          <li>
            <span className="chip mr-1 bg-navy/10 text-muted dark:bg-white/10 dark:text-slate-300">{tr("Model check")}</span>
            {tr("Yesterday's forecast vs the latest estimate of what happened:")} {tr(line(acc.modelCheck))}. {tr(acc.modelCheck.verdict)}
          </li>
        )}
        {near.length > 0 && (
          <li>
            <span className="chip mr-1 bg-rain/15 text-rain dark:text-rain-soft">{tr("Lapli isi!")}</span>
            {tr(rainReports.length
              ? `${rainReports.length} place${rainReports.length > 1 ? "s" : ""} near you reported rain; the forecast ${acc.forecastRainLast3h ? "did expect rain ✓" : "did not expect rain ✗"}.`
              : `People near you reported the rain had stopped; the forecast ${acc.forecastRainLast3h ? "expected rain" : "expected dry weather ✓"}.`)}
          </li>
        )}
      </ul>
      <p className="mt-1 text-[11px] text-muted dark:text-slate-400">
        {tr("A quick 3-hour check, not a full accuracy score. \"Measured\" uses official airport weather reports (NOAA Aviation Weather Center); \"Model check\" compares two model runs; Lapli isi! reports are unverified.")}
      </p>
    </div>
  );
}

function Row({ h, past }: { h: HourlyPoint; past: boolean }) {
  const d = describeCode(h.weatherCode);
  const hr = Number(h.time.slice(11, 13));
  return (
    <li className={`flex items-center gap-2 rounded-xl px-2 py-1.5 ${past ? "bg-navy/5 dark:bg-white/5" : "bg-teal/10"}`}>
      <span className="w-12 text-xs font-semibold text-muted dark:text-slate-400">{tr(hhmm(h.time))}</span>
      <WeatherIcon kind={d.icon} size={26} night={hr < 6 || hr >= 18} />
      <span className="sr-only">{tr(d.label)}</span>
      <span className="w-9 text-sm font-bold">{tr(fmt(h.temperature, "°"))}</span>
      <span className="flex-1 whitespace-nowrap text-right text-xs">
        {past ? (
          <span className={(h.precipitation ?? 0) >= 0.1 ? "font-semibold text-rain dark:text-rain-soft" : "text-muted dark:text-slate-400"}>
            {tr(h.precipitation === null ? "—" : h.precipitation >= 0.1 ? `${h.precipitation} mm` : "dry")}
          </span>
        ) : (
          <span className="font-semibold text-rain dark:text-rain-soft">{tr(fmt(h.rainProbability, "%"))}</span>
        )}
        <span className="ml-2 text-muted dark:text-slate-400">{tr(fmt(h.windSpeed, ""))} {tr("km/h")}</span>
      </span>
    </li>
  );
}

/** "Last 3 hours · Next 3 hours" with what is changing. */
export function RecentCard() {
  const { location, ready } = useAppState();
  const api = useApi<{ last: HourlyPoint[]; next: HourlyPoint[]; insights: string[]; accuracy?: Accuracy; retrievedAt: string | null }>(ready ? `/api/recent?loc=${location.id}` : null);
  const r = api.data;
  if (!r) return api.error ? null : <div className="card h-40 animate-pulse" />;
  return (
    <section className="card" aria-labelledby="recent-title">
      <h2 id="recent-title" className="label">{tr("Last 3 hours · Next 3 hours")}</h2>
      {r.insights.length > 0 && (
        <ul className="mt-2 space-y-1.5">
          {r.insights.map((t) => (
            <li key={t} className="flex gap-2 text-sm">
              <span aria-hidden="true" className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-teal" />
              <span>{tr(t)}</span>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <p className="mb-1 text-xs font-bold text-muted dark:text-slate-400">{tr("Last 3 hours (rain fallen)")}</p>
          <ul className="space-y-1">{r.last.map((h) => <Row key={h.time} h={h} past />)}</ul>
        </div>
        <div>
          <p className="mb-1 text-xs font-bold text-muted dark:text-slate-400">{tr("Next 3 hours (rain chance)")}</p>
          <ul className="space-y-1">{r.next.map((h) => <Row key={h.time} h={h} past={false} />)}</ul>
        </div>
      </div>
      {r.accuracy && <AccuracyBlock acc={r.accuracy} />}
      <p className="mt-2 text-[11px] text-muted dark:text-slate-400">
        {tr("\"Last 3 hours\" are model estimates of what happened, not weather-station measurements.")} {tr(r.retrievedAt ? `Updated ${formatUtcAsMU(r.retrievedAt)} (${ago(r.retrievedAt)}).` : "")}
      </p>
    </section>
  );
}
