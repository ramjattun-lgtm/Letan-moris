import { openMeteoProvider } from "../providers/open-meteo.provider";
import type { WeatherProvider } from "../providers/weather-provider.interface";

// Feature-level provider configuration. Only free providers are registered.
// To activate a future provider: add its adapter here and set WEATHER_PRIMARY_PROVIDER.
// Paid providers must never be enabled without the owner's explicit authorisation.

const REGISTRY: Record<string, WeatherProvider> = {
  [openMeteoProvider.id]: openMeteoProvider,
};

export type Feature = "forecast" | "marine" | "map";

export function getProvider(feature: Feature): WeatherProvider {
  const wanted = process.env.WEATHER_PRIMARY_PROVIDER ?? "open-meteo";
  const p = REGISTRY[wanted] ?? openMeteoProvider;
  if (p.paid && process.env.ALLOW_PAID_PROVIDERS !== "true") return openMeteoProvider;
  void feature;
  return p;
}

export function listProviders() {
  return Object.values(REGISTRY).map((p) => ({ id: p.id, label: p.label, paid: p.paid, capabilities: p.capabilities }));
}
