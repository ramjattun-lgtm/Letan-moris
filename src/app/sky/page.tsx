"use client";

import { useAppState } from "@/components/AppState";
import { LocationPicker } from "@/components/LocationPicker";
import { ErrorBanner, Skeleton } from "@/components/Status";
import { SkyCard } from "@/components/WellbeingCards";
import { useApi } from "@/lib/client/useApi";
import type { Forecast } from "@/lib/weather/types";
import { todayMU } from "@/lib/time";
import { tr } from "@/lib/i18n";

export default function SkyPage() {
  const { location, ready } = useAppState();
  const api = useApi<Forecast>(ready ? `/api/forecast?loc=${location.id}` : null);
  return (
    <>
      <h1 className="mb-1 font-[family-name:var(--font-display)] text-2xl font-extrabold">{tr("Stargazing tonight")}</h1>
      <p className="mb-3 text-sm text-muted dark:text-slate-400">{tr("Cloud forecast from 19:00 to 04:00, and the Moon.")}</p>
      <LocationPicker />
      <ErrorBanner error={api.error} hasData={!!api.data} savedAt={api.savedAt} />
      {api.data ? <SkyCard f={api.data} date={todayMU()} /> : <Skeleton className="h-64" />}
      <p className="mt-3 text-[11px] text-muted dark:text-slate-400">{tr("Cloud cover is a model forecast for your place; mountains can be cloudier. The Moon phase is calculated, accurate to about a day.")}</p>
    </>
  );
}
