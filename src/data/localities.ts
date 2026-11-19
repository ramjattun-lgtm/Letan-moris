import type { Island } from "@/lib/weather/types";

// Locality reference data for Mauritius and Rodrigues.
// Coordinates are approximate village/beach centres compiled for the MVP and must be
// reviewed against OpenStreetMap (© OpenStreetMap contributors, ODbL) before relying on
// them for anything precise. Forecasts come from model grid cells several km wide, so
// small coordinate differences do not change the forecast.

export type Region =
  | "north"
  | "south"
  | "east"
  | "west"
  | "central-plateau"
  | "high-ground"
  | "rodrigues";

export type LocalityKind = "town" | "village" | "beach" | "landmark";

export interface Locality {
  id: string;
  name: string;
  /** Other spellings people use (Kreol/French/no accents) for search and auto-replies. */
  aliases?: string[];
  island: Island;
  district: string;
  region: Region;
  kind: LocalityKind;
  lat: number;
  lon: number;
  /** Shown on the map layer (keeps API usage low). */
  onMap?: boolean;
}

export const DISTRICTS: Record<Island, string[]> = {
  mauritius: [
    "Port Louis",
    "Pamplemousses",
    "Rivière du Rempart",
    "Flacq",
    "Grand Port",
    "Savanne",
    "Black River",
    "Plaines Wilhems",
    "Moka",
  ],
  rodrigues: ["Rodrigues"],
};

export const REGION_LABEL: Record<Region, string> = {
  north: "North",
  south: "South",
  east: "East",
  west: "West",
  "central-plateau": "Central Plateau",
  "high-ground": "High ground",
  rodrigues: "Rodrigues",
};

