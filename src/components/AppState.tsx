"use client";

import { createContext, useRef, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { DEFAULT_LOCATION, getLocality, nearestLocality, type Locality } from "@/data/localities";
import { distanceKm } from "@/lib/weather/providers/gdacs.provider";
import type { Island } from "@/lib/weather/types";
import { readLS, writeLS } from "@/lib/client/storage";
import type { ActivityId } from "@/lib/weather/intelligence/decision-engine.service";
import { isLang, setCurrentLang, translate, type Key, type Lang } from "@/lib/i18n";
import { Fragment } from "react";

/** Everything is shown by default; people can narrow it down with "Change what I see". */
export const ALL_INTERESTS: ActivityId[] = ["school", "commute", "laundry", "beach", "outdoor", "gardening", "agriculture", "hiking", "kitesurf", "boating", "solar"];
export const DEFAULT_INTERESTS: ActivityId[] = ALL_INTERESTS;

interface State {
  island: Island;
  location: Locality;
  favourites: string[];
  theme: "light" | "dark";
  ready: boolean;
  interests: ActivityId[];
  interestsChosen: boolean;
  /** False until the person has picked a place (or used their location) on this device. */
  locationChosen: boolean;
  /** "Follow my location": the place updates by itself as the phone moves (position stays on the phone). */
  following: boolean;
  setFollowing: (on: boolean) => void;
  followNote: string | null;
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: Key, vars?: Record<string, string | number>) => string;
  setInterests: (a: ActivityId[]) => void;
  setIsland: (i: Island) => void;
  setLocation: (id: string) => void;
  toggleFavourite: (id: string) => void;
  toggleTheme: () => void;
}

