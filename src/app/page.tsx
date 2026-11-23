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
import { LastRefreshed } from "@/components/LastRefreshed";
import { NextSixHours } from "@/components/NextSixHours";
import { YourPlaces } from "@/components/YourPlaces";
import { AccuracyCard } from "@/components/AccuracyCard";
import { InstallPrompt } from "@/components/InstallPrompt";
import { WeatherMemory } from "@/components/WeatherMemory";

export default function Home() {
  const { location, ready, interests, t } = useAppState();
  const [editing, setEditing] = useState(false);
  const api = useApi<Forecast>(ready ? `/api/forecast?loc=${location.id}` : null, { refreshMin: 15 });
  const f = api.data;

  return (
    <>
      <LastRefreshed savedAt={api.savedAt} dataAt={f?.provenance.retrievedAt} loading={api.loading} stale={!!api.error && !!f} onRefresh={api.reload} />
      <OfficialBanner />
      {/* The place picker sits inside the Alerts section, so new visitors set their place (and location permission) first. */}
      {f ? <AlertsPanel f={f} /> : <LocationPicker setup />}
      <AboutBanner />
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
          {/* Left: now and the next few hours (what most people open the app for). Right: the rest of the day and background. */}
          <div className="flex min-w-0 flex-col gap-4">
            <CurrentCard f={f} />
            <NextSixHours f={f} />
            <RecentCard />
            <HeavyRainCard />
            {editing && <InterestsPicker onDone={() => setEditing(false)} />}
            <DecisionList
              items={assessDay(f.hourly, f.daily, todayMU(), 0).filter((a) => a.id === "general" || interests.includes(a.id))}
              title={t("today.forYou")}
            />
            <button type="button" onClick={() => setEditing(true)} className="-mt-2 self-start text-sm font-semibold text-teal-ink underline dark:text-teal-soft">
              Change what I see
            </button>
            <CommunityCard f={f} />
          </div>
          <div className="flex min-w-0 flex-col gap-4">
            <YourPlaces />
            <HeatCard hours={f.hourly} date={todayMU()} />
            <MosquitoCard />
            <YesterdayRain />
            <ReservoirSummary />
            <RainOutlookCard f={f} compact />
            <AccuracyCard location={location} />
            <DidYouKnow />
            <WeatherMemory />
            <div className="card grid gap-2 font-semibold text-teal-ink dark:text-teal-soft">
              <Link href="/planner" className="flex items-center justify-between">
                <span>{t("today.planner")}</span>
                <span aria-hidden="true">→</span>
              </Link>
              <Link href="/day" className="flex items-center justify-between">
                <span>{t("today.day")}</span>
                <span aria-hidden="true">→</span>
              </Link>
            </div>
            <ExploreLink />
            <TrustBadges f={f} />
            <InstallPrompt />
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
