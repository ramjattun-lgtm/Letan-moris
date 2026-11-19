# Weather data providers

## Active: Open-Meteo (free, non-commercial)
- Endpoints used: `api.open-meteo.com/v1/forecast` (current, hourly, daily, 7 days) and `marine-api.open-meteo.com/v1/marine`.
- Model: `best_match` (Open-Meteo chooses the best available global model for the location). Mauritius and Rodrigues are covered by global models only, so resolution is several km to ~25 km.
- Licence: data CC BY 4.0 — attribution "Weather data by Open-Meteo.com" with a link is shown in the footer and under forecasts.
- Terms (checked Nov 2026): free API for non-commercial use only; fewer than 10,000 calls/day, 5,000/hour, 600/minute. See https://open-meteo.com/en/terms.
- Rain resolution: hourly. 15-minute data is not used because it is not native for this region.

## Official sources (links only in Phase 1)
- Mauritius Meteorological Services — http://metservice.intnet.mu/ (official warnings for Mauritius and Rodrigues)
- Météo-France La Réunion (RSMC for South-West Indian Ocean tropical cyclones) — https://meteofrance.re/
- No automated scraping. Radar imagery only with written permission from MMS.

## Map tiles
- OpenFreeMap (`tiles.openfreemap.org`, OpenStreetMap data, ODbL). Free, no key. Re-check terms before commercial use.

## Adding a provider (no UI changes)
1. Create `src/lib/weather/providers/<name>.provider.ts` implementing `WeatherProvider` and returning the internal types.
2. Register it in `provider-selection.service.ts`.
3. Add credentials as Vercel environment variables.
4. Set `WEATHER_PRIMARY_PROVIDER=<name>`. Paid providers also need `ALLOW_PAID_PROVIDERS=true` **and** the owner's explicit authorisation.

Candidates evaluated for later: Open-Meteo ensemble API (confidence), ECMWF open data, NOAA GFS, METAR (FIMP/FIMR) for verification, NASA GPM IMERG for rainfall verification.
