"use client";

import Link from "next/link";
import { useAppState } from "@/components/AppState";
import { LocationPicker } from "@/components/LocationPicker";
import { CurrentCard, DailyList, DecisionList, HourlyStrip, RainOutlookCard } from "@/components/ForecastBlocks";
import { DataFreshness, ErrorBanner, Skeleton } from "@/components/Status";
import { useApi } from "@/lib/client/useApi";
import type { Forecast } from "@/lib/weather/types";
import { assessDay } from "@/lib/weather/intelligence/decision-engine.service";
import { todayMU } from "@/lib/time";
import { OfficialBanner } from "@/components/OfficialBanner";

export default function Home() {
  const { location, ready } = useAppState();
  const api = useApi<Forecast>(ready ? `/api/forecast?loc=${location.id}` : null);
  const f = api.data;

  return (
    <>
      <OfficialBanner />
      <LocationPicker />
      <ErrorBanner error={api.error} hasData={!!f} savedAt={api.savedAt} />
      {!f ? (
        api.loading || !ready ? (
          <div className="grid gap-4 lg:grid-cols-2">
            <Skeleton className="h-72" />
            <Skeleton className="h-72" />
          </div>
        ) : null
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="flex flex-col gap-4">
            <CurrentCard f={f} />
            <RainOutlookCard f={f} compact />
          </div>
          <div className="flex flex-col gap-4">
            <DecisionList items={assessDay(f.hourly, f.daily, todayMU(), 0).filter((a) => ["general", "school", "laundry", "beach"].includes(a.id))} title="Today in plain words" />
            <Link href="/day" className="card flex items-center justify-between font-semibold text-teal-ink hover:bg-white/80 dark:text-teal-soft">
              <span>My Weather Day — plan any of the next 7 days</span>
              <span aria-hidden="true">→</span>
            </Link>
          </div>
          <div className="lg:col-span-2">
            <HourlyStrip f={f} />
          </div>
          <div className="lg:col-span-2">
            <DailyList f={f} />
            <DataFreshness provenance={f.provenance} savedAt={api.savedAt} stale={!!api.error} />
            <p className="mt-1 text-[11px] text-muted dark:text-slate-400">{f.provenance.resolutionNote}</p>
          </div>
        </div>
      )}
    </>
  );
}
