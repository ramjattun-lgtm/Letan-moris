import { type NextRequest, NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { dbEnabled, oneWay, recordVisit, visitCounts } from "@/lib/community/db.server";
import { todayMU } from "@/lib/time";

export const dynamic = "force-dynamic";

// Counts are refreshed at most every 30 minutes, so the free database mostly sleeps.
const cachedCounts = unstable_cache((day: string) => visitCounts(day), ["visit-counts-v1"], { revalidate: 1800 });

export async function GET() {
  if (!dbEnabled()) return NextResponse.json({ enabled: false }, { headers: { "Cache-Control": "no-store" } });
  try {
    return NextResponse.json({ enabled: true, ...(await cachedCounts(todayMU())) }, { headers: { "Cache-Control": "public, s-maxage=300" } });
  } catch {
    return NextResponse.json({ enabled: false }, { headers: { "Cache-Control": "no-store" } });
  }
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/** { device } — the phone's anonymous ID. Sent at most once a day by the app. */
export async function POST(req: NextRequest) {
  if (!dbEnabled()) return NextResponse.json({ enabled: false }, { status: 503 });
  const body = (await req.json().catch(() => null)) as { device?: string } | null;
  if (!body || typeof body.device !== "string" || !UUID.test(body.device) || /^0+-/.test(body.device)) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  try {
    await recordVisit(oneWay(`dev:${body.device}`), todayMU());
    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "unavailable" }, { status: 502 });
  }
}
