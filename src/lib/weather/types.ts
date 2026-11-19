// Internal, provider-independent weather objects.
// The UI and (later) the Facebook module only ever see these shapes,
// never a provider's raw response.

/** A local Mauritius-time timestamp string "YYYY-MM-DDTHH:mm" (UTC+4, no DST). */
export type LocalTime = string;

/** A value that may be missing. Missing values are null — never 0. */
export type Maybe<T> = T | null;

export type Island = "mauritius" | "rodrigues";

export interface DataProvenance {
  provider: string; // e.g. "open-meteo"
  model: string; // e.g. "best_match"
  /** When we retrieved the data, as an ISO UTC string. */
  retrievedAt: string;
  /** Elevation (m) of the model grid point used, if the provider reports it. */
  gridElevation: Maybe<number>;
  /** Approximate grid resolution note shown to users. */
  resolutionNote: string;
  attribution: { text: string; url: string };
  /** True when this came from a stale cache because the provider failed. */
  stale?: boolean;
}

export interface CurrentConditions {
  time: LocalTime;
  temperature: Maybe<number>; // °C
  feelsLike: Maybe<number>; // °C
  humidity: Maybe<number>; // %
  precipitation: Maybe<number>; // mm in the last hour (model)
  weatherCode: Maybe<number>; // WMO code
  cloudCover: Maybe<number>; // %
  windSpeed: Maybe<number>; // km/h
  windDirection: Maybe<number>; // degrees
  windGusts: Maybe<number>; // km/h
  isDay: Maybe<boolean>;
  /** Always "model" for Open-Meteo: it is a model estimate, not an observation. */
  kind: "model" | "observation";
}

export interface HourlyPoint {
  time: LocalTime;
  temperature: Maybe<number>;
  feelsLike: Maybe<number>;
  humidity: Maybe<number>;
  rainProbability: Maybe<number>; // %
  precipitation: Maybe<number>; // mm in that hour
  weatherCode: Maybe<number>;
  cloudCover: Maybe<number>;
  windSpeed: Maybe<number>;
  windDirection: Maybe<number>;
  windGusts: Maybe<number>;
  uvIndex: Maybe<number>;
  /** Sunlight reaching the ground, W/m² (hour average). */
  solarRadiation: Maybe<number>;
  /** Low cloud cover, % (summits in cloud, fog risk). */
  cloudLow: Maybe<number>;
  /** Visibility, metres. */
  visibility: Maybe<number>;
}

export interface DailyPoint {
  date: string; // YYYY-MM-DD (Mauritius)
  weatherCode: Maybe<number>;
  tempMax: Maybe<number>;
  tempMin: Maybe<number>;
  precipitationSum: Maybe<number>;
  rainProbabilityMax: Maybe<number>;
  precipitationHours: Maybe<number>;
  sunrise: Maybe<LocalTime>;
  sunset: Maybe<LocalTime>;
  uvIndexMax: Maybe<number>;
  windSpeedMax: Maybe<number>;
  windGustsMax: Maybe<number>;
  windDirectionDominant: Maybe<number>;
}

export interface Forecast {
  locationId: string;
  current: CurrentConditions;
  hourly: HourlyPoint[];
  daily: DailyPoint[];
  /** Time resolution of the rain data actually available. */
  rainResolution: "hourly" | "15-minute";
  provenance: DataProvenance;
}

export interface MarineHour {
  time: LocalTime;
  waveHeight: Maybe<number>; // m
  waveDirection: Maybe<number>; // degrees
  wavePeriod: Maybe<number>; // s
  swellHeight: Maybe<number>; // m
  seaTemperature: Maybe<number>; // °C
}

export interface MarineForecast {
  locationId: string;
  hourly: MarineHour[];
  provenance: DataProvenance;
}

/** Light per-point values used by the map. */
export interface MapPoint {
  locationId: string;
  rainProbNext3h: Maybe<number>;
  rainNext3h: Maybe<number>;
  temperature: Maybe<number>;
  windSpeed: Maybe<number>;
  windDirection: Maybe<number>;
  cloudCover: Maybe<number>;
  rainRisk?: "low" | "moderate" | "high" | null;
  rainRiskText?: string;
}
