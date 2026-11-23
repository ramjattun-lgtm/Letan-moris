"use client";

import { useEffect, useState } from "react";
import { ago, formatUtcAsMU } from "@/lib/time";
import { useAppState } from "./AppState";

/**
 * Thin bar at the top of the page: when this page last got data, how old the forecast
 * itself is, and a Refresh button. Times are Mauritius time.
 */
export function LastRefreshed({ savedAt, dataAt, loading, stale, onRefresh }: { savedAt: string | null; dataAt?: string | null; loading: boolean; stale?: boolean; onRefresh: () => void }) {
  const { t } = useAppState();
  const [, tick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => tick((n) => n + 1), 30_000);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="mb-3 flex items-center justify-between gap-2 text-xs text-muted dark:text-slate-400" role="status" aria-live="polite">
      <p className="min-w-0">
        {loading && !savedAt ? (
          t("refresh.getting")
        ) : savedAt ? (
          <>
            <span className={stale ? "font-semibold text-coral-ink dark:text-coral" : ""}>
              {t(stale ? "refresh.saved" : "refresh.last", { time: formatUtcAsMU(savedAt) })}
            </span>{" "}
            ({ago(savedAt)})
            {dataAt && Math.abs(Date.parse(savedAt) - Date.parse(dataAt)) > 5 * 60_000 ? <> · {t("refresh.data", { time: formatUtcAsMU(dataAt) })}</> : null}
          </>
        ) : (
          "Not refreshed yet"
        )}
      </p>
      <button type="button" onClick={onRefresh} disabled={loading} className="flex min-h-9 shrink-0 items-center gap-1 rounded-full px-3 font-semibold text-teal-ink ring-1 ring-teal/40 disabled:opacity-60 dark:text-teal-soft" aria-label="Refresh the forecast now">
        <span aria-hidden="true" className={loading ? "inline-block animate-spin" : ""}>↻</span> {loading ? t("refresh.busy") : t("refresh.button")}
      </button>
    </div>
  );
}
