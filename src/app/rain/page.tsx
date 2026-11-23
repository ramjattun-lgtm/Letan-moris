"use client";

import { useAppState } from "@/components/AppState";
import { LocationPicker } from "@/components/LocationPicker";
import { RainOutlookCard } from "@/components/ForecastBlocks";
import { RainChart } from "@/components/RainChart";
import { ConfidenceChip, DataFreshness, ErrorBanner, Skeleton } from "@/components/Status";
import { useApi } from "@/lib/client/useApi";
import type { Forecast } from "@/lib/weather/types";
import { findRainPeriods, upcoming } from "@/lib/weather/intelligence/rainfall-intelligence.service";
import { CONFIDENCE_METHOD } from "@/lib/weather/intelligence/confidence.service";
import { dayLabel, hhmm } from "@/lib/time";
import { tr } from "@/lib/i18n";

export default function RainPage() {
  const { location, ready } = useAppState();
  const api = useApi<Forecast>(ready ? `/api/forecast?loc=${location.id}` : null);
  const f = api.data;
  const next48 = f ? upcoming(f.hourly).slice(0, 48) : [];
  const periods = findRainPeriods(next48);

  return (
    <>
      <h1 className="mb-3 font-[family-name:var(--font-display)] text-2xl font-extrabold">{tr("Rain intelligence")}</h1>
      <LocationPicker />
      <ErrorBanner error={api.error} hasData={!!f} savedAt={api.savedAt} />
      {!f ? (
        api.loading || !ready ? <Skeleton className="h-96" /> : null
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <RainOutlookCard f={f} />
          <section className="card" aria-labelledby="periods">
            <h2 id="periods" className="label">{tr("Rain periods — next 48 hours")}</h2>
            {periods.length === 0 ? (
              <p className="mt-2">{tr("No rain period expected (no hour with a chance of 50% or more, or 0.5 mm or more).")}</p>
            ) : (
              <ul className="mt-2 space-y-2">
                {periods.map((p) => (
                  <li key={p.start} className="rounded-2xl bg-mist p-3 dark:bg-white/5">
                    <div className="flex items-center justify-between gap-2">
                      <strong>
                        {tr(dayLabel(p.start.slice(0, 10)))}{tr(", about")} {tr(hhmm(p.start))}–{tr(hhmm(p.end))}
                      </strong>
                      <ConfidenceChip level={p.confidence} />
                    </div>
                    <p className="text-sm text-muted dark:text-slate-400">
                      {tr("Up to")} {p.maxProbability ?? "—"}{tr("% chance ·")} {p.totalMm} {tr("mm in total · peak intensity")} {tr(p.peakIntensity === "none" ? tr("very light") : p.peakIntensity)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section className="card lg:col-span-2" aria-labelledby="timeline">
            <h2 id="timeline" className="label">{tr("Hourly rain timeline — next 48 hours")}</h2>
            <RainChart hours={next48} />
            <p className="text-[11px] text-muted dark:text-slate-400">{tr("Line: chance of rain each hour. Bars: expected rain in that hour (mm). Intensity: light under 2.5 mm/h, moderate 2.5–7.6, heavy above 7.6.")}</p>
          </section>
          <section className="card lg:col-span-2" aria-labelledby="totals">
            <h2 id="totals" className="label">{tr("Daily rain totals")}</h2>
            <div className="mt-2 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-muted dark:text-slate-400">
                    <th className="py-1 font-semibold">{tr("Day")}</th>
                    <th className="font-semibold">{tr("Highest chance")}</th>
                    <th className="font-semibold">{tr("Total")}</th>
                    <th className="font-semibold">{tr("Rainy hours")}</th>
                  </tr>
                </thead>
                <tbody>
                  {f.daily.map((d) => (
                    <tr key={d.date} className="border-t border-navy/5 dark:border-white/5">
                      <td className="py-2 font-semibold">{tr(dayLabel(d.date))}</td>
                      <td>{d.rainProbabilityMax ?? "—"}%</td>
                      <td>{d.precipitationSum ?? "—"} {tr("mm")}</td>
                      <td>{d.precipitationHours ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
          <section className="card lg:col-span-2 text-sm">
            <h2 className="label">{tr("How to read this")}</h2>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-muted dark:text-slate-300">
              <li>{tr("The data is hourly. Minute-by-minute rain (nowcasting) needs radar data, which Letan Moris does not have yet — so we do not show it.")}</li>
              <li>{tr(CONFIDENCE_METHOD)}</li>
              <li>{tr("Showers in Mauritius and Rodrigues can be very local. A neighbouring village can stay dry while yours gets rain.")}</li>
            </ul>
            <DataFreshness provenance={f.provenance} savedAt={api.savedAt} stale={!!api.error} />
          </section>
        </div>
      )}
    </>
  );
}
