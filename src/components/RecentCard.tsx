"use client";

import type { HourlyPoint } from "@/lib/weather/types";
import { useApi } from "@/lib/client/useApi";
import { useAppState } from "./AppState";
import { WeatherIcon } from "./WeatherIcon";
import { describeCode, fmt } from "@/lib/weather/weather-codes";
import { ago, formatUtcAsMU, hhmm } from "@/lib/time";

function Row({ h, past }: { h: HourlyPoint; past: boolean }) {
  const d = describeCode(h.weatherCode);
  const hr = Number(h.time.slice(11, 13));
  return (
    <li className={`flex items-center gap-2 rounded-xl px-2 py-1.5 ${past ? "bg-navy/5 dark:bg-white/5" : "bg-teal/10"}`}>
      <span className="w-12 text-xs font-semibold text-muted dark:text-slate-400">{hhmm(h.time)}</span>
      <WeatherIcon kind={d.icon} size={26} night={hr < 6 || hr >= 18} />
      <span className="sr-only">{d.label}</span>
      <span className="w-9 text-sm font-bold">{fmt(h.temperature, "°")}</span>
      <span className="flex-1 whitespace-nowrap text-right text-xs">
        {past ? (
          <span className={(h.precipitation ?? 0) >= 0.1 ? "font-semibold text-rain dark:text-rain-soft" : "text-muted dark:text-slate-400"}>
            {h.precipitation === null ? "—" : h.precipitation >= 0.1 ? `${h.precipitation} mm` : "dry"}
          </span>
        ) : (
          <span className="font-semibold text-rain dark:text-rain-soft">{fmt(h.rainProbability, "%")}</span>
        )}
        <span className="ml-2 text-muted dark:text-slate-400">{fmt(h.windSpeed, "")} km/h</span>
      </span>
    </li>
  );
}

/** "Last 3 hours · Next 3 hours" with what is changing. */
export function RecentCard() {
  const { location, ready } = useAppState();
  const api = useApi<{ last: HourlyPoint[]; next: HourlyPoint[]; insights: string[]; retrievedAt: string | null }>(ready ? `/api/recent?loc=${location.id}` : null);
  const r = api.data;
  if (!r) return api.error ? null : <div className="card h-40 animate-pulse" />;
  return (
    <section className="card" aria-labelledby="recent-title">
      <h2 id="recent-title" className="label">Last 3 hours · Next 3 hours</h2>
      {r.insights.length > 0 && (
        <ul className="mt-2 space-y-1.5">
          {r.insights.map((t) => (
            <li key={t} className="flex gap-2 text-sm">
              <span aria-hidden="true" className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-teal" />
              <span>{t}</span>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <p className="mb-1 text-xs font-bold text-muted dark:text-slate-400">Last 3 hours (rain fallen)</p>
          <ul className="space-y-1">{r.last.map((h) => <Row key={h.time} h={h} past />)}</ul>
        </div>
        <div>
          <p className="mb-1 text-xs font-bold text-muted dark:text-slate-400">Next 3 hours (rain chance)</p>
          <ul className="space-y-1">{r.next.map((h) => <Row key={h.time} h={h} past={false} />)}</ul>
        </div>
      </div>
      <p className="mt-2 text-[11px] text-muted dark:text-slate-400">
        &quot;Last 3 hours&quot; are model estimates of what happened, not weather-station measurements. {r.retrievedAt ? `Updated ${formatUtcAsMU(r.retrievedAt)} (${ago(r.retrievedAt)}).` : ""}
      </p>
    </section>
  );
}
