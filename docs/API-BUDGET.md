# Free-tier API budget (Open-Meteo)

Limits: < 10,000 calls/day, < 5,000/hour, < 600/minute. Requests with many variables or many days can count as more than one call.

Caching layers
1. Provider fetch cache (`next.revalidate`): forecast 90 min, map 60 min, marine 3 h, model comparison 3 h (one request per region, not per village).
2. CDN cache on our API responses: `s-maxage` 15–60 min with `stale-while-revalidate`.
3. Browser copy of the last good response (offline / failure fallback).

Worst case per day (every place requested every hour): ~64 places × 24 × ~3 call-weights ≈ 4,600 + map (2 islands × 24, ~37 points) ≈ 900 + marine (13 beaches × 8) ≈ 100 → ~5,600. Realistic use is far lower because only visited places are fetched. If usage grows, raise `FORECAST_TTL` in `open-meteo.provider.ts` or group villages that share a grid cell.

Other jobs
- Climate history (`.github/workflows/climate-history.yml`): ~7 places × 30 years × 5 daily variables ≈ 2,800 call units, run once and then yearly in January at night.
- Cyclone history (NOAA IBTrACS) does not use Open-Meteo.
