"use client";

import { useAppState } from "@/components/AppState";
import { OFFICIAL, OFFICIAL_LINKS } from "@/data/official-status";
import { useApi } from "@/lib/client/useApi";
import type { Forecast } from "@/lib/weather/types";
import { DEFAULT_LOCATION } from "@/data/localities";
import { dayLabel } from "@/lib/time";

const CHECKLIST = [
  "Keep a battery radio, torch, spare batteries and charged power banks.",
  "Store drinking water and non-perishable food for several days.",
  "Keep medicines, important documents and some cash in a waterproof bag.",
  "Secure or bring inside loose objects (pots, roof sheets, furniture).",
  "Know your nearest refugee centre and how to get there.",
  "Charge phones and follow official bulletins on radio, TV and the MMS website.",
  "Stay away from beaches, rivers and flood-prone areas during bad weather.",
  "Do not go outside during the eye of a cyclone — winds return suddenly.",
];

export default function CyclonePage() {
  const { island, ready } = useAppState();
  const o = OFFICIAL[island];
  const name = island === "rodrigues" ? "Rodrigues" : "Mauritius";
  // Independent model outlook (clearly labelled) for the main town of the island.
  const api = useApi<Forecast>(ready ? `/api/forecast?loc=${DEFAULT_LOCATION[island]}` : null);
  const f = api.data;

  return (
    <>
      <h1 className="mb-3 font-[family-name:var(--font-display)] text-2xl font-extrabold">Cyclone information — {name}</h1>

      <section className="card mb-4 border-2 border-navy/10 dark:border-white/10" aria-labelledby="official">
        <p className="chip bg-navy text-white dark:bg-teal-soft dark:text-navy">OFFICIAL INFORMATION</p>
        <h2 id="official" className="mt-2 text-lg font-bold">Official warning status for {name}</h2>
        {o.status === "not-entered" ? (
          <p className="mt-2">
            Letan Moris does not receive official warnings automatically yet. <strong>Always check Mauritius Meteorological Services (MMS)</strong> for the current cyclone warning status for {name} — MMS issues separate warnings for Mauritius and Rodrigues.
          </p>
        ) : (
          <div className="mt-2">
            <p className="text-lg font-bold">{o.headline}</p>
            <p className="text-sm text-muted dark:text-slate-400">
              Issued by MMS {o.issuedAtMU} · entered here {o.enteredAtMU} (Mauritius time). This may already be out of date —{" "}
              <a className="underline" href={o.sourceUrl || OFFICIAL_LINKS.mms.url} target="_blank" rel="noreferrer">check MMS now</a>.
            </p>
          </div>
        )}
        <div className="mt-3 flex flex-wrap gap-2">
          <a href={OFFICIAL_LINKS.mms.url} target="_blank" rel="noreferrer" className="min-h-11 rounded-full bg-navy px-4 py-2.5 text-sm font-semibold text-white dark:bg-teal-soft dark:text-navy">
            Open MMS website
          </a>
          <a href={OFFICIAL_LINKS.rsmc.url} target="_blank" rel="noreferrer" className="min-h-11 rounded-full bg-white px-4 py-2.5 text-sm font-semibold ring-1 ring-navy/15 dark:bg-night-card dark:ring-white/15">
            Regional cyclone centre (Météo-France La Réunion)
          </a>
        </div>
        <p className="mt-2 text-xs text-muted dark:text-slate-400">Cyclone season: roughly November to May. Warnings are also broadcast on radio and TV.</p>
      </section>

      <section className="card mb-4" aria-labelledby="model">
        <p className="chip bg-coral/20 text-coral-ink dark:text-coral">INDEPENDENT MODEL FORECAST — NOT A WARNING</p>
        <h2 id="model" className="mt-2 text-lg font-bold">Wind and rain outlook for {name} (7 days)</h2>
        {f ? (
          <ul className="mt-2 grid gap-2 sm:grid-cols-2">
            {f.daily.map((d) => (
              <li key={d.date} className="flex justify-between rounded-2xl bg-mist px-3 py-2 text-sm dark:bg-white/5">
                <span className="font-semibold">{dayLabel(d.date)}</span>
                <span>
                  gusts {d.windGustsMax === null ? "—" : Math.round(d.windGustsMax)} km/h · rain {d.precipitationSum ?? "—"} mm
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-muted">{api.error ? "Model forecast unavailable right now." : "Loading…"}</p>
        )}
        <p className="mt-2 text-xs text-muted dark:text-slate-400">
          Global models can misjudge the track and strength of tropical systems. Cyclone tracking maps will be added only when a reliable, permitted official data source is connected.
        </p>
      </section>

      <section className="card" aria-labelledby="prep">
        <h2 id="prep" className="text-lg font-bold">Be prepared — checklist</h2>
        <ul className="mt-2 space-y-2">
          {CHECKLIST.map((c) => (
            <li key={c} className="flex gap-2 text-sm">
              <span aria-hidden="true" className="mt-1 h-2 w-2 shrink-0 rounded-full bg-teal" />
              {c}
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-muted dark:text-slate-400">General advice only. Follow instructions from MMS and the authorities.</p>
      </section>
    </>
  );
}
