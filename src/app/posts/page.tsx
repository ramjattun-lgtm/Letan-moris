"use client";

import { useState } from "react";
import { useApi } from "@/lib/client/useApi";
import { Skeleton } from "@/components/Status";

type Preview = { mode: string; text: string; cardUrl: string; check: { ok: boolean; failures: string[]; warnings: string[] } };

const SLOTS = [
  { id: "morning", label: "Morning 05:45" },
  { id: "midday", label: "Midday 12:30" },
  { id: "evening", label: "Evening 18:30" },
  { id: "weekend", label: "Friday weekend" },
];

/** Owner preview of the Facebook posts, made from live data. Nothing is posted from this page. */
export default function PostsPreview() {
  const [slot, setSlot] = useState("morning");
  const api = useApi<Preview>(`/api/social/preview?slot=${slot}`);
  const p = api.data;
  return (
    <>
      <h1 className="mb-1 font-[family-name:var(--font-display)] text-2xl font-extrabold">Facebook post preview</h1>
      <p className="mb-3 text-sm text-muted dark:text-slate-400">What Letan Moris would post right now, from live forecasts. Nothing is posted from this page.</p>
      <div role="group" aria-label="Post" className="scroll-x mb-4">
        {SLOTS.map((s) => (
          <button key={s.id} type="button" aria-pressed={slot === s.id} onClick={() => setSlot(s.id)} className={`min-h-10 shrink-0 rounded-full px-4 text-sm font-semibold ${slot === s.id ? "bg-navy text-white dark:bg-teal-soft dark:text-navy" : "bg-white text-muted ring-1 ring-navy/10 dark:bg-night-card dark:text-slate-300"}`}>
            {s.label}
          </button>
        ))}
      </div>
      {!p ? (
        api.error ? <div className="card">{api.error}</div> : <Skeleton className="h-96" />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="card">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.cardUrl} alt="Share card preview" className="w-full rounded-2xl" />
          </div>
          <div className="card">
            <p className={`chip ${p.check.ok ? "bg-teal/15 text-teal-ink" : "bg-coral/20 text-coral-ink"}`}>{p.check.ok ? "Checker passed" : "Checker blocked this post"}</p>
            {!p.check.ok && (
              <ul className="mt-2 list-disc pl-5 text-sm">
                {p.check.failures.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
            )}
            <p className="mt-2 text-xs text-muted">Posting mode: {p.mode}</p>
            <pre className="mt-3 whitespace-pre-wrap rounded-2xl bg-mist p-3 text-sm dark:bg-white/5">{p.text}</pre>
          </div>
        </div>
      )}
    </>
  );
}
