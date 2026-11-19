import { getLocality, LOCALITIES } from "@/data/localities";
import type { Island } from "../types";
import { getProvider } from "./provider-selection.service";

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
  return { island, points: await p.getMapPoints(locs), retrievedAt: new Date().toISOString(), attribution: { text: "Weather data by Open-Meteo.com (CC BY 4.0)", url: "https://open-meteo.com/" } };
}
