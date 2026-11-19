# Free-tier API budget (Open-Meteo)

Limits: < 10,000 calls/day, < 5,000/hour, < 600/minute. Requests with many variables or many days can count as more than one call.

Caching layers
1. Provider fetch cache (`next.revalidate`): forecast 60 min, map 60 min, marine 3 h.
2. CDN cache on our API responses: `s-maxage` 15–60 min with `stale-while-revalidate`.
3. Browser copy of the last good response (offline / failure fallback).

Worst case per day (every place requested every hour): ~64 places × 24 × ~3 call-weights ≈ 4,600 + map (2 islands × 24, ~37 points) ≈ 900 + marine (13 beaches × 8) ≈ 100 → ~5,600. Realistic use is far lower because only visited places are fetched. If usage grows, raise `FORECAST_TTL` in `open-meteo.provider.ts` or group villages that share a grid cell.
