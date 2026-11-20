"use client";

import Link from "next/link";
import { useAppState } from "@/components/AppState";
import { ErrorBanner, Skeleton } from "@/components/Status";
import { useApi } from "@/lib/client/useApi";
import { RIVER_DISCLAIMER, RIVER_SAFETY, type RiverAssessment } from "@/lib/weather/intelligence/river.service";
import { FLOOD_SITES } from "@/data/flood-sites";
import { getLocality } from "@/data/localities";
import { ago, formatUtcAsMU } from "@/lib/time";

type RiverItem = RiverAssessment & { id: string; name: string; downstream: string[]; downstreamText: string; upstreamText: string; floodSites: string[]; outings: string[] };

const TONE = { high: "bg-[#D9480F] text-white", moderate: "bg-coral text-navy", low: "bg-teal/15 text-teal-ink dark:text-teal-soft" } as const;
const LABEL = { high: "High", moderate: "Moderate", low: "Low" } as const;

export default function RiversPage() {
  const { island, location, ready } = useAppState();
  const api = useApi<{ island: string; rivers: RiverItem[]; retrievedAt: string }>(ready ? `/api/rivers?island=${island}` : null);
  const d = api.data && api.data.island === island ? api.data : null;
  const raised = d?.rivers.filter((r) => r.level === "high" || r.level === "moderate") ?? [];

  return (
    <>
      <h1 className="mb-1 font-[family-name:var(--font-display)] text-2xl font-extrabold">River watch — {island === "rodrigues" ? "Rodrigues" : "Mauritius"}</h1>
      <p className="mb-3 text-sm text-muted dark:text-slate-400">Is heavy rain falling upstream? Our rivers are short and steep: they can rise within an hour of heavy rain in the hills — even when it is dry in the towns below.</p>

      <div className="mb-3 rounded-2xl border-2 border-[#C92A2A] bg-[#FFF0F0] p-3 text-sm text-[#A61E1E] dark:bg-[#3A1212] dark:text-[#FFB4B4]">
        <strong>Rain upstream, not river levels.</strong> We estimate rain over each river&apos;s upper catchment from the forecast. There is no public live river-level data, so we cannot show how high the water is.
      </div>

      <ErrorBanner error={api.error} hasData={!!d} savedAt={api.savedAt} />
      {!d ? (
        <Skeleton className="h-96" />
      ) : (
        <>
          <p className="mb-3 text-base font-semibold">
            {raised.length ? `${raised.length} river${raised.length === 1 ? "" : "s"} with rain upstream right now.` : "No heavy rain upstream of any river right now."}
          </p>
          <ul className="grid gap-3 lg:grid-cols-2">
            {d.rivers.map((r) => {
              const mine = r.downstream.includes(location.id);
              return (
                <li key={r.id} className={`card ${r.level === "high" ? "ring-2 ring-[#D9480F]" : r.level === "moderate" ? "ring-2 ring-coral" : ""}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h2 className="font-bold">{r.name}</h2>
                      <p className="text-[12px] text-muted dark:text-slate-400">Fed by rain over {r.upstreamText}</p>
                    </div>
                    <span className={`chip shrink-0 ${r.level ? TONE[r.level] : "bg-mist text-muted"}`}>{r.level ? LABEL[r.level] : "—"}</span>
                  </div>
                  <p className={`mt-2 ${r.level === "low" ? "text-sm" : "text-base font-semibold"}`}>{r.message}</p>
                  <p className="mt-1 text-sm">
                    Upstream rain: last 3 h <strong>{r.past3h ?? "—"} mm</strong> · next 3 h <strong>{r.next3h ?? "—"} mm</strong> · next 6 h {r.next6h ?? "—"} mm
                  </p>
                  <p className="mt-1 text-sm">
                    Downstream: {r.downstreamText}
                    {mine ? <strong className="ml-1 text-[#A61E1E] dark:text-[#FFB4B4]">(your place)</strong> : ""}
                    {r.downstream.length ? ` · ${r.downstream.map((x) => getLocality(x)?.name).filter(Boolean).join(", ")}` : ""}
                  </p>
                  {r.floodSites.length > 0 && (
                    <p className="mt-1 text-[12px]">◆ Known flood-prone areas: {r.floodSites.map((id) => FLOOD_SITES.find((s) => s.id === id)?.name).filter(Boolean).join("; ")}</p>
                  )}
                  {r.outings.length > 0 && (
                    <p className={`mt-2 rounded-xl p-2 text-sm ${r.level === "low" ? "bg-mist dark:bg-white/5" : "bg-coral/20 font-semibold"}`}>
                      {r.level === "low" || r.level === null
                        ? `🥾 ${r.outings.join(", ")}: no heavy rain upstream right now. Conditions on site can still change fast — leave if the water rises or turns brown.`
                        : `🚫 Not a good time for ${r.outings.join(", ")}: rain upstream. Water can rise suddenly.`}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>

          <section className="card mt-4 text-sm">
            <h2 className="label">Stay safe near rivers</h2>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              {RIVER_SAFETY.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
          </section>

          <p className="mt-3 text-[11px] text-muted dark:text-slate-400">
            {RIVER_DISCLAIMER} Upstream areas are approximate. Data updated {formatUtcAsMU(d.retrievedAt)} ({ago(d.retrievedAt)}). See also the <Link className="underline" href="/map">map</Link> with known flood-prone areas.
          </p>
        </>
      )}
    </>
  );
}
