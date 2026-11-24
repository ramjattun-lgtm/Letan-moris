"use client";

import { useEffect, useMemo, useState } from "react";
import { AreaAlertsButton } from "./AreaAlertsButton";
import { climateKeyFor } from "@/lib/weather/intelligence/climate.service";
import { DISTRICTS, getLocality, nearestLocality, searchLocalities, REGION_LABEL } from "@/data/localities";
import { useAppState } from "./AppState";
import { tr } from "@/lib/i18n";

/** Browser permission for location: "granted", "prompt", "denied" or null if the browser won't say. */
function useGeoPermission() {
  const [state, setState] = useState<PermissionState | null>(null);
  useEffect(() => {
    let status: PermissionStatus | null = null;
    navigator.permissions
      ?.query({ name: "geolocation" as PermissionName })
      .then((s) => {
        status = s;
        setState(s.state);
        s.onchange = () => setState(s.state);
      })
      .catch(() => {});
    return () => {
      if (status) status.onchange = null;
    };
  }, []);
  return state;
}

/**
 * Where you are. With `setup`, new visitors see a short first-time box: use my location (asks
 * the phone for permission), or pick from the list, and turn on free alerts for the area.
 */
export function LocationPicker({ setup = false }: { setup?: boolean }) {
  const { location, island, setLocation, favourites, toggleFavourite, locationChosen, ready, t, following, setFollowing, followNote } = useAppState();
  const geo = useGeoPermission();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [district, setDistrict] = useState<string>("");
  const [geoMsg, setGeoMsg] = useState<string | null>(null);

  const results = useMemo(() => {
    const r = searchLocalities(q, island);
    return district ? r.filter((l) => l.district === district) : r;
  }, [q, island, district]);

  const fav = favourites.includes(location.id);

  /** Turn "Follow my location" on: first fix now, then the app keeps updating as you move. */
  function followMe() {
    if (!navigator.geolocation) {
      setGeoMsg("Location is not available on this device.");
      return;
    }
    setGeoMsg("Finding your location…");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const near = nearestLocality(pos.coords.latitude, pos.coords.longitude);
        setLocation(near.id);
        setFollowing(true);
        setGeoMsg(null);
        setOpen(false);
      },
      (err) =>
        setGeoMsg(
          err.code === err.PERMISSION_DENIED
            ? "Location permission is off for this site. To allow it: tap the padlock or ⓘ next to the web address → Permissions → Location → Allow. Or choose a place from the list."
            : "Could not get your location. Choose a place from the list instead.",
        ),
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 120_000 },
    );
  }

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
      (err) =>
        setGeoMsg(
          err.code === err.PERMISSION_DENIED
            ? "Location permission is off for this site. To allow it: tap the padlock or ⓘ next to the web address → Permissions → Location → Allow. Or choose a place from the list."
            : "Could not get your location. Choose a place from the list instead.",
        ),
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 600_000 },
    );
  }

  const showSetup = setup && ready && !locationChosen;

  return (
    <div className="mb-3">
      {showSetup && (
        <div className="mb-2 rounded-2xl border-l-4 border-l-coral bg-coral/10 p-3 text-sm" role="note">
          <p className="font-bold">{t("setup.title")}</p>
          <p className="mt-0.5">{t("setup.text", { place: location.name })}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button type="button" onClick={followMe} className="min-h-10 rounded-full bg-navy px-4 font-semibold text-white dark:bg-teal-soft dark:text-navy">
              {t("setup.gps")}
            </button>
            <button type="button" onClick={() => setOpen(true)} className="min-h-10 rounded-full px-4 font-semibold ring-1 ring-navy/20 dark:ring-white/20">
              {t("setup.list")}
            </button>
            <button type="button" onClick={() => setLocation(location.id)} className="min-h-10 px-2 text-xs text-muted underline dark:text-slate-400">
              {t("setup.keep", { place: location.name })}
            </button>
          </div>
          {geo === "denied" && (
            <p className="mt-2 text-xs">
              {t("setup.blocked")}
            </p>
          )}
          {geoMsg && <p className="mt-2 text-xs">{tr(geoMsg)}</p>}
        </div>
      )}
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
            <span className="block font-[family-name:var(--font-display)] text-lg font-bold leading-tight">{tr(location.name)}</span>
            <span className="block text-xs text-muted dark:text-slate-400">
              {tr(location.district === "Rodrigues" ? "Rodrigues" : `${location.district} · ${REGION_LABEL[location.region]}`)}
            </span>
          </span>
          <span className="text-sm font-semibold text-teal-ink dark:text-teal-soft">{t("place.change")}</span>
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

      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
        {following ? (
          <>
            <span className="inline-flex items-center gap-1 rounded-full bg-teal/15 px-3 py-1.5 font-semibold text-teal-ink dark:text-teal-soft" role="status">
              <span aria-hidden="true" className="h-2 w-2 animate-pulse rounded-full bg-teal" /> {tr("Following your location")}
            </span>
            <button type="button" onClick={() => setFollowing(false)} className="min-h-9 px-1 text-muted underline dark:text-slate-400">
              {tr("Stop")}
            </button>
          </>
        ) : (
          !showSetup && (
            <button type="button" onClick={followMe} className="min-h-9 rounded-full px-3 font-semibold text-teal-ink ring-1 ring-teal/40 dark:text-teal-soft" title={tr("The place updates by itself as you move. Your position stays on this phone.")}>
              📍 {tr("Follow my location")}
            </button>
          )
        )}
        {(followNote || (!showSetup && geoMsg)) && <span className="text-muted dark:text-slate-400">{tr(followNote ?? geoMsg ?? "")}</span>}
      </div>

      {setup && !showSetup && (
        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted dark:text-slate-400">
          <span>{t("alerts.phone")}</span>
          <AreaAlertsButton areaKey={climateKeyFor(location)} />
        </div>
      )}

      {open && (
        <div className="card mt-2">
          <div className="flex flex-col gap-2 sm:flex-row">
            <label className="flex-1">
              <span className="sr-only">{tr("Search places")}</span>
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
                <span className="sr-only">{tr("District")}</span>
                <select value={district} onChange={(e) => setDistrict(e.target.value)} className="min-h-11 w-full rounded-xl bg-mist px-3 ring-1 ring-navy/10 dark:bg-night dark:ring-white/10">
                  <option value="">{tr("All districts")}</option>
                  {DISTRICTS.mauritius.map((d) => (
                    <option key={d}>{tr(d)}</option>
                  ))}
                </select>
              </label>
            )}
            <button type="button" onClick={useMyLocation} className="min-h-11 rounded-xl bg-navy px-4 text-sm font-semibold text-white dark:bg-teal-soft dark:text-navy">
              {tr("Use my location")}
            </button>
          </div>
          {geoMsg && <p className="mt-2 text-sm text-muted dark:text-slate-400">{tr(geoMsg)}</p>}
          {favourites.length > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-muted dark:text-slate-400">{tr("Saved:")}</span>
              {favourites.map((id) => (
                <button key={id} type="button" onClick={() => { setLocation(id); setOpen(false); }} className="min-h-9 rounded-full bg-coral/15 px-3 text-sm font-semibold">
                  {tr((getLocality(id)?.name) ?? "")}
                </button>
              ))}
              <a href="/locations" className="text-sm font-semibold text-teal-ink underline dark:text-teal-soft">{tr("Compare")}</a>
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
                  <span>{tr(l.name)}</span>
                  <span className="text-xs text-muted dark:text-slate-400">{tr(l.kind === "beach" ? tr("Beach · ") : "")}{tr(l.district)}</span>
                </button>
              </li>
            ))}
            {results.length === 0 && <li className="px-3 py-2 text-sm text-muted">{tr("No place found. Try another spelling.")}</li>}
          </ul>
        </div>
      )}
    </div>
  );
}
