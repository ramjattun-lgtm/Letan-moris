"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { DEFAULT_LOCATION, getLocality, type Locality } from "@/data/localities";
import type { Island } from "@/lib/weather/types";
import { readLS, writeLS } from "@/lib/client/storage";
import type { ActivityId } from "@/lib/weather/intelligence/decision-engine.service";

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

  useEffect(() => {
    // Restore saved choices (stored on this device only).
    const fromUrl = new URLSearchParams(window.location.search).get("loc");
    const saved = fromUrl && getLocality(fromUrl) ? fromUrl : readLS<string>("letan.loc", DEFAULT_LOCATION.mauritius);
    /* eslint-disable react-hooks/set-state-in-effect */
    setLocId(getLocality(saved) ? saved : DEFAULT_LOCATION.mauritius);
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

  const setLocation = useCallback((id: string) => {
    if (!getLocality(id)) return;
    setLocId(id);
    setLocationChosen(true);
    writeLS("letan.loc", id);
    // Remember the last place used on each island, so switching back returns there.
    writeLS(`letan.loc.${getLocality(id)!.island}`, id);
  }, []);

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

  const value = useMemo(
    () => ({ island: location.island, location, favourites, theme, ready, interests, interestsChosen, locationChosen, setInterests, setIsland, setLocation, toggleFavourite, toggleTheme }),
    [location, favourites, theme, ready, interests, interestsChosen, locationChosen, setInterests, setIsland, setLocation, toggleFavourite, toggleTheme],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAppState() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAppState must be used inside AppStateProvider");
  return v;
}
