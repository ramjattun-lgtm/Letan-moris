"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { TAGLINE } from "./Logo";

const DOES = [
  { icon: "🗓️", title: "Plan your day", text: "Hour-by-hour rain for your village, the last vs next 3 hours with a check of how accurate the forecast was, activity cards (commute, beach, laundry, hiking, solar…) and a trip planner that finds the best time to leave." },
  { icon: "🛟", title: "Stay safe", text: "Heavy-rain and flash-flood risk with the 16 known flood-prone areas on the map, heat stress for outdoor work, mosquito weather, and cyclone tracking with similar past storms and a season scorecard." },
  { icon: "📊", title: "See the bigger picture", text: "Rain over the reservoir catchments against the normal rain level, 30-year climate trends, and lagoon warmth & coral stress." },
  { icon: "🔭", title: "Look ahead", text: "An event date checker for any date in the next year, long-range rain outlooks, and stargazing tonight." },
  { icon: "💧", title: "Community", text: "Lapli isi! — report rain where you are in one tap, no account. People downwind are told when rain is coming their way." },
];

const DIFFERENT = [
  { title: "Local, both islands", text: "Village-level forecasts for about 64 places, with Rodrigues covered as fully as Mauritius." },
  { title: "Forecast + history", text: "Every number comes with what is normal for this place and date, from 30 years of local climate." },
  { title: "Honest about uncertainty", text: "It shows when weather models agree or disagree, how past forecasts did, and where the data comes from." },
  { title: "Respects official sources", text: "Never imitates MMS, and always points to MMS, the CWA and the Ministry of Health for official information." },
  { title: "Free and non-commercial", text: "No ads, no tracking, no account." },
];

/** Small "What is Letan Moris?" graphic at the top of Today; opens a friendly explanation. */
export function AboutBanner() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        className="relative mb-3 flex w-full items-center gap-3 overflow-hidden rounded-3xl bg-gradient-to-r from-navy via-[#0E4A5E] to-teal p-3 text-left text-white shadow-sm"
      >
        <svg width="56" height="56" viewBox="0 0 64 64" aria-hidden="true" className="shrink-0">
          <circle cx="44" cy="18" r="9" fill="#F2A541" />
          <path d="M14 30a10 10 0 0 1 19-3 8 8 0 0 1 10 8H14a5 5 0 0 1 0-5Z" fill="#E7EEF2" />
          <path d="M18 40l-2 5M26 40l-2 5M34 40l-2 5" stroke="#5AA2FF" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M4 60l14-10 7 4 9-12 10 9 6-4 10 13Z" fill="#3CCFCF" opacity="0.9" />
          <path d="M33 42l1.5-4 1.5 4" fill="#F4F8F9" />
        </svg>
        <span className="min-w-0 flex-1">
          <span className="block text-xs font-semibold uppercase tracking-wide text-teal-soft">What is Letan Moris?</span>
          <span className="block font-[family-name:var(--font-display)] text-base font-extrabold leading-tight">Weather that tells you what to do — village by village.</span>
          <span className="block text-xs opacity-80">Tap to find out more</span>
        </span>
        <span aria-hidden="true" className="text-2xl opacity-80">›</span>
      </button>

      {open && (
        <div role="dialog" aria-modal="true" aria-labelledby="about-title" className="fixed inset-0 z-50 flex items-end justify-center bg-navy/50 sm:items-center sm:p-4" onClick={() => setOpen(false)}>
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-t-3xl bg-white shadow-xl sm:rounded-3xl dark:bg-night-card" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 z-10 bg-gradient-to-r from-navy via-[#0E4A5E] to-teal px-5 pb-4 pt-3 text-white">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h2 id="about-title" className="font-[family-name:var(--font-display)] text-2xl font-extrabold">Letan Moris</h2>
                  <p className="text-sm italic text-teal-soft">&quot;{TAGLINE}&quot;</p>
                </div>
                <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="h-10 w-10 shrink-0 rounded-full bg-white/15 text-2xl leading-none">×</button>
              </div>
            </div>

            <div className="space-y-5 px-5 py-4 text-sm">
              <p className="text-base font-semibold">
                A free, independent weather app for Mauritius and Rodrigues that turns forecasts into plain answers for your day: when it will rain where you are, whether it&apos;s a good day for the beach or the commute, and how this compares with what&apos;s normal.
              </p>
              <p>
                Most weather apps give you numbers; Letan Moris gives you decisions. It covers about 64 places across both islands, down to village level. Every forecast is backed by 30 years of local climate history, checked against airport readings and reports from people nearby, and labelled with how confident it is. It always defers to MMS for official warnings, never invents data, and posts a daily forecast to Facebook.
              </p>

              <section>
                <h3 className="label mb-2">What it does</h3>
                <ul className="grid gap-2 sm:grid-cols-2">
                  {DOES.map((d) => (
                    <li key={d.title} className="flex gap-3 rounded-2xl bg-mist p-3 dark:bg-white/5">
                      <span aria-hidden="true" className="text-2xl">{d.icon}</span>
                      <span>
                        <span className="block font-bold">{d.title}</span>
                        <span className="block text-[13px] text-muted dark:text-slate-300">{d.text}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </section>

              <section>
                <h3 className="label mb-2">What makes it different</h3>
                <ol className="space-y-2">
                  {DIFFERENT.map((d, i) => (
                    <li key={d.title} className="flex gap-3">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-teal text-sm font-bold text-white">{i + 1}</span>
                      <span>
                        <strong>{d.title}.</strong> {d.text}
                      </span>
                    </li>
                  ))}
                </ol>
              </section>

              <p className="rounded-2xl border-2 border-[#C92A2A] bg-[#FFF0F0] p-3 text-[13px] text-[#A61E1E] dark:bg-[#3A1212] dark:text-[#FFB4B4]">
                <strong>Independent forecasts — not official warnings.</strong> For cyclone and heavy-rain warnings always follow{" "}
                <a className="underline" href="http://metservice.intnet.mu/" target="_blank" rel="noreferrer">Mauritius Meteorological Services (MMS)</a>.
              </p>

              <div className="flex flex-wrap gap-2 pb-2">
                <Link href="/explore" onClick={() => setOpen(false)} className="rounded-full bg-navy px-4 py-2 font-semibold text-white dark:bg-teal-soft dark:text-navy">Explore all tools</Link>
                <Link href="/about" onClick={() => setOpen(false)} className="rounded-full px-4 py-2 font-semibold text-teal-ink ring-1 ring-teal/40 dark:text-teal-soft">Data sources &amp; privacy</Link>
                <button type="button" onClick={() => setOpen(false)} className="rounded-full px-4 py-2 font-semibold text-muted">Close</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
