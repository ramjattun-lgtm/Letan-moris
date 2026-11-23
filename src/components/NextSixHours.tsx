"use client";

import type { Forecast } from "@/lib/weather/types";
import { nextHours, nextHoursHeadline, type HourRain } from "@/lib/weather/intelligence/next-hours";
import { useAppState } from "./AppState";
import { trackRecord } from "./AccuracyCard";

const COLOUR: Record<HourRain, string> = {
  likely: "bg-rain",
  possible: "bg-rain-soft/60",
  dry: "bg-teal/25",
  unknown: "bg-navy/10 dark:bg-white/10",
};
const WORD: Record<HourRain, string> = { likely: "Rain likely", possible: "Possible", dry: "Dry", unknown: "No data" };

/** Will it rain while I'm out? Hour by hour for the next 6 hours. */
export function NextSixHours({ f }: { f: Forecast }) {
  const { location } = useAppState();
  const hours = nextHours(f.hourly);
  const record = trackRecord(location);
  if (!hours.length) return null;
  const wet = hours.some((h) => h.rain === "likely");
  return (
    <section className={`card ${wet ? "ring-1 ring-rain/40" : ""}`} aria-labelledby="next6-title">
      <h2 id="next6-title" className="label">
        Rain in the next 6 hours
      </h2>
      <p className="mt-1 font-semibold">{nextHoursHeadline(hours)}</p>
      <ol className="mt-3 grid grid-cols-6 gap-1.5" aria-label="Chance of rain each hour">
        {hours.map((h) => (
          <li key={h.time} className="flex flex-col items-center gap-1 text-center">
            <div className="flex h-16 w-full items-end overflow-hidden rounded-xl bg-mist dark:bg-white/5" aria-hidden="true">
              <div className={`w-full rounded-xl ${COLOUR[h.rain]}`} style={{ height: `${Math.max(8, h.pct ?? 0)}%` }} />
            </div>
            <span className="text-[11px] font-semibold text-muted dark:text-slate-400">{h.label}</span>
            <span className="text-xs font-bold text-rain dark:text-rain-soft">{h.pct === null ? "—" : `${h.pct}%`}</span>
            <span className="text-[10px] text-muted dark:text-slate-400">{h.mm === null ? "—" : h.mm >= 0.1 ? `${h.mm} mm` : "dry"}</span>
            <span className="sr-only">{WORD[h.rain]}</span>
          </li>
        ))}
      </ol>
      <p className="mt-2 text-[11px] text-muted dark:text-slate-400">
        {record && (
          <>
            {record}{" "}
          </>
        )}
        % = chance of rain in that hour; mm = expected amount. &quot;Likely&quot; needs at least 60% and 0.5 mm. Forecast guidance from weather models, not radar — showers can pop up between hours. Official warnings: MMS.
      </p>
    </section>
  );
}
