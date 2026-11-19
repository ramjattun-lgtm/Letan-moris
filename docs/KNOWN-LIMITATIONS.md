# Known limitations (Phase 1A)

- Forecasts come from global models (several km to ~25 km). Villages close together often share one forecast; mountains and the central plateau can differ. Rodrigues is small and may be only a few grid cells.
- "Now" values are model estimates, not station observations.
- Rain timing is hourly; no radar or minute-by-minute nowcasting.
- Confidence uses the rain probability itself (documented). Ensemble/multi-model confidence and forecast verification arrive in Phase 2.
- Official cyclone status is entered manually from MMS; the app tells users to check MMS when nothing is entered. No cyclone track maps yet.
- Marine values are open-sea model data; lagoon and reef conditions differ. Some coastal points may return no wave data (shown as "—").
- Place coordinates are approximate and should be reviewed against OpenStreetMap.
- Facebook posting is built but inactive until the Page token and secrets are added. Auto-replies (Phase 1C) and personal alerts (Phase 3) are not built yet.
- Live tropical systems come from GDACS (international monitoring), not MMS; the official MMS status is still entered manually.
- GitHub's free scheduler can start a few minutes late.
- Live data could not be tested from the build environment (outbound access blocked); it is verified on the deployed site.
- Heavy-rain risk is an independent indicator from model rain amounts (hourly intensity, 3 h and 24 h totals, last 48 h). Global models often underestimate short tropical downpours, so "Low" never means "no flooding". It never replaces MMS heavy rain / torrential rain warnings.
- Official flood-prone zones (Land Drainage Authority) are not shown yet: the data is not openly downloadable. Terrain-based low-lying areas are the next step.
- Lapli isi! reports use the free public ntfy.sh service (no database). Anyone who knows the topic could post fake reports; reports are validated (known place, known kind, recent) and always labelled unverified. If ntfy.sh is unavailable, reports simply don't show. A different topic can be set with NEXT_PUBLIC_LAPLI_TOPIC.
