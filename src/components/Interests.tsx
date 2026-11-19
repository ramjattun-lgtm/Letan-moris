"use client";

import { useState } from "react";
import { ALL_INTERESTS, useAppState } from "./AppState";
import { ACTIVITY_LABEL, type ActivityId } from "@/lib/weather/intelligence/decision-engine.service";

const CHOICES: ActivityId[] = ALL_INTERESTS;

/** Lets people choose which plan cards they see on Today. Stored on the device only. */
export function InterestsPicker({ onDone }: { onDone?: () => void }) {
  const { interests, setInterests } = useAppState();
  const [sel, setSel] = useState<ActivityId[]>(interests);
  const toggle = (a: ActivityId) => setSel((s) => (s.includes(a) ? s.filter((x) => x !== a) : [...s, a]));
  return (
    <section className="card" aria-labelledby="int-title">
      <h2 id="int-title" className="font-[family-name:var(--font-display)] text-lg font-bold">What do you plan around the weather?</h2>
      <p className="text-sm text-muted dark:text-slate-400">Pick what matters to you — Today will show those cards first.</p>
      <div className="mt-2 flex gap-3 text-sm font-semibold">
        <button type="button" onClick={() => setSel(CHOICES)} className="text-teal-ink underline dark:text-teal-soft">Select all</button>
        <button type="button" onClick={() => setSel([])} className="text-muted underline dark:text-slate-400">Clear</button>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {CHOICES.map((a) => (
          <button key={a} type="button" aria-pressed={sel.includes(a)} onClick={() => toggle(a)} className={`min-h-10 rounded-full px-4 text-sm font-semibold ring-1 ${sel.includes(a) ? "bg-navy text-white ring-navy dark:bg-teal-soft dark:text-navy" : "bg-white text-muted ring-navy/15 dark:bg-night-card dark:text-slate-300 dark:ring-white/15"}`}>
            {ACTIVITY_LABEL[a]}
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={() => {
          setInterests(sel.length ? sel : ["outdoor"]);
          onDone?.();
        }}
        className="mt-4 min-h-11 rounded-full bg-teal px-6 text-sm font-bold text-white"
      >
        Save
      </button>
    </section>
  );
}
