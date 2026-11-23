import { NextResponse } from "next/server";
import { getRainHistory } from "@/lib/weather/providers/open-meteo.provider";
import { ALERT_AREAS, ALERT_FOOTER, areaTopic, hazardAlerts, rainAlert, type AreaAlert } from "@/lib/community/area-alerts";
import { NTFY_BASE, parseReports, TOPIC, type Report } from "@/lib/community/lapli";
import { dbEnabled, recentReports } from "@/lib/community/db.server";

export const dynamic = "force-dynamic";

async function communityReports(): Promise<Report[]> {
  try {
    if (dbEnabled()) return await recentReports();
    const res = await fetch(`${NTFY_BASE}/${TOPIC}/json?poll=1&since=180m`, { cache: "no-store", signal: AbortSignal.timeout(8000) });
    return res.ok ? parseReports(await res.text()) : [];
  } catch {
    return [];
  }
}

/** Alerts to send now for each area. Read by the "Area alerts" GitHub job, which posts them to ntfy. */
export async function GET() {
  const [history, reports] = await Promise.all([getRainHistory(ALERT_AREAS.map((a) => ({ id: a.key, lat: a.lat, lon: a.lon }))).catch(() => []), communityReports()]);
  const hazards = hazardAlerts(reports);
  const areas = ALERT_AREAS.map((a) => {
    const h = history.find((x) => x.id === a.key);
    const rain = h ? rainAlert(a.key, h.hours) : null;
    const alerts: AreaAlert[] = [...(rain ? [rain] : []), ...(hazards[a.key] ?? [])];
    return { key: a.key, name: a.name, topic: areaTopic(a.key), alerts };
  });
  return NextResponse.json({ generatedAt: new Date().toISOString(), footer: ALERT_FOOTER, rainDataOk: history.length > 0, areas }, { headers: { "Cache-Control": "no-store" } });
}
