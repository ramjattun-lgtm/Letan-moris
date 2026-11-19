"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchReports, summariseByPlace, type PlaceSummary } from "@/lib/community/lapli";

/** Polls community rain reports every 2 minutes while the page is open. */
export function useLapli() {
  const [places, setPlaces] = useState<PlaceSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    try {
      const r = await fetchReports();
      setPlaces(summariseByPlace(r));
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    const t = setInterval(() => document.visibilityState === "visible" && load(), 120_000);
    const onReport = () => load();
    window.addEventListener("lapli:sent", onReport);
    return () => {
      clearInterval(t);
      window.removeEventListener("lapli:sent", onReport);
    };
  }, [load]);
  return { places, error, reload: load };
}
