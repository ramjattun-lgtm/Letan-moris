"use client";

import { useState } from "react";
import { useApi } from "@/lib/client/useApi";
import { useAppState } from "./AppState";
import type { Fact } from "@/lib/weather/intelligence/facts.service";
import { Dodo } from "./Dodo";

const LABEL: Record<Fact["category"], string> = {
  local: "Local climate",
  record: "Record",
  change: "Changing climate",
  timing: "Rain timing",
  cyclone: "Cyclones",
  "on-this-day": "On this day",
  how: "How weather works",
  myth: "Myth buster",
};

/** "Did you know?" — one fact a day for your area, with more on tap. */
export function DidYouKnow() {
  const { location, ready } = useAppState();
  const api = useApi<{ today: string; facts: Fact[] }>(ready ? `/api/facts?loc=${location.id}` : null);
  const [i, setI] = useState(0);
  const facts = api.data?.facts ?? [];
  if (!facts.length) return null;
  const f = facts[i % facts.length];
  return (
    <section className="card bg-gradient-to-br from-[#FFF8EA] to-white dark:from-[#2A2414] dark:to-night-card" aria-labelledby="dyk-title" aria-live="polite">
      <div className="flex items-center justify-between gap-2">
        <h2 id="dyk-title" className="label flex items-center gap-1.5"><Dodo size={22} className="text-coral-ink dark:text-coral" /> Did you know?</h2>
        <span className="chip bg-coral/25 text-[11px] text-coral-ink dark:text-coral">{LABEL[f.category]}</span>
      </div>
      <p className="mt-2 text-base font-semibold leading-snug">{f.text}</p>
      <div className="mt-2 flex items-center justify-between gap-2">
        <p className="text-[11px] text-muted dark:text-slate-400">Source: {f.source}</p>
        {facts.length > 1 && (
          <button type="button" onClick={() => setI((x) => x + 1)} className="min-h-9 shrink-0 rounded-full px-3 text-sm font-semibold text-teal-ink ring-1 ring-teal/40 dark:text-teal-soft">
            Another fact →
          </button>
        )}
      </div>
    </section>
  );
}
