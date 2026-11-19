import { NextResponse } from "next/server";
import { NotFoundError } from "@/lib/weather/services/forecast.service";
import { ProviderError } from "@/lib/weather/providers/weather-provider.interface";

/** Shared JSON response with CDN caching so visitors are served from cache, not the provider. */
export function ok(data: unknown, sMaxAge = 900) {
  return NextResponse.json(data, {
    headers: { "Cache-Control": `public, s-maxage=${sMaxAge}, stale-while-revalidate=86400` },
  });
}

export function fail(e: unknown) {
  if (e instanceof NotFoundError) return NextResponse.json({ error: "not_found", message: e.message }, { status: 404 });
  const message = e instanceof ProviderError ? e.message : "Weather data is temporarily unavailable.";
  console.error("[api]", e);
  return NextResponse.json({ error: "provider_unavailable", message }, { status: 502, headers: { "Cache-Control": "no-store" } });
}

/** Only allow simple ids like "port-louis". */
export const validId = (s: string | null): s is string => !!s && /^[a-z0-9-]{2,40}$/.test(s);
