"use client";

import { useApi } from "@/lib/client/useApi";
import { useAppState } from "./AppState";
import { floodSitesNear } from "@/data/flood-sites";
import { HEAVY_RAIN_DISCLAIMER, RISK_LABEL, type HeavyRainAssessment } from "@/lib/weather/intelligence/heavy-rain.service";
import { tr } from "@/lib/i18n";

/** Heavy-rain / flash flood risk for the chosen place. Prominent only when Moderate or High. */
export function HeavyRainCard() {
  const { location, ready } = useAppState();
  const api = useApi<HeavyRainAssessment & { locationId: string }>(ready ? `/api/heavyrain?loc=${location.id}` : null);
  const a = api.data;
  if (!a || a.level === null) return null;
  const strong = a.level !== "low";
  const near = location.island === "mauritius" ? floodSitesNear(location, 4) : [];
  const tone = a.level === "high" ? "bg-[#D9480F] text-white" : a.level === "moderate" ? "bg-coral text-navy" : "bg-teal/15 text-teal-ink dark:text-teal-soft";
  return (
    <section className={`card ${strong ? "ring-2 ring-coral" : ""}`} aria-labelledby="hr-title">
      <div className="flex items-center justify-between gap-2">
        <h2 id="hr-title" className="label">{tr("Heavy rain & flash flood risk · next 24 h")}</h2>
        <span className={`chip ${tone}`}>{tr(RISK_LABEL[a.level])}</span>
      </div>
      <p className={`mt-2 ${strong ? "text-lg font-bold" : "text-sm"}`}>{tr(a.summary)}</p>
      {strong && (
        <ul className="mt-2 list-disc pl-5 text-sm">
          {a.reasons.map((r) => (
            <li key={r}>{tr(r)}</li>
          ))}
          <li>{tr("Avoid rivers, fords and known flooding spots; never drive through moving water.")}</li>
        </ul>
      )}
      {near.length > 0 && (
        <p className={`mt-2 rounded-xl p-2 text-sm ${strong ? "bg-coral/20 font-semibold" : "bg-mist dark:bg-white/5"}`}>
          {tr("◆ Known flood-prone area")}{tr(near.length > 1 ? "s" : "")} {tr("nearby:")} {tr(near.slice(0, 2).map((s) => s.name).join(", "))}
          {tr(near.length > 2 ? ` and ${near.length - 2} more` : "")} {tr("(Land Drainage Master Plan, see Map).")}
          {tr(strong ? tr(" Take extra care here today.") : "")}
        </p>
      )}
      <p className="mt-2 text-[11px] text-muted dark:text-slate-400">
        {tr(HEAVY_RAIN_DISCLAIMER)}{" "}
        <a className="underline" href="http://metservice.intnet.mu/" target="_blank" rel="noreferrer">{tr("MMS")}</a>
      </p>
    </section>
  );
}
