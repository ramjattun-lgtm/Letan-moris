import { type NextRequest, NextResponse } from "next/server";
import { revalidateTag, unstable_cache } from "next/cache";
import { getLocality } from "@/data/localities";
import { isValidKind } from "@/lib/community/lapli";
import { addReport, dbEnabled, flag, LimitError, like, oneWay, recentReports } from "@/lib/community/db.server";

export const dynamic = "force-dynamic";
const noStore = { "Cache-Control": "no-store" };
const json = (data: unknown, status = 200) => NextResponse.json(data, { status, headers: noStore });

// Reads are cached and only refreshed after a new report, like or flag (or every 5 minutes),
// so the free database sleeps most of the time and stays within its monthly allowance.
const TAG = "community";
const cachedReports = unstable_cache(recentReports, ["community-reports-v1"], { tags: [TAG], revalidate: 300 });

/** Community reports from the last 3 hours. `enabled: false` tells the app to use ntfy instead. */
export async function GET() {
  if (!dbEnabled()) return json({ enabled: false });
  try {
    return NextResponse.json({ enabled: true, reports: await cachedReports() }, { headers: { "Cache-Control": "public, s-maxage=10" } });
  } catch (e) {
    console.error("[community]", e);
    return json({ enabled: false, message: "Community database unavailable" });
  }
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const ID = /^\d{1,18}$/;

/** { action: "report", loc, kind } | { action: "like" | "flag", id } — plus the phone's anonymous `device`. */
export async function POST(req: NextRequest) {
  if (!dbEnabled()) return json({ error: "disabled", message: "Community database not connected" }, 503);
  const body = (await req.json().catch(() => null)) as { action?: string; device?: string; loc?: string; kind?: string; id?: string } | null;
  if (!body || typeof body.device !== "string" || !UUID.test(body.device) || /^0+-/.test(body.device)) return json({ error: "bad_request", message: "Invalid request" }, 400);
  const dev = oneWay(`dev:${body.device}`);
  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "unknown";
  const net = oneWay(`net:${ip}`);
  try {
    if (body.action === "report") {
      if (typeof body.loc !== "string" || !getLocality(body.loc) || !isValidKind(body.kind)) return json({ error: "bad_request", message: "Invalid report" }, 400);
      await addReport(body.loc, body.kind, dev, net);
    } else if ((body.action === "like" || body.action === "flag") && typeof body.id === "string" && ID.test(body.id)) {
      await (body.action === "like" ? like : flag)(body.id, dev);
    } else {
      return json({ error: "bad_request", message: "Invalid request" }, 400);
    }
    revalidateTag(TAG, { expire: 0 });
    return json({ ok: true });
  } catch (e) {
    if (e instanceof LimitError) return json({ error: "rate_limited", message: e.message }, 429);
    console.error("[community]", e);
    return json({ error: "unavailable", message: "Could not save right now — please try again." }, 502);
  }
}
