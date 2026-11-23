# Decisions log

| Date | Decision | Why |
|---|---|---|
| Nov 2026 | Zero cost, non-commercial; no ads or sponsorship | Vercel Hobby and Open-Meteo free terms; owner's rule |
| Nov 2026 | Never imitate MMS; our items are "alerts", never "warnings"; always link MMS | Only MMS issues official warnings |
| Nov 2026 | Never fabricate data; missing values are shown as missing | Trust |
| Nov 2026 | "Normal rain level" / "normal temperature", never "normal" alone | Clarity |
| Nov 2026 | Reservoir pages show rain over catchments, never reservoir levels (red notice) | No public level data |
| Nov 2026 | ERA5 (not ERA5-Land) for history | ERA5-Land in Open-Meteo has no precipitation |
| 23 Nov 2026 | One free database (Neon Postgres), no accounts, no photos | Likes/flags need storage; photos dropped to stay simple and free |
| 23 Nov 2026 | Anonymous one-way phone codes; rate limits; auto-hide after 3 flags; owner review page | Spam control without sign-in |
| 23 Nov 2026 | Dropped: MMS radar, automatic MMS warning feed, live river levels, minute-level nowcasting | No public data |
| 23 Nov 2026 | Discreet line Dodo (D1) only in Did you know?, no-alerts, About, 404 | Personality without touching safety information |
| 23 Nov 2026 | Area alerts via free ntfy topics (public), checked every 30 min | Push without accounts or app-store app |
| 23 Nov 2026 | "Likely" rain needs ≥ 60% and real amounts | Accuracy check: light rain over-forecast |
| 23 Nov 2026 | French and Kreol (beta) for key screens; rule explanations stay English for now | Reach; quality over coverage |
| 23 Nov 2026 | Code releases once a day at 19:00 Mauritius time | Owner's request; avoid changes during the day |
