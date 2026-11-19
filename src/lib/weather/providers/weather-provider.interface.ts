import type { Forecast, MapPoint, MarineForecast } from "../types";

export interface Coordinates {
  id: string;
  lat: number;
  lon: number;
}

/**
 * Every weather data source implements this interface and returns normalised objects.
 * To add a provider: create an adapter implementing this interface, add its credentials
 * as environment variables, and select it in provider-selection.ts. No UI changes needed.
 */
export interface WeatherProvider {
  /** Stable id, e.g. "open-meteo". */
  readonly id: string;
  readonly label: string;
  /** Paid providers must stay disabled until the owner explicitly authorises them. */
  readonly paid: boolean;
  readonly capabilities: {
    forecast: boolean;
    marine: boolean;
    ensemble: boolean;
    subHourlyRain: boolean;
  };
  getForecast(loc: Coordinates): Promise<Forecast>;
  getMarine?(loc: Coordinates): Promise<MarineForecast>;
  getMapPoints?(locs: Coordinates[]): Promise<MapPoint[]>;
}

export class ProviderError extends Error {
  constructor(
    public provider: string,
    message: string,
    public status?: number,
  ) {
    super(`[${provider}] ${message}`);
  }
}
