import { NextResponse } from "next/server";
import { getRainHistory } from "@/lib/weather/providers/open-meteo.provider";
import { ALERT_AREAS, ALERT_FOOTER, areaTopic, hazardAlerts, quakeAlert, rainAlert, riverAlerts, type AreaAlert } from "@/lib/community/area-alerts";
import { getJson } from "@/lib/weather/providers/open-meteo.provider";
import { notableQuakes, type Quake, type UsgsFeature } from "@/lib/weather/intelligence/quake.service";
import { NTFY_BASE, parseReports, TOPIC, type Report } from "@/lib/community/lapli";
import { dbEnabled, recentReports } from "@/lib/community/db.server";
import { getRiverWatch } from "@/lib/weather/intelligence/river-watch.server";

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

async function quakes(): Promise<Quake[]> {
  try {
    const j = (await getJson("https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_day.geojson", 120)) as { features?: UsgsFeature[] };
    // Phones get an urgent alert only while it is fresh (first 3 hours); the app shows it for 12 hours.
    return notableQuakes(j.features ?? []).filter((q) => Date.now() - Date.parse(q.timeUtc) <= 3 * 3600e3);
  } catch {
    return [];
  }
}

/** Alerts to send now for each area. Read by the "Area alerts" GitHub job, which posts them to ntfy. */
export async function GET() {
  const [history, reports, qs, rivers] = await Promise.all([
    getRainHistory(ALERT_AREAS.map((a) => ({ id: a.key, lat: a.lat, lon: a.lon }))).catch(() => []),
    communityReports(),
    quakes(),
    Promise.all([getRiverWatch("mauritius"), getRiverWatch("rodrigues")]).then((x) => x.flat()).catch(() => []),
  ]);
  const hazards = hazardAlerts(reports);
  const riverByArea = riverAlerts(rivers);
  const areas = ALERT_AREAS.map((a) => {
    const h = history.find((x) => x.id === a.key);
    const rain = h ? rainAlert(a.key, h.hours) : null;
    const alerts: AreaAlert[] = [...qs.map((q) => quakeAlert(q, a.key)), ...(rain ? [rain] : []), ...(riverByArea[a.key] ?? []), ...(hazards[a.key] ?? [])];
    return { key: a.key, name: a.name, topic: areaTopic(a.key), alerts };
  });
  return NextResponse.json({ generatedAt: new Date().toISOString(), footer: ALERT_FOOTER, rainDataOk: history.length > 0, areas }, { headers: { "Cache-Control": "no-store" } });
}
