// WMO weather interpretation codes, as used by Open-Meteo.

export type IconKind = "clear" | "partly" | "cloudy" | "fog" | "drizzle" | "rain" | "showers" | "storm" | "unknown";

export function describeCode(code: number | null): { label: string; icon: IconKind } {
  if (code === null) return { label: "Not available", icon: "unknown" };
  if (code === 0) return { label: "Clear sky", icon: "clear" };
  if (code === 1) return { label: "Mainly clear", icon: "clear" };
  if (code === 2) return { label: "Partly cloudy", icon: "partly" };
  if (code === 3) return { label: "Cloudy", icon: "cloudy" };
  if (code === 45 || code === 48) return { label: "Fog / low cloud", icon: "fog" };
  if (code >= 51 && code <= 57) return { label: code === 55 ? "Heavy drizzle" : "Drizzle", icon: "drizzle" };
  if (code === 61) return { label: "Light rain", icon: "rain" };
  if (code === 63) return { label: "Rain", icon: "rain" };
  if (code === 65) return { label: "Heavy rain", icon: "rain" };
  if (code === 66 || code === 67) return { label: "Rain", icon: "rain" };
  if (code === 80) return { label: "Light showers", icon: "showers" };
  if (code === 81) return { label: "Showers", icon: "showers" };
  if (code === 82) return { label: "Heavy showers", icon: "showers" };
  if (code === 95) return { label: "Thunderstorms", icon: "storm" };
  if (code === 96 || code === 99) return { label: "Thunderstorms", icon: "storm" };
  return { label: "Mixed conditions", icon: "cloudy" };
}

const DIRS = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];

/** Compass direction the wind blows FROM. */
export function compass(deg: number | null): string {
  if (deg === null) return "—";
  return DIRS[Math.round(((deg % 360) + 360) % 360 / 22.5) % 16];
}

export function uvLabel(uv: number | null): string {
  if (uv === null) return "Not available";
  if (uv < 3) return "Low";
  if (uv < 6) return "Moderate";
  if (uv < 8) return "High";
  if (uv < 11) return "Very high";
  return "Extreme";
}

export function fmt(v: number | null, unit = "", digits = 0): string {
  if (v === null || v === undefined) return "—";
  return `${v.toFixed(digits)}${unit}`;
}
