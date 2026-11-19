# Architecture

```
Browser (Next.js pages, React, Tailwind, PWA)
   │  fetch /api/*  (our own routes only — never a provider directly)
   ▼
Next.js route handlers  src/app/api/{forecast,map,marine,health}
   │  validate input, CDN cache headers (s-maxage + stale-while-revalidate)
   ▼
Services  src/lib/weather/services
   │  forecast.service.ts → provider-selection.service.ts
   ▼
Providers  src/lib/weather/providers   (WeatherProvider interface)
   │  open-meteo.provider.ts  → normalises raw JSON into internal types
   ▼
Open-Meteo free API (cached with fetch next.revalidate)
```

Intelligence (pure functions, shared by server and browser, fully unit-tested):
- `intelligence/rainfall-intelligence.service.ts` — wet hours, rain periods, outlook text
- `intelligence/confidence.service.ts` — documented Phase 1 confidence method
- `intelligence/decision-engine.service.ts` — transparent rules (thresholds in `RULES`)

Key principles
- Internal types (`src/lib/weather/types.ts`) are the only contract the UI sees. Missing values are `null`, shown as "—", never 0.
- All times are Mauritius local strings `YYYY-MM-DDTHH:mm` (UTC+4, no DST) — the device time zone cannot shift them (`src/lib/time.ts`).
- Official information (`src/data/official-status.ts`) is kept separate from model forecasts and labelled differently in the UI.
- Reference data (places) is static JSON in the repo; no database is needed in Phase 1.
- Client keeps the last good response per URL in localStorage; on failure it shows that copy with its age (`src/lib/client/useApi.ts`). The service worker (`public/sw.js`) provides offline fallback.

Planned modules (folders reserved by the master prompt): `lib/social` (Facebook posting + auto-replies, Phase 1B/1C), forecast verification and storage (Phase 2).
