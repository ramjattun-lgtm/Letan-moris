# Letan Moris

**Konn letan Moris ek Rodrig, planifie to zournee.** — *Know the weather in Mauritius and Rodrigues, plan your day.*

Independent, free, non-commercial weather intelligence for the Republic of Mauritius (Mauritius **and** Rodrigues): hour-by-hour forecasts, rain timing, plain-language day planning, marine conditions, and clear links to official warnings from Mauritius Meteorological Services (MMS).

> Not an official warning service. Official warnings: http://metservice.intnet.mu/

## What's in Phase 1A (this release)
- Home dashboard: current model conditions, rain outlook, decision cards, 24-hour strip, 7-day forecast
- Island switcher (Mauritius / Rodrigues), 60+ places, district filter, search with Kreol/French spellings, "use my location" (processed on the device), saved places
- Rain intelligence: rain periods, 48-hour timeline chart, daily totals, honest confidence
- Weather Decision Engine (deterministic rules): daily planning, school run, commuting, outdoor activities, laundry, gardening, beach, agriculture
- My Weather Day (any of the next 7 days)
- Map (MapLibre + OpenFreeMap) with rain / temperature / wind / cloud layers
- Cyclone page: official MMS status (manual, dated entry) + links, independent model outlook clearly labelled, preparedness checklist
- Marine & beaches (Mauritius and Rodrigues) — weather suitability separated from swimming safety
- PWA: installable, offline fallback, saved data shown with its age
- Light / dark mode, mobile-first, accessible

## Phase 1B — Facebook posting (built, waiting for Page + secrets)
Scheduled posts at 05:45, 12:30, 18:30 and Friday 17:00 with branded cards, an independent checker, owner approval (review mode) and a kill switch. Preview: `/posts`. Setup: `docs/FACEBOOK.md`.

## Phase 2 additions
- **Climate page** (`/climate`): 30-year normals, best months, records, trends, El Niño summers — data built by the *Climate history* workflow.
- **Trust badges** on Today: vs normal, do the models agree, (accuracy score coming).
- **My interests**: choose which plan cards appear (school run, commute, laundry, beach, farming, hiking, kitesurf, boating, solar…).
- **Cyclone**: trajectory, cone, closest approach, local impact, and past storms on a similar path (*Cyclone history* workflow).

- **Heavy-rain & flash flood risk** (Map layer, Today card, Facebook line when Moderate/High) — independent, always deferring to MMS warnings.

## Run locally
```bash
npm install
npm run dev        # http://localhost:3000
npm test           # automated tests (vitest)
npm run build      # production build
```

## Deploy (free)
Import this repository in Vercel (Hobby plan). No environment variables are needed for Phase 1.

## Update official cyclone information
Edit `src/data/official-status.ts` on GitHub (pencil icon) using the exact MMS wording, link and time, then commit. Vercel redeploys automatically.

## Documentation
- `docs/ARCHITECTURE.md` — how it fits together
- `docs/FACEBOOK.md` — Facebook posting setup and rules
- `docs/PROVIDERS.md` — data providers, licences, adding a provider
- `docs/API-BUDGET.md` — free-tier limits and caching
- `docs/KNOWN-LIMITATIONS.md`
- `docs/COST.md` — cost assessment and commercial switch checklist

Weather data by [Open-Meteo.com](https://open-meteo.com/) (CC BY 4.0). Map data © OpenStreetMap contributors.
