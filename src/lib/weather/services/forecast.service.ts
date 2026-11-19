import { getLocality, LOCALITIES } from "@/data/localities";
import type { Island } from "../types";
import { getProvider } from "./provider-selection.service";
import { getRainHistory } from "../providers/open-meteo.provider";
import { assessHeavyRain } from "../intelligence/heavy-rain.service";

export class NotFoundError extends Error {}

export async function getForecastFor(locId: string) {
  const loc = getLocality(locId);
  if (!loc) throw new NotFoundError(`Unknown location "${locId}"`);
  return getProvider("forecast").getForecast({ id: loc.id, lat: loc.lat, lon: loc.lon });
}

export async function getMarineFor(locId: string) {
  const loc = getLocality(locId);
  if (!loc) throw new NotFoundError(`Unknown location "${locId}"`);
  const p = getProvider("marine");
  if (!p.getMarine) throw new Error("Marine data not available from the selected provider");
  return p.getMarine({ id: loc.id, lat: loc.lat, lon: loc.lon });
}

export async function getMapFor(island: Island) {
  const locs = LOCALITIES.filter((l) => l.island === island && l.onMap).map((l) => ({ id: l.id, lat: l.lat, lon: l.lon }));
  const p = getProvider("map");
  if (!p.getMapPoints) throw new Error("Map data not available from the selected provider");
  const [points, history] = await Promise.all([p.getMapPoints(locs), getRainHistory(locs).catch(() => [])]);
  for (const pt of points) {
    const h = history.find((x) => x.id === pt.locationId);
    if (!h) continue;
    const a = assessHeavyRain(h.hours);
    pt.rainRisk = a.level;
    pt.rainRiskText = a.reasons.join(" ");
  }
  return { island, points, retrievedAt: new Date().toISOString(), attribution: { text: "Weather data by Open-Meteo.com (CC BY 4.0)", url: "https://open-meteo.com/" } };
}

export async function getHeavyRainFor(locId: string) {
  const loc = getLocality(locId);
  if (!loc) throw new NotFoundError(`Unknown location "${locId}"`);
  const [h] = await getRainHistory([{ id: loc.id, lat: loc.lat, lon: loc.lon }]);
  return { locationId: loc.id, ...assessHeavyRain(h?.hours ?? []), retrievedAt: h?.fetchedAt ?? new Date().toISOString() };
}
