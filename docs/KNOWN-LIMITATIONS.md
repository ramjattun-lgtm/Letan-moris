# Known limitations (Phase 1A)

- Forecasts come from global models (several km to ~25 km). Villages close together often share one forecast; mountains and the central plateau can differ. Rodrigues is small and may be only a few grid cells.
- "Now" values are model estimates, not station observations.
- Rain timing is hourly; no radar or minute-by-minute nowcasting.
- Confidence uses the rain probability itself (documented). Ensemble/multi-model confidence and forecast verification arrive in Phase 2.
- Official cyclone status is entered manually from MMS; the app tells users to check MMS when nothing is entered. No cyclone track maps yet.
- Marine values are open-sea model data; lagoon and reef conditions differ. Some coastal points may return no wave data (shown as "—").
- Place coordinates are approximate and should be reviewed against OpenStreetMap.
- Push notifications/personal alerts, Facebook posting and auto-replies are Phase 1B/1C/3.
- Live data could not be tested from the build environment (outbound access blocked); it is verified on the deployed site.
