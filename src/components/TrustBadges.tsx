"use client";

import Link from "next/link";
import type { Forecast } from "@/lib/weather/types";
import { useApi } from "@/lib/client/useApi";
import { climateKeyFor, climateReady, normalFor, vsNormal } from "@/lib/weather/intelligence/climate.service";
import type { DayAgreement } from "@/lib/weather/intelligence/agreement.service";
import { useAppState } from "./AppState";
import { dayLabel } from "@/lib/time";
import { tr } from "@/lib/i18n";

/** "vs normal" and "models agree" context for today's forecast. */
export function TrustBadges({ f }: { f: Forecast }) {
  const { location } = useAppState();
  const today = f.daily[0];
  const normal = today && climateReady() ? normalFor(climateKeyFor(location), today.date) : null;
  const cmp = normal ? vsNormal(today.tempMax, normal.tmax) : null;
  const agree = useApi<{ region: string; models: string[]; days: DayAgreement[] }>(`/api/agreement?loc=${location.id}`);
  const days = agree.data?.days.slice(0, 3) ?? [];

  return (
    <section className="card" aria-labelledby="trust-title">
      <h2 id="trust-title" className="label">{tr("How this forecast compares")}</h2>
      <ul className="mt-2 space-y-2 text-sm">
        <li className="flex items-start gap-2">
          <span aria-hidden="true" className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-coral" />
          {cmp && normal ? (
            <span>
              <strong>{tr(cmp.label)}</strong> {tr("today (forecast high")} {tr((today.tempMax?.toFixed(0)) ?? "")}{tr("°C; normal day high")} {tr((normal.tmax?.toFixed(0)) ?? "")}{tr("°C). Rain on a day like today is usual about")} {normal.rainChance}{tr("% of the time.")}{" "}
              <Link href="/climate" className="font-semibold text-teal-ink underline dark:text-teal-soft">{tr("Climate")}</Link>
            </span>
          ) : (
            <span className="text-muted dark:text-slate-400">{tr("Comparison with 30-year normal temperatures and rain levels coming soon.")}</span>
          )}
        </li>
        <li className="flex items-start gap-2">
          <span aria-hidden="true" className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-rain" />
          {days.length ? (
            <span>
              {days.map((d) => (
                <span key={d.date} className="block">
                  <strong>{tr(dayLabel(d.date))}:</strong> {tr(d.label)}
                  {tr(d.tempSpread !== null && d.tempSpread > 2 ? ` · temperatures differ by ${d.tempSpread}°C` : "")}
                </span>
              ))}
              <span className="block text-[11px] text-muted dark:text-slate-400">{tr("Comparing")} {agree.data?.models.length} {tr("independent weather forecasting models for the")} {tr((agree.data?.region) ?? "")} {tr("area.")}</span>
            </span>
          ) : (
            <span className="text-muted dark:text-slate-400">{tr(agree.error ? tr("Model comparison unavailable right now.") : tr("Comparing independent weather forecasting models…"))}</span>
          )}
        </li>
        <li className="flex items-start gap-2">
          <span aria-hidden="true" className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-teal" />
          <span className="text-muted dark:text-slate-400">{tr("Our own accuracy score appears here once a few weeks of forecasts have been checked against real observations.")}</span>
        </li>
      </ul>
    </section>
  );
}