export const LOCALITIES: Locality[] = [
  // ——— Port Louis ———
  { id: "port-louis", name: "Port Louis", aliases: ["Port-Louis", "Porlwi"], island: "mauritius", district: "Port Louis", region: "west", kind: "town", lat: -20.1609, lon: 57.5012, onMap: true },
  // ——— Pamplemousses ———
  { id: "pamplemousses", name: "Pamplemousses", aliases: ["Pamplemous"], island: "mauritius", district: "Pamplemousses", region: "north", kind: "village", lat: -20.1039, lon: 57.5703, onMap: true },
  { id: "triolet", name: "Triolet", island: "mauritius", district: "Pamplemousses", region: "north", kind: "village", lat: -20.0572, lon: 57.545 },
  { id: "trou-aux-biches", name: "Trou aux Biches", aliases: ["Trou-aux-Biches"], island: "mauritius", district: "Pamplemousses", region: "north", kind: "beach", lat: -20.0333, lon: 57.545 },
  { id: "mont-choisy", name: "Mont Choisy", aliases: ["Mon Choisy"], island: "mauritius", district: "Pamplemousses", region: "north", kind: "beach", lat: -20.023, lon: 57.553 },
  { id: "pointe-aux-piments", name: "Pointe aux Piments", island: "mauritius", district: "Pamplemousses", region: "north", kind: "village", lat: -20.065, lon: 57.517 },
  { id: "baie-du-tombeau", name: "Baie du Tombeau", island: "mauritius", district: "Pamplemousses", region: "north", kind: "village", lat: -20.1186, lon: 57.5106 },
  // ——— Rivière du Rempart ———
  { id: "grand-baie", name: "Grand Baie", aliases: ["Grand-Baie", "Granbe"], island: "mauritius", district: "Rivière du Rempart", region: "north", kind: "beach", lat: -20.013, lon: 57.58, onMap: true },
  { id: "pereybere", name: "Pereybère", aliases: ["Pereybere"], island: "mauritius", district: "Rivière du Rempart", region: "north", kind: "beach", lat: -19.9947, lon: 57.59 },
  { id: "cap-malheureux", name: "Cap Malheureux", island: "mauritius", district: "Rivière du Rempart", region: "north", kind: "village", lat: -19.9842, lon: 57.6142, onMap: true },
  { id: "grand-gaube", name: "Grand Gaube", island: "mauritius", district: "Rivière du Rempart", region: "north", kind: "village", lat: -20.0064, lon: 57.6608 },
  { id: "goodlands", name: "Goodlands", aliases: ["Goodland"], island: "mauritius", district: "Rivière du Rempart", region: "north", kind: "town", lat: -20.035, lon: 57.6431, onMap: true },
  { id: "riviere-du-rempart", name: "Rivière du Rempart", aliases: ["Riviere du Rempart", "Rempart"], island: "mauritius", district: "Rivière du Rempart", region: "north", kind: "village", lat: -20.1031, lon: 57.6847 },
  { id: "poudre-dor", name: "Poudre d'Or", aliases: ["Poudre dOr"], island: "mauritius", district: "Rivière du Rempart", region: "north", kind: "village", lat: -20.05, lon: 57.69 },
  // ——— Flacq ———
  { id: "centre-de-flacq", name: "Centre de Flacq", aliases: ["Flacq", "Sant Flak"], island: "mauritius", district: "Flacq", region: "east", kind: "town", lat: -20.1897, lon: 57.7144, onMap: true },
  { id: "belle-mare", name: "Belle Mare", aliases: ["Belle-Mare"], island: "mauritius", district: "Flacq", region: "east", kind: "beach", lat: -20.19, lon: 57.77, onMap: true },
  { id: "poste-de-flacq", name: "Poste de Flacq", island: "mauritius", district: "Flacq", region: "east", kind: "village", lat: -20.1633, lon: 57.73 },
  { id: "quatre-cocos", name: "Quatre Cocos", island: "mauritius", district: "Flacq", region: "east", kind: "village", lat: -20.2078, lon: 57.7625 },
  { id: "lalmatie", name: "Lalmatie", island: "mauritius", district: "Flacq", region: "east", kind: "village", lat: -20.1897, lon: 57.6608 },
  { id: "bel-air", name: "Bel Air Rivière Sèche", aliases: ["Bel Air", "Riviere Seche"], island: "mauritius", district: "Flacq", region: "east", kind: "village", lat: -20.2569, lon: 57.7486, onMap: true },
  { id: "trou-deau-douce", name: "Trou d'Eau Douce", aliases: ["Trou dEau Douce", "Ile aux Cerfs"], island: "mauritius", district: "Flacq", region: "east", kind: "beach", lat: -20.24, lon: 57.785 },
  // ——— Grand Port ———
  { id: "mahebourg", name: "Mahébourg", aliases: ["Mahebourg", "Maebur"], island: "mauritius", district: "Grand Port", region: "south", kind: "town", lat: -20.4081, lon: 57.7, onMap: true },
  { id: "blue-bay", name: "Blue Bay", island: "mauritius", district: "Grand Port", region: "south", kind: "beach", lat: -20.443, lon: 57.714 },
  { id: "rose-belle", name: "Rose-Belle", aliases: ["Rose Belle"], island: "mauritius", district: "Grand Port", region: "south", kind: "village", lat: -20.4003, lon: 57.5969, onMap: true },
  { id: "plaine-magnien", name: "Plaine Magnien", aliases: ["Airport", "SSR Airport", "Plaisance"], island: "mauritius", district: "Grand Port", region: "south", kind: "village", lat: -20.4297, lon: 57.65 },
  { id: "nouvelle-france", name: "Nouvelle France", island: "mauritius", district: "Grand Port", region: "high-ground", kind: "village", lat: -20.37, lon: 57.56 },
  // ——— Savanne ———
  { id: "souillac", name: "Souillac", aliases: ["Gris Gris"], island: "mauritius", district: "Savanne", region: "south", kind: "village", lat: -20.5167, lon: 57.5167, onMap: true },
  { id: "chemin-grenier", name: "Chemin Grenier", island: "mauritius", district: "Savanne", region: "south", kind: "village", lat: -20.4872, lon: 57.4656 },
  { id: "surinam", name: "Surinam", island: "mauritius", district: "Savanne", region: "south", kind: "village", lat: -20.5097, lon: 57.505 },
  { id: "bel-ombre", name: "Bel Ombre", island: "mauritius", district: "Savanne", region: "south", kind: "beach", lat: -20.5, lon: 57.4, onMap: true },
  { id: "grand-bois", name: "Grand Bois", island: "mauritius", district: "Savanne", region: "high-ground", kind: "village", lat: -20.4183, lon: 57.5469 },
  { id: "grand-bassin", name: "Grand Bassin", aliases: ["Ganga Talao"], island: "mauritius", district: "Savanne", region: "high-ground", kind: "landmark", lat: -20.4181, lon: 57.4925, onMap: true },
  // ——— Black River ———
  { id: "flic-en-flac", name: "Flic en Flac", aliases: ["Flic-en-Flac"], island: "mauritius", district: "Black River", region: "west", kind: "beach", lat: -20.2742, lon: 57.3711, onMap: true },
  { id: "tamarin", name: "Tamarin", aliases: ["Tamarain"], island: "mauritius", district: "Black River", region: "west", kind: "beach", lat: -20.3256, lon: 57.3708 },
  { id: "black-river", name: "Rivière Noire", aliases: ["Black River", "Riviere Noire", "Larivier Nwar"], island: "mauritius", district: "Black River", region: "west", kind: "village", lat: -20.36, lon: 57.37 },
  { id: "le-morne", name: "Le Morne", aliases: ["Morne"], island: "mauritius", district: "Black River", region: "west", kind: "beach", lat: -20.456, lon: 57.315, onMap: true },
  { id: "bambous", name: "Bambous", island: "mauritius", district: "Black River", region: "west", kind: "village", lat: -20.2567, lon: 57.4061 },
  { id: "chamarel", name: "Chamarel", island: "mauritius", district: "Black River", region: "high-ground", kind: "village", lat: -20.4278, lon: 57.375 },
  { id: "plaine-champagne", name: "Plaine Champagne", island: "mauritius", district: "Black River", region: "high-ground", kind: "landmark", lat: -20.4167, lon: 57.45 },
  // ——— Plaines Wilhems ———
  { id: "curepipe", name: "Curepipe", aliases: ["Kurpip"], island: "mauritius", district: "Plaines Wilhems", region: "central-plateau", kind: "town", lat: -20.3163, lon: 57.5259, onMap: true },
  { id: "vacoas-phoenix", name: "Vacoas-Phoenix", aliases: ["Vacoas", "Phoenix", "Vakoa"], island: "mauritius", district: "Plaines Wilhems", region: "central-plateau", kind: "town", lat: -20.2981, lon: 57.4783, onMap: true },
  { id: "quatre-bornes", name: "Quatre Bornes", aliases: ["Quatre-Bornes", "Katborn"], island: "mauritius", district: "Plaines Wilhems", region: "central-plateau", kind: "town", lat: -20.2654, lon: 57.4791, onMap: true },
  { id: "rose-hill", name: "Beau Bassin-Rose Hill", aliases: ["Rose Hill", "Rose-Hill", "Beau Bassin", "Roz-Il"], island: "mauritius", district: "Plaines Wilhems", region: "central-plateau", kind: "town", lat: -20.2333, lon: 57.4667, onMap: true },
  { id: "mare-aux-vacoas", name: "Mare aux Vacoas", island: "mauritius", district: "Plaines Wilhems", region: "high-ground", kind: "landmark", lat: -20.373, lon: 57.493 },
  { id: "midlands", name: "Midlands", island: "mauritius", district: "Moka", region: "high-ground", kind: "village", lat: -20.32, lon: 57.565 },
  // ——— Moka ———
  { id: "moka", name: "Moka", aliases: ["Reduit", "Réduit"], island: "mauritius", district: "Moka", region: "central-plateau", kind: "town", lat: -20.2189, lon: 57.4958, onMap: true },
  { id: "saint-pierre", name: "Saint Pierre", aliases: ["St Pierre"], island: "mauritius", district: "Moka", region: "central-plateau", kind: "village", lat: -20.2175, lon: 57.5208 },
  { id: "quartier-militaire", name: "Quartier Militaire", aliases: ["QM"], island: "mauritius", district: "Moka", region: "central-plateau", kind: "village", lat: -20.2489, lon: 57.5978, onMap: true },
  { id: "montagne-blanche", name: "Montagne Blanche", island: "mauritius", district: "Moka", region: "east", kind: "village", lat: -20.2667, lon: 57.6333 },

  // ——— Rodrigues ———
  { id: "port-mathurin", name: "Port Mathurin", aliases: ["Port-Mathurin", "Portmathurin"], island: "rodrigues", district: "Rodrigues", region: "rodrigues", kind: "town", lat: -19.6833, lon: 63.4167, onMap: true },
  { id: "la-ferme", name: "La Ferme", aliases: ["Lafer"], island: "rodrigues", district: "Rodrigues", region: "rodrigues", kind: "village", lat: -19.74, lon: 63.36, onMap: true },
  { id: "mont-lubin", name: "Mont Lubin", island: "rodrigues", district: "Rodrigues", region: "rodrigues", kind: "village", lat: -19.708, lon: 63.448, onMap: true },
  { id: "grande-montagne", name: "Grande Montagne", aliases: ["Gran Montagn"], island: "rodrigues", district: "Rodrigues", region: "rodrigues", kind: "village", lat: -19.72, lon: 63.44 },
  { id: "baie-aux-huitres", name: "Baie aux Huîtres", aliases: ["Baie aux Huitres"], island: "rodrigues", district: "Rodrigues", region: "rodrigues", kind: "village", lat: -19.7, lon: 63.37 },
  { id: "plaine-corail", name: "Plaine Corail", aliases: ["Rodrigues airport"], island: "rodrigues", district: "Rodrigues", region: "rodrigues", kind: "village", lat: -19.7577, lon: 63.361, onMap: true },
  { id: "petite-butte", name: "Petite Butte", island: "rodrigues", district: "Rodrigues", region: "rodrigues", kind: "village", lat: -19.73, lon: 63.42 },
  { id: "port-sud-est", name: "Port Sud-Est", aliases: ["Port Sud Est"], island: "rodrigues", district: "Rodrigues", region: "rodrigues", kind: "village", lat: -19.76, lon: 63.47, onMap: true },
  { id: "graviers", name: "Graviers", island: "rodrigues", district: "Rodrigues", region: "rodrigues", kind: "beach", lat: -19.74, lon: 63.49 },
  { id: "pointe-coton", name: "Pointe Coton", island: "rodrigues", district: "Rodrigues", region: "rodrigues", kind: "beach", lat: -19.693, lon: 63.5, onMap: true },
  { id: "trou-dargent", name: "Trou d'Argent", aliases: ["Trou dArgent"], island: "rodrigues", district: "Rodrigues", region: "rodrigues", kind: "beach", lat: -19.718, lon: 63.501 },
  { id: "anse-aux-anglais", name: "Anse aux Anglais", island: "rodrigues", district: "Rodrigues", region: "rodrigues", kind: "beach", lat: -19.672, lon: 63.438 },
  { id: "mourouk", name: "Anse Mourouk", aliases: ["Mourouk"], island: "rodrigues", district: "Rodrigues", region: "rodrigues", kind: "beach", lat: -19.764, lon: 63.45 },
];

