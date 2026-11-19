"use client";

import { useEffect, useState } from "react";
import { readLS, writeLS } from "./storage";

export interface ApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  /** True when showing a previously saved copy because the live request failed. */
  fromCache: boolean;
  savedAt: string | null;
}

/**
 * Fetch one of our own API routes. The last good response is saved on the device so
 * that, if the network or the weather provider fails, the previous data can still be
 * shown — clearly labelled with its age. Data is never invented.
 */
export function useApi<T>(url: string | null): ApiState<T> {
  const [state, setState] = useState<ApiState<T>>({ data: null, loading: !!url, error: null, fromCache: false, savedAt: null });

  useEffect(() => {
    if (!url) return;
    let cancelled = false;
    const key = `letan.cache:${url}`;
    const cached = readLS<{ data: T; savedAt: string } | null>(key, null);
    setState({ data: cached?.data ?? null, loading: true, error: null, fromCache: !!cached, savedAt: cached?.savedAt ?? null });

    (async () => {
      try {
        const res = await fetch(url);
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body?.message ?? `Request failed (${res.status})`);
        const savedAt = new Date().toISOString();
        writeLS(key, { data: body, savedAt });
        if (!cancelled) setState({ data: body as T, loading: false, error: null, fromCache: false, savedAt });
      } catch (e) {
        if (!cancelled)
          setState((s) => ({ ...s, loading: false, error: (e as Error).message || "Network error", fromCache: !!s.data }));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [url]);

  return state;
}
