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

## Facebook reels (28 Nov 2026)
- Morning, midday and evening posts are reels (12–15 s, 9:16) with their own look: sunrise, lagoon, dusk. Weekend stays an image post.
- Branded: logo sting at the start, logo and wordmark in the header, logo badge in the corner, logo end card.
- Music: our own original tune "Lagon" (scripts/reel/letan-moris-theme.m4a), made for Letan Moris. No third-party music.
- The site decides every word and number (`/api/social/run?format=reel`); GitHub Actions only draws the video (scripts/reel/render.mjs) and stores it on the `reels` release (deleted after 3 days). The site downloads it again, checks the file fingerprints, re-checks the forecast and the MMS status, then posts it.
- If drawing the reel fails, the normal image post is used instead.
- While an MMS warning is entered in `src/data/official-status.ts`, forecast posts and reels stop. Only a quiet "Follow MMS" reel is made (MMS wording copied exactly, no forecast numbers, no music), and it always waits for the owner's approval. If the MMS wording changes before approval, it is blocked.
- Our own alerts in reels (heavy-rain risk, River watch, strong earthquakes) are labelled "Letan Moris alert", never "warning".
- River watch HIGH now also sends a phone alert to the areas downstream (estimate from rain, not river levels).
