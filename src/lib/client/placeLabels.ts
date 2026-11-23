"use client";

import { useCallback, useEffect, useState } from "react";
import { readLS, writeLS } from "./storage";

// Optional labels for saved places (Home, Work, School…). Stored on this device only.
export const PLACE_LABELS = ["Home", "Work", "School", "Family", "Beach"] as const;
const KEY = "letan.placeLabels";

export function usePlaceLabels() {
  const [labels, setLabels] = useState<Record<string, string>>({});
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setLabels(readLS<Record<string, string>>(KEY, {})), []);
  const setLabel = useCallback((id: string, label: string | null) => {
    setLabels((prev) => {
      const next = { ...prev };
      if (label) next[id] = label;
      else delete next[id];
      writeLS(KEY, next);
      return next;
    });
  }, []);
  return { labels, setLabel };
}
