"use client";

import { useMemo, useState } from "react";
import { DISTRICTS, getLocality, nearestLocality, searchLocalities, REGION_LABEL } from "@/data/localities";
import { useAppState } from "./AppState";

export function LocationPicker() {
  const { location, island, setLocation, favourites, toggleFavourite } = useAppState();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [district, setDistrict] = useState<string>("");
  const [geoMsg, setGeoMsg] = useState<string | null>(null);

  const results = useMemo(() => {
    const r = searchLocalities(q, island);
    return district ? r.filter((l) => l.district === district) : r;
  }, [q, island, district]);

  const fav = favourites.includes(location.id);

  function useMyLocation() {
    if (!navigator.geolocation) {
      setGeoMsg("Location is not available on this device.");
      return;
    }
    setGeoMsg("Finding your location…");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        // Your position is used only on this device to pick the nearest place; it is not sent anywhere.
        const near = nearestLocality(pos.coords.latitude, pos.coords.longitude);
        setLocation(near.id);
        setGeoMsg(`Nearest place: ${near.name}`);
        setOpen(false);
      },
      () => setGeoMsg("Could not get your location. Choose a place from the list instead."),
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 600_000 },
    );
  }

  return (
    <div className="mb-4">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="flex min-h-11 flex-1 items-center gap-2 rounded-2xl bg-white px-4 text-left shadow-sm ring-1 ring-navy/5 dark:bg-night-card dark:ring-white/10"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" className="text-teal-ink dark:text-teal-soft">
            <path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11Z" />
            <circle cx="12" cy="10" r="2.5" />
          </svg>
          <span className="flex-1">
            <span className="block font-[family-name:var(--font-display)] text-lg font-bold leading-tight">{location.name}</span>
            <span className="block text-xs text-muted dark:text-slate-400">
              {location.district === "Rodrigues" ? "Rodrigues" : `${location.district} · ${REGION_LABEL[location.region]}`}
            </span>
          </span>
          <span className="text-sm font-semibold text-teal-ink dark:text-teal-soft">Change</span>
        </button>
        <button
          type="button"
          onClick={() => toggleFavourite(location.id)}
          aria-pressed={fav}
          aria-label={fav ? `Remove ${location.name} from saved places` : `Save ${location.name}`}
          className="grid h-11 w-11 place-items-center rounded-2xl bg-white shadow-sm ring-1 ring-navy/5 dark:bg-night-card dark:ring-white/10"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" fill={fav ? "#F2A541" : "none"} stroke={fav ? "#F2A541" : "currentColor"} strokeWidth="2">
            <path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9Z" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      {open && (
        <div className="card mt-2">
          <div className="flex flex-col gap-2 sm:flex-row">
            <label className="flex-1">
              <span className="sr-only">Search places</span>
              <input
                autoFocus
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={island === "rodrigues" ? "Search e.g. La Ferme" : "Search e.g. Curepipe, Flic en Flac"}
                className="min-h-11 w-full rounded-xl bg-mist px-3 text-base outline-none ring-1 ring-navy/10 dark:bg-night dark:ring-white/10"
              />
            </label>
            {island === "mauritius" && (
              <label>
                <span className="sr-only">District</span>
                <select value={district} onChange={(e) => setDistrict(e.target.value)} className="min-h-11 w-full rounded-xl bg-mist px-3 ring-1 ring-navy/10 dark:bg-night dark:ring-white/10">
                  <option value="">All districts</option>
                  {DISTRICTS.mauritius.map((d) => (
                    <option key={d}>{d}</option>
                  ))}
                </select>
              </label>
            )}
            <button type="button" onClick={useMyLocation} className="min-h-11 rounded-xl bg-navy px-4 text-sm font-semibold text-white dark:bg-teal-soft dark:text-navy">
              Use my location
            </button>
          </div>
          {geoMsg && <p className="mt-2 text-sm text-muted dark:text-slate-400">{geoMsg}</p>}
          {favourites.length > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-muted dark:text-slate-400">Saved:</span>
              {favourites.map((id) => (
                <button key={id} type="button" onClick={() => { setLocation(id); setOpen(false); }} className="min-h-9 rounded-full bg-coral/15 px-3 text-sm font-semibold">
                  {getLocality(id)?.name}
                </button>
              ))}
              <a href="/locations" className="text-sm font-semibold text-teal-ink underline dark:text-teal-soft">Compare</a>
            </div>
          )}
          <ul className="mt-3 grid max-h-80 grid-cols-1 gap-1 overflow-y-auto sm:grid-cols-2">
            {results.map((l) => (
              <li key={l.id}>
                <button
                  type="button"
                  onClick={() => {
                    setLocation(l.id);
                    setOpen(false);
                    setQ("");
                  }}
                  className={`flex min-h-11 w-full items-center justify-between rounded-xl px-3 text-left text-sm hover:bg-mist dark:hover:bg-white/5 ${l.id === location.id ? "bg-teal/10 font-semibold" : ""}`}
                >
                  <span>{l.name}</span>
                  <span className="text-xs text-muted dark:text-slate-400">{l.kind === "beach" ? "Beach · " : ""}{l.district}</span>
                </button>
              </li>
            ))}
            {results.length === 0 && <li className="px-3 py-2 text-sm text-muted">No place found. Try another spelling.</li>}
          </ul>
        </div>
      )}
    </div>
  );
}
