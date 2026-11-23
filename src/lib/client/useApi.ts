"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { readLS, writeLS } from "./storage";

export interface ApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  /** True when showing a previously saved copy because the live request failed. */
  fromCache: boolean;
  savedAt: string | null;
  /** Fetch again now (e.g. the Refresh button). */
  reload: () => void;
}

/**
 * Fetch one of our own API routes. The last good response is saved on the device so
 * that, if the network or the weather provider fails, the previous data can still be
 * shown — clearly labelled with its age. Data is never invented.
 */
export function useApi<T>(url: string | null, opts: { refreshMin?: number } = {}): ApiState<T> {
  const [state, setState] = useState<Omit<ApiState<T>, "reload">>({ data: null, loading: !!url, error: null, fromCache: false, savedAt: null });
  const [nonce, setNonce] = useState(0);
  const reload = useCallback(() => setNonce((n) => n + 1), []);
  const loadedUrl = useRef<string | null>(null);
  const refreshMin = opts.refreshMin ?? 0;

  // Optional automatic refresh while the page is open and visible.
  useEffect(() => {
    if (!url || !refreshMin) return;
    const t = setInterval(() => {
      if (document.visibilityState === "visible") reload();
    }, refreshMin * 60_000);
    const onShow = () => {
      if (document.visibilityState === "visible" && state.savedAt && Date.now() - Date.parse(state.savedAt) > refreshMin * 60_000) reload();
    };
    document.addEventListener("visibilitychange", onShow);
    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", onShow);
    };
  }, [url, refreshMin, reload, state.savedAt]);

  useEffect(() => {
    if (!url) return;
    let cancelled = false;
    const key = `letan.cache:${url}`;
    const cached = readLS<{ data: T; savedAt: string } | null>(key, null);
    const sameUrl = loadedUrl.current === url;
    loadedUrl.current = url;
    if (!sameUrl) setState({ data: cached?.data ?? null, loading: true, error: null, fromCache: !!cached, savedAt: cached?.savedAt ?? null });
    else setState((s) => ({ ...s, loading: true }));

    (async () => {
      try {
        const res = await fetch(url, sameUrl ? { cache: "no-store" } : undefined);
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
  }, [url, nonce]);

  return { ...state, reload };
}
