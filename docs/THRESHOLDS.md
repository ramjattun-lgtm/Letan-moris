# Thresholds — every number the app uses to decide what to say

All rules are written in code next to the numbers below (search the file for the constant).
Changing a number changes what users see: update this file and the tests at the same time.

## Rain wording
| Rule | Value | File |
|---|---|---|
| Hour is "rain likely" (6-hour strip) | ≥ 60% chance **and** ≥ 0.5 mm | `next-hours.ts` |
| Hour is "possible" | ≥ 30% chance or ≥ 0.2 mm | `next-hours.ts` |
| Rain period counts as wet | ≥ 50% chance or ≥ 0.5 mm in the hour | `rainfall-intelligence.service.ts` |
| Rain period worded "likely" (else "showers possible") | ≥ 60% and ≥ 1 mm in the period | `rainfall-intelligence.service.ts` |

Calibrated in Nov 2026 after the accuracy check showed many light-rain false alarms (Plaisance airport).

## Heavy rain risk (`heavy-rain.service.ts`)
| Level | Any 1 h | Any 3 h | Next 24 h | Wet ground (last 48 h) + next 24 h |
|---|---|---|---|---|
| High | ≥ 20 mm | ≥ 40 mm | ≥ 75 mm | ≥ 50 mm and ≥ 40 mm |
| Moderate | ≥ 8 mm | ≥ 20 mm | ≥ 35 mm | ≥ 30 mm and ≥ 20 mm |

## Rivers (`river.service.ts`)
High: past 3 h ≥ 30 mm, next 3 h ≥ 30 mm, any hour ≥ 20 mm, or combined ≥ 45 mm. Moderate: 12 / 15 / 8 / 20 mm.

## Daily planning (`decision-engine.service.ts`, `RULES`)
Dry hour < 30% and < 0.2 mm; wet hour ≥ 60% or ≥ 1 mm. Laundry: < 20% rain, humidity < 85%, ≥ 3 h.
Beach: wind ≤ 30, gusts ≤ 45 km/h, UV high ≥ 8. Hike: gusts ≤ 45, low cloud ≤ 70%, visibility ≥ 3 km,
feels-like ≤ 33 °C. Boating: wind ≤ 20, gusts ≤ 30 km/h. Kitesurf: wind 22–45, gusts ≤ 55 km/h.
Commute flag: gusts ≥ 60 km/h. Photos (`planner.ts`): good = rain < 25% and cloud 10–60%; poor = rain ≥ 50% or cloud ≥ 85%.

## Wellbeing (`wellbeing.service.ts`)
Heat bands on "feels like": 27 / 32 / 41 °C. Mosquito weather: favourable 20 mm rain & 22 °C (14 days);
very favourable 50 mm & 25 °C.

## Cyclones
Cyclone mode: a system forecast within 600 km, or an MMS warning entered by the owner (`cyclone-mode.service.ts`).
Strong gust 60 km/h; "be ready by" = 12 h before the first strong gust (`storm-impact.service.ts`).
Weather Memory: storms within 300 km, within 3 days of the date (`memory.service.ts`).

## Community reports (`lapli.ts`, `db.server.ts`)
Shown for 3 hours. "Agree" = 2+ different phones, same kind, within 5 km. One report per phone per 10 min;
12 per network per hour. Hidden after 3 flags. Deleted after 7 days. Likes never count as confirmation.

## Area alerts (`area-alerts.ts`)
Sent for moderate or high heavy-rain risk (once per area, day and level) and for confirmed hazards
(once per place, kind and day). Checked every 30 minutes.

## Accuracy check (`scripts/build-accuracy.mjs`)
Last 30 days, forecast issued the day before. Areas: rain day ≥ 1 mm vs model estimate.
Airports: forecast rain day ≥ 0.5 mm vs rain in ≥ 2 METAR reports; days need ≥ 12 reports.
