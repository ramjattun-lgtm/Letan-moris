"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { DEFAULT_LOCATION, getLocality, type Locality } from "@/data/localities";
import type { Island } from "@/lib/weather/types";
import { readLS, writeLS } from "@/lib/client/storage";

interface State {
  island: Island;
  location: Locality;
  favourites: string[];
  theme: "light" | "dark";
  ready: boolean;
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

  useEffect(() => {
    // Restore saved choices (stored on this device only).
    const fromUrl = new URLSearchParams(window.location.search).get("loc");
    const saved = fromUrl && getLocality(fromUrl) ? fromUrl : readLS<string>("letan.loc", DEFAULT_LOCATION.mauritius);
    /* eslint-disable react-hooks/set-state-in-effect */
    setLocId(getLocality(saved) ? saved : DEFAULT_LOCATION.mauritius);
    setFavourites(readLS<string[]>("letan.favs", []).filter((id) => getLocality(id)));
    setTheme(document.documentElement.classList.contains("dark") ? "dark" : "light");
    setReady(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  const location = getLocality(locId) ?? getLocality(DEFAULT_LOCATION.mauritius)!;

  const setLocation = useCallback((id: string) => {
    if (!getLocality(id)) return;
    setLocId(id);
    writeLS("letan.loc", id);
  }, []);

  const setIsland = useCallback(
    (i: Island) => {
      if (location.island === i) return;
      setLocation(DEFAULT_LOCATION[i]);
    },
    [location.island, setLocation],
  );

  const toggleFavourite = useCallback((id: string) => {
    setFavourites((f) => {
      const next = f.includes(id) ? f.filter((x) => x !== id) : [...f, id].slice(0, 12);
      writeLS("letan.favs", next);
      return next;
    });
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
    () => ({ island: location.island, location, favourites, theme, ready, setIsland, setLocation, toggleFavourite, toggleTheme }),
    [location, favourites, theme, ready, setIsland, setLocation, toggleFavourite, toggleTheme],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAppState() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAppState must be used inside AppStateProvider");
  return v;
}