/** Beaches with marine profiles (Module G). */
export const BEACH_IDS = [
  "grand-baie",
  "pereybere",
  "trou-aux-biches",
  "mont-choisy",
  "flic-en-flac",
  "le-morne",
  "blue-bay",
  "belle-mare",
  "tamarin",
  "pointe-coton",
  "trou-dargent",
  "mourouk",
  "graviers",
];

export const DEFAULT_LOCATION: Record<Island, string> = {
  mauritius: "port-louis",
  rodrigues: "port-mathurin",
};

export const ISLAND_LABEL: Record<Island, string> = {
  mauritius: "Mauritius",
  rodrigues: "Rodrigues",
};

/** Map views per island (centre lon/lat, zoom). */
export const ISLAND_VIEW: Record<Island, { center: [number, number]; zoom: number }> = {
  mauritius: { center: [57.57, -20.25], zoom: 8.6 },
  rodrigues: { center: [63.43, -19.715], zoom: 10.6 },
};

const byId = new Map(LOCALITIES.map((l) => [l.id, l]));

export function getLocality(id: string | null | undefined): Locality | undefined {
  return id ? byId.get(id) : undefined;
}

/** Remove accents and punctuation so "Mahebourg" matches "Mahébourg". */
export function normaliseName(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/['’`-]/g, " ")
    .replace(/[^a-z0-9 ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Simple ranked search over names and aliases. */
export function searchLocalities(query: string, island?: Island): Locality[] {
  const q = normaliseName(query);
  const pool = island ? LOCALITIES.filter((l) => l.island === island) : LOCALITIES;
  if (!q) return pool;
  const scored: { l: Locality; s: number }[] = [];
  for (const l of pool) {
    const names = [l.name, ...(l.aliases ?? []), l.district].map(normaliseName);
    let s = 0;
    for (const n of names) {
      if (n === q) s = Math.max(s, 3);
      else if (n.startsWith(q)) s = Math.max(s, 2);
      else if (n.includes(q)) s = Math.max(s, 1);
    }
    if (s > 0) scored.push({ l, s });
  }
  return scored.sort((a, b) => b.s - a.s || a.l.name.localeCompare(b.l.name)).map((x) => x.l);
}

/** Nearest locality to a device position (used for "use my location"). */
export function nearestLocality(lat: number, lon: number): Locality {
  let best = LOCALITIES[0];
  let bestD = Infinity;
  for (const l of LOCALITIES) {
    const d = (l.lat - lat) ** 2 + ((l.lon - lon) * Math.cos((lat * Math.PI) / 180)) ** 2;
    if (d < bestD) {
      bestD = d;
      best = l;
    }
  }
  return best;
}