const Ctx = createContext<State | null>(null);

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const [locId, setLocId] = useState<string>(DEFAULT_LOCATION.mauritius);
  const [favourites, setFavourites] = useState<string[]>([]);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [ready, setReady] = useState(false);
  const [interests, setInterestsState] = useState<ActivityId[]>(DEFAULT_INTERESTS);
  const [interestsChosen, setInterestsChosen] = useState(false);
  const [locationChosen, setLocationChosen] = useState(true);
  const [following, setFollowingState] = useState(false);
  const [followNote, setFollowNote] = useState<string | null>(null);
  const [lang, setLangState] = useState<Lang>("en");

  useEffect(() => {
    // Restore saved choices (stored on this device only).
    const fromUrl = new URLSearchParams(window.location.search).get("loc");
    const saved = fromUrl && getLocality(fromUrl) ? fromUrl : readLS<string>("letan.loc", DEFAULT_LOCATION.mauritius);
    /* eslint-disable react-hooks/set-state-in-effect */
    setLocId(getLocality(saved) ? saved : DEFAULT_LOCATION.mauritius);
    setFollowingState(readLS<boolean>("letan.follow", false));
    const savedLang = readLS<string>("letan.lang", "en");
    if (isLang(savedLang)) {
      setCurrentLang(savedLang);
      setLangState(savedLang);
    }
    setLocationChosen(!!fromUrl || readLS<string | null>("letan.loc", null) !== null);
    setFavourites(readLS<string[]>("letan.favs", []).filter((id) => getLocality(id)));
    setTheme(document.documentElement.classList.contains("dark") ? "dark" : "light");
    const savedInterests = readLS<ActivityId[] | null>("letan.interests", null);
    if (savedInterests) {
      setInterestsState(savedInterests);
      setInterestsChosen(true);
    }
    setReady(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  const location = getLocality(locId) ?? getLocality(DEFAULT_LOCATION.mauritius)!;

  // Picking a place by hand stops "Follow my location"; the automatic updates use applyLocation.
  const applyLocation = useCallback((id: string) => {
    if (!getLocality(id)) return;
    setLocId(id);
    setLocationChosen(true);
    writeLS("letan.loc", id);
    // Remember the last place used on each island, so switching back returns there.
    writeLS(`letan.loc.${getLocality(id)!.island}`, id);
  }, []);

  const setLocation = useCallback(
    (id: string) => {
      applyLocation(id);
      setFollowingState(false);
      writeLS("letan.follow", false);
      setFollowNote(null);
    },
    [applyLocation],
  );

  const setFollowing = useCallback((on: boolean) => {
    setFollowingState(on);
    writeLS("letan.follow", on);
    if (!on) setFollowNote(null);
  }, []);

  const locRef = useRef<string>("");
  useEffect(() => {
    locRef.current = locId;
  }, [locId]);

  // Follow my location: watch the phone's position and switch to the nearest place when it changes.
  // Only runs while switched on; the position never leaves the phone.
  useEffect(() => {
    if (!following || !navigator.geolocation) return;
    const onPos = (pos: GeolocationPosition) => {
      const { latitude: lat, longitude: lon } = pos.coords;
      const near = nearestLocality(lat, lon);
      if (distanceKm({ lat, lon }, near) > 30) {
        setFollowNote("You are far from Mauritius and Rodrigues — keeping the last place.");
        return;
      }
      if (locRef.current !== near.id) {
        applyLocation(near.id);
        setFollowNote(`Updated to ${near.name}, nearest to you.`);
      }
    };
    const onErr = (err: GeolocationPositionError) => {
      if (err.code === err.PERMISSION_DENIED) {
        setFollowingState(false);
        writeLS("letan.follow", false);
        setFollowNote("Location permission is off, so the place can't follow you. Allow location for this site in your browser settings.");
      }
    };
    const opts = { enableHighAccuracy: false, maximumAge: 120_000, timeout: 20_000 };
    const watch = navigator.geolocation.watchPosition(onPos, onErr, opts);
    // Phones pause watching in the background: check again whenever the app comes back.
    const onShow = () => {
      if (document.visibilityState === "visible") navigator.geolocation.getCurrentPosition(onPos, onErr, opts);
    };
    document.addEventListener("visibilitychange", onShow);
    return () => {
      navigator.geolocation.clearWatch(watch);
      document.removeEventListener("visibilitychange", onShow);
    };
  }, [following, applyLocation]);

  const setIsland = useCallback(
    (i: Island) => {
      if (location.island === i) return;
      writeLS(`letan.loc.${location.island}`, location.id);
      const last = readLS<string>(`letan.loc.${i}`, DEFAULT_LOCATION[i]);
      const ok = getLocality(last)?.island === i;
      setLocation(ok ? last : DEFAULT_LOCATION[i]);
    },
    [location.island, location.id, setLocation],
  );

  const toggleFavourite = useCallback((id: string) => {
    setFavourites((f) => {
      const next = f.includes(id) ? f.filter((x) => x !== id) : [...f, id].slice(0, 12);
      writeLS("letan.favs", next);
      return next;
    });
  }, []);

  const setInterests = useCallback((a: ActivityId[]) => {
    setInterestsState(a);
    setInterestsChosen(true);
    writeLS("letan.interests", a);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((t) => {
      const next = t === "dark" ? "light" : "dark";
      document.documentElement.classList.toggle("dark", next === "dark");
      writeLS("letan.theme", next);
      return next;
    });
  }, []);

  const setLang = useCallback((l: Lang) => {
    setCurrentLang(l);
    setLangState(l);
    writeLS("letan.lang", l);
  }, []);
  useEffect(() => {
    document.documentElement.lang = lang === "mfe" ? "mfe" : lang;
  }, [lang]);
  const t = useCallback((key: Key, vars?: Record<string, string | number>) => translate(lang, key, vars), [lang]);

  const value = useMemo(
    () => ({ island: location.island, location, favourites, theme, ready, interests, interestsChosen, locationChosen, following, setFollowing, followNote, lang, setLang, t, setInterests, setIsland, setLocation, toggleFavourite, toggleTheme }),
    [location, favourites, theme, ready, interests, interestsChosen, locationChosen, following, setFollowing, followNote, lang, setLang, t, setInterests, setIsland, setLocation, toggleFavourite, toggleTheme],
  );
  // Keyed by language: switching language re-renders the whole app with the new words.
  return (
    <Ctx.Provider value={value}>
      <Fragment key={lang}>{children}</Fragment>
    </Ctx.Provider>
  );
}

export function useAppState() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAppState must be used inside AppStateProvider");
  return v;
}
