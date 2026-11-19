import { NextResponse } from "next/server";
import { listProviders } from "@/lib/weather/services/provider-selection.service";
import { getForecastFor } from "@/lib/weather/services/forecast.service";

export const dynamic = "force-dynamic";

/** Provider health check (uses the cached Port Louis forecast, so it costs no extra API calls when warm). */
export async function GET() {
  const started = Date.now();
  let status: "ok" | "degraded" = "ok";
  let detail = "";
  try {
    const f = await getForecastFor("port-louis");
    if (!f.hourly.length) {
      status = "degraded";
      detail = "Empty hourly data";
    }
  } catch (e) {
    status = "degraded";
    detail = (e as Error).message;
  }
  return NextResponse.json({ status, detail, ms: Date.now() - started, providers: listProviders(), checkedAt: new Date().toISOString() }, { headers: { "Cache-Control": "no-store" } });
}
