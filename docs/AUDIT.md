# Audit — what the app shows and where it comes from (23 Nov 2026)

| Feature | Data | Model or observed | Refresh |
|---|---|---|---|
| Current, hourly, 7-day forecast | Open-Meteo forecast (`best_match`) | Model | ~90 min cache |
| Rain in the next 6 hours | Same, hourly | Model guidance, not radar | 15 min in app |
| Last 3 h vs next 3 h + accuracy | Open-Meteo previous runs; METAR FIMP/FIMR | Model + observed | 15–30 min |
| Heavy-rain risk, rivers, flood-prone areas | Open-Meteo hourly rain; LDMP flood sites | Model + official list | ~60 min |
| Alerts panel | All of the above, GDACS, community reports | Mixed, labelled | On load / 15 min |
| Area alerts (ntfy) | `/api/area-alerts` | Model + community | 30 min |
| Community reports | Neon database or ntfy | People, unverified | 2 min |
| Forecast accuracy | Previous runs vs ERA5 estimate; METAR | Model vs model; observed | Daily |
| Climate, rain timing, Did you know? | ERA5 1995–2024; METAR archive | Reanalysis; observed | Yearly |
| Reservoir catchment rain | ERA5, forecast, seasonal (EC46/SEAS5) | Model | 6 h |
| Weather Memory | ERA5 archive; NOAA IBTrACS; climate records | Reanalysis; best track | 6 h / monthly |
| Cyclones | GDACS; IBTrACS history; MMS status entered by owner | International monitoring | 15–30 min |
| Sea, coral heat | Open-Meteo marine; NOAA Coral Reef Watch | Model; satellite | 3 h / daily |

## Checks in place
- 150 automated tests (rules, wording, data parsing, API fallbacks, post checks).
- Facebook posts are checked (no "warning", no warning classes, data age, length) and need approval.
- Every card names its source; model data is labelled as model data.

## Known gaps
See `KNOWN-LIMITATIONS.md`. Biggest: no radar, no official warning feed, no river gauges, airport-only observations.
