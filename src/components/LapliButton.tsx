"use client";

import { useState } from "react";
import { useAppState } from "./AppState";
import { KINDS, sendReport, cooldownLeft, nowMs, type ReportKind } from "@/lib/community/lapli";
import { nearestLocality, getLocality } from "@/data/localities";
import { readLS, writeLS } from "@/lib/client/storage";

/** Floating "Lapli isi!" button: one-tap community rain report for your village. */
export function LapliButton() {
  const { location } = useAppState();
  const [open, setOpen] = useState(false);
  const [placeId, setPlaceId] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const place = getLocality(placeId) ?? location;

  function useGps() {
    if (!navigator.geolocation) return setMsg("Location not available on this phone.");
    navigator.geolocation.getCurrentPosition(
      (p) => setPlaceId(nearestLocality(p.coords.latitude, p.coords.longitude).id),
      () => setMsg("Could not get your location — the place shown will be used."),
      { timeout: 10_000, maximumAge: 300_000 },
    );
  }

  async function send(kind: ReportKind) {
    const wait = cooldownLeft(readLS<number>("letan.lapli.last", 0));
    if (wait > 0) return setMsg(`Thanks — you can send another report in ${wait} min.`);
    setBusy(true);
    try {
      await sendReport(place.id, kind);
      writeLS("letan.lapli.last", nowMs());
      window.dispatchEvent(new Event("lapli:sent"));
      setMsg(`Mersi! Your report for ${place.name} helps everyone nearby.`);
      setTimeout(() => setOpen(false), 1800);
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setOpen(true);
          setMsg(null);
          setPlaceId(null);
        }}
        className="fixed bottom-20 right-4 z-40 flex min-h-12 items-center gap-2 rounded-full bg-rain px-4 font-bold text-white shadow-lg lg:bottom-6"
        aria-haspopup="dialog"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M12 3s-6 7-6 11a6 6 0 0 0 12 0c0-4-6-11-6-11Z" />
        </svg>
        Lapli isi!
      </button>
      {open && (
        <div role="dialog" aria-modal="true" aria-labelledby="lapli-title" className="fixed inset-0 z-50 flex items-end justify-center bg-navy/40 p-3 sm:items-center" onClick={() => setOpen(false)}>
          <div className="card w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between">
              <h2 id="lapli-title" className="font-[family-name:var(--font-display)] text-xl font-extrabold">Lapli isi? What is it like where you are?</h2>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="h-10 w-10 text-2xl leading-none">×</button>
            </div>
            <p className="mt-1 text-sm">
              Place: <strong>{place.name}</strong>{" "}
              <button type="button" onClick={useGps} className="ml-1 font-semibold text-teal-ink underline dark:text-teal-soft">Use my location</button>
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {KINDS.filter((k) => !k.hazard).map((k) => (
                <button key={k.id} type="button" disabled={busy} onClick={() => send(k.id)} className={`min-h-16 rounded-2xl p-2 text-left font-bold ${k.id === "flooding" ? "bg-[#D9480F] text-white" : k.id === "heavy" ? "bg-rain text-white" : k.id === "stopped" ? "bg-mist dark:bg-white/10" : "bg-rain/15"}`}>
                  {k.kreol}
                  <span className="block text-xs font-normal opacity-80">{k.english}</span>
                </button>
              ))}
            </div>
            <p className="mt-3 text-xs font-semibold text-muted dark:text-slate-400">Something else nearby?</p>
            <div className="mt-1 grid grid-cols-3 gap-2">
              {KINDS.filter((k) => k.hazard).map((k) => (
                <button key={k.id} type="button" disabled={busy} onClick={() => send(k.id)} className="min-h-14 rounded-2xl bg-coral/20 p-2 text-left text-sm font-bold">
                  {k.kreol}
                  <span className="block text-[11px] font-normal opacity-80">{k.english}</span>
                </button>
              ))}
            </div>
            {msg && <p role="status" className="mt-3 text-sm font-semibold">{msg}</p>}
            <p className="mt-3 text-[11px] text-muted dark:text-slate-400">
              Only your village name and what you saw are shared — no GPS position, no name, no account. Reports are public, unverified, and disappear after 3 hours. In danger? Call 999 / 112.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
