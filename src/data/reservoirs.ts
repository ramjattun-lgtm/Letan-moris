// The 7 main reservoirs of Mauritius. Year of construction, capacity and catchment area are from the
// Water Resources Unit, Ministry of Energy and Public Utilities (publicutilities.govmu.org, WRU page).
// lat/lon = APPROXIMATE centre of each catchment, used only to read gridded rainfall (≈9 km cells).
// It is not a catchment boundary.

/** First year of the daily rainfall records we use (ERA5-Land reanalysis). */
export const RECORDS_START = 1950;

export interface Reservoir {
  id: string;
  name: string;
  built: number; // year it started holding water
  builtNote: string;
  capacityMm3: number;
  catchmentKm2: number;
  lat: number;
  lon: number;
  note?: string;
}

export const RESERVOIRS: Reservoir[] = [
  { id: "mare-aux-vacoas", name: "Mare aux Vacoas", built: 1885, builtNote: "1885, later raised", capacityMm3: 25.89, catchmentKm2: 13, lat: -20.375, lon: 57.5, note: "Largest reservoir; supplies upper Plaines Wilhems and Moka." },
  { id: "midlands", name: "Midlands Dam", built: 2002, builtNote: "December 2002", capacityMm3: 25.5, catchmentKm2: 17.2, lat: -20.3, lon: 57.58, note: "Also releases water to La Nicolière through the feeder canal." },
  { id: "bagatelle", name: "Bagatelle Dam", built: 2017, builtNote: "June 2017", capacityMm3: 14.76, catchmentKm2: 25.85, lat: -20.22, lon: 57.52, note: "Fed by the Terre Rouge and Cascade rivers." },
  { id: "la-ferme", name: "La Ferme", built: 1918, builtNote: "1914–1918", capacityMm3: 11.52, catchmentKm2: 19.61, lat: -20.28, lon: 57.44, note: "Mostly used for irrigation in the west." },
  { id: "mare-longue", name: "Mare Longue", built: 1948, builtNote: "1948", capacityMm3: 6.28, catchmentKm2: 6.53, lat: -20.385, lon: 57.465, note: "Used for drinking water since 2011." },
  { id: "la-nicoliere", name: "La Nicolière", built: 1929, builtNote: "1929", capacityMm3: 5.26, catchmentKm2: 1.08, lat: -20.13, lon: 57.655, note: "Small own catchment; most of its water arrives by canal from the Midlands area." },
  { id: "piton-du-milieu", name: "Piton du Milieu", built: 1952, builtNote: "1952", capacityMm3: 2.99, catchmentKm2: 6.3, lat: -20.23, lon: 57.6, note: "Supplies the east." },
];

/** First year a reservoir is compared against: the first full year after it was built, but not before our records start. */
export const compareFrom = (r: Reservoir) => Math.max(RECORDS_START, r.built + 1);

export const RESERVOIR_SOURCE =
  "Reservoir facts: Water Resources Unit, Ministry of Energy and Public Utilities. Rainfall: Open-Meteo (ERA5-Land reanalysis since 1950, ECMWF forecasts), CC BY 4.0.";
