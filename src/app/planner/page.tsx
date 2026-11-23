"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAppState } from "@/components/AppState";
import { LocationPicker } from "@/components/LocationPicker";
import { VERDICT_STYLE } from "@/components/ForecastBlocks";
import { DataFreshness, ErrorBanner, Skeleton } from "@/components/Status";
import { useApi } from "@/lib/client/useApi";
import { readLS, writeLS } from "@/lib/client/storage";
import type { Forecast } from "@/lib/weather/types";
import { bestDay, PLAN_ACTIVITIES, planDays, type PlanActivity } from "@/lib/weather/intelligence/planner";
import { dayLabel } from "@/lib/time";
import { tr } from "@/lib/i18n";

/** Perfect Day finder: the best of the next 7 days for one activity. */
export default function PlannerPage() {
  const { location, ready } = useAppState();
  const [act, setAct] = useState<PlanActivity>("outdoor");
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setAct(readLS<PlanActivity>("letan.planAct", "outdoor")), []);
  const choose = (a: PlanActivity) => {
    setAct(a);
    writeLS("letan.planAct", a);
  };
  const api = useApi<Forecast>(ready ? `/api/forecast?loc=${location.id}` : null);
  const f = api.data;
  const days = f ? planDays(f, act) : [];
  const best = bestDay(days);
  const actLabel = PLAN_ACTIVITIES.find((a) => a.id === act)!;

  return (
    <>
      <h1 className="mb-1 font-[family-name:var(--font-display)] text-2xl font-extrabold">{tr("Perfect Day finder")}</h1>
      <p className="mb-3 text-sm text-muted dark:text-slate-400">{tr("Pick an activity — we rank the next 7 days for")} {tr(location.name)} {tr("using written rules you can read below each day.")}</p>
      <LocationPicker />
      <div className="mb-4 flex flex-wrap gap-2" role="radiogroup" aria-label={tr("Activity")}>
        {PLAN_ACTIVITIES.map((a) => (
          <button key={a.id} type="button" role="radio" aria-checked={act === a.id} onClick={() => choose(a.id)} className={`min-h-11 rounded-full px-4 text-sm font-semibold ring-1 ${act === a.id ? "bg-navy text-white ring-navy dark:bg-teal-soft dark:text-navy" : "ring-navy/15 dark:ring-white/20"}`}>
            {tr(a.icon)} {tr(a.label)}
          </button>
        ))}
      </div>
      <ErrorBanner error={api.error} hasData={!!f} savedAt={api.savedAt} />
      {!f ? (
        <Skeleton className="h-72" />
      ) : (
        <>
          <section className="card mb-4 bg-gradient-to-br from-teal/15 to-white dark:to-night-card" aria-live="polite">
            <h2 className="label">{tr("Best day for:")} {tr(actLabel.label.toLowerCase())}</h2>
            {best ? (
              <p className="mt-1 text-lg font-bold">
                {tr(actLabel.icon)} {tr(dayLabel(best.date))} — {tr(VERDICT_STYLE[best.a.verdict].label.toLowerCase())}. <span className="font-normal">{tr(best.a.summary)}</span>
              </p>
            ) : (
              <p className="mt-1 font-semibold">{tr("No good or fair day in the next 7 days. Check again tomorrow — forecasts change.")}</p>
            )}
          </section>
          <ul className="grid gap-3 lg:grid-cols-2">
            {days.map((d) => (
              <li key={d.date} className={`card ${best?.date === d.date ? "ring-2 ring-teal" : ""}`}>
                <div className="flex items-center justify-between gap-2">
                  <Link href={`/day?date=${d.date}`} className="font-bold underline-offset-2 hover:underline">
                    {tr(dayLabel(d.date))}
                  </Link>
                  <span className={`chip ${VERDICT_STYLE[d.a.verdict].cls}`}>{tr(VERDICT_STYLE[d.a.verdict].label)}</span>
                </div>
                <p className="mt-1 text-sm">{tr(d.a.summary)}</p>
                {d.a.period && <p className="text-xs text-muted dark:text-slate-400">{tr(d.a.period)}</p>}
                {d.a.reasons.length > 0 && (
                  <details className="mt-1 text-xs">
                    <summary className="cursor-pointer font-semibold text-teal-ink dark:text-teal-soft">{tr("Why")}</summary>
                    <ul className="mt-1 list-disc pl-4">
                      {d.a.reasons.map((r) => (
                        <li key={r}>{tr(r)}</li>
                      ))}
                    </ul>
                  </details>
                )}
                {d.daysAhead >= 4 && <p className="mt-1 text-[11px] text-muted dark:text-slate-400">{d.daysAhead} {tr("days ahead — less certain.")}</p>}
              </li>
            ))}
          </ul>
          <DataFreshness provenance={f.provenance} savedAt={api.savedAt} stale={!!api.error} />
        </>
      )}
    </>
  );
}
