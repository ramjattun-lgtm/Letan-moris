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
import { InterestsPicker } from "@/components/Interests";
import { TrustBadges } from "@/components/TrustBadges";
import { HeavyRainCard } from "@/components/HeavyRainCard";
import { RecentCard } from "@/components/RecentCard";
import { CommunityCard } from "@/components/CommunityCard";
import { ReservoirSummary } from "@/components/ReservoirSummary";
import { AboutBanner } from "@/components/AboutBanner";
import { AlertsPanel } from "@/components/AlertsPanel";
import { DidYouKnow } from "@/components/DidYouKnow";
import { YesterdayRain } from "@/components/YesterdayRain";
import { ExploreLink, HeatCard, MosquitoCard } from "@/components/WellbeingCards";
import { useState } from "react";

export default function Home() {
  const { location, ready, interests } = useAppState();
  const [editing, setEditing] = useState(false);
  const api = useApi<Forecast>(ready ? `/api/forecast?loc=${location.id}` : null);
  const f = api.data;

  return (
    <>
      <OfficialBanner />
      {f && <AlertsPanel f={f} />}
      <AboutBanner />
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
          {/* Left: what the weather is doing. Right: what it means for you. Balanced so neither column runs short on wide screens. */}
          <div className="flex min-w-0 flex-col gap-4">
            <CurrentCard f={f} />
            <RecentCard />
            <HeavyRainCard />
            <HeatCard hours={f.hourly} date={todayMU()} />
            <MosquitoCard />
            <RainOutlookCard f={f} compact />
            <TrustBadges f={f} />
          </div>
          <div className="flex min-w-0 flex-col gap-4">
            {editing && <InterestsPicker onDone={() => setEditing(false)} />}
            <DecisionList
              items={assessDay(f.hourly, f.daily, todayMU(), 0).filter((a) => a.id === "general" || interests.includes(a.id))}
              title="Today, for you"
            />
            <button type="button" onClick={() => setEditing(true)} className="-mt-2 self-start text-sm font-semibold text-teal-ink underline dark:text-teal-soft">
              Change what I see
            </button>
            <CommunityCard f={f} />
            <YesterdayRain />
            <ReservoirSummary />
            <DidYouKnow />
            <Link href="/day" className="card flex items-center justify-between font-semibold text-teal-ink hover:bg-white/80 dark:text-teal-soft">
              <span>My Weather Day — plan any of the next 7 days</span>
              <span aria-hidden="true">→</span>
            </Link>
            <ExploreLink />
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
