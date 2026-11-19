"use client";

import { ago, formatUtcAsMU } from "@/lib/time";
import type { DataProvenance } from "@/lib/weather/types";

/** Freshness + source line shown under every block of forecast data. */
export function DataFreshness({ provenance, savedAt, stale }: { provenance?: DataProvenance | null; savedAt?: string | null; stale?: boolean }) {
  const when = provenance?.retrievedAt ?? savedAt;
  return (
    <p className="mt-3 text-[11px] text-muted dark:text-slate-400">
      {when ? <>Updated {formatUtcAsMU(when)} ({ago(when)}). </> : null}
      Model forecast{provenance?.gridElevation !== null && provenance?.gridElevation !== undefined ? ` · model ground height ${Math.round(provenance.gridElevation)} m` : ""}.{" "}
      <a className="underline" href="https://open-meteo.com/" target="_blank" rel="noreferrer">
        Open-Meteo
      </a>
      {stale ? <strong className="ml-1 text-coral-ink dark:text-coral">Showing saved data.</strong> : null}
    </p>
  );
}

/** Clear banner when live data failed. */
export function ErrorBanner({ error, hasData, savedAt }: { error: string | null; hasData: boolean; savedAt: string | null }) {
  if (!error) return null;
  return (
    <div role="status" className="mb-4 rounded-2xl bg-coral/15 px-4 py-3 text-sm text-navy dark:text-slate-100">
      <strong>Live forecast unavailable right now.</strong>{" "}
      {hasData && savedAt ? `Showing the last forecast saved on this device (${ago(savedAt)}). It may be out of date.` : "Please try again in a few minutes. No forecast is shown rather than guessing."}
    </div>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-3xl bg-navy/5 dark:bg-white/5 ${className}`} />;
}

export function ConfidenceChip({ level }: { level: "high" | "medium" | "low" }) {
  const cls = level === "high" ? "bg-teal/15 text-teal-ink dark:text-teal-soft" : level === "medium" ? "bg-coral/20 text-coral-ink dark:text-coral" : "bg-navy/10 text-muted dark:bg-white/10 dark:text-slate-300";
  return <span className={`chip ${cls}`}>{level === "high" ? "High" : level === "medium" ? "Medium" : "Low"} confidence</span>;
}
