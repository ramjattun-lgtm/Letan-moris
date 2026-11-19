# Facebook auto-posting (Phase 1B)

## How it works
1. GitHub Actions (free) runs `.github/workflows/facebook-posts.yml` at 05:45, 12:30, 18:30 Mauritius time, plus Friday 17:00 for the weekend.
2. It calls `POST /api/social/run?slot=…` with `Authorization: Bearer CRON_SECRET`.
3. The site builds the post from the same forecast engine as the website (6 regions incl. Rodrigues), draws the 1080×1350 card, and runs the **independent checker** (`src/lib/social/checker`). Any failure blocks the post.
4. Mode is set in `src/data/social-settings.ts`:
   - `review` (start here): a GitHub issue "Approve: …" is created with the card, text and a signed approval link (valid 3 h). Opening the link shows a confirmation page; tapping **Post now** rebuilds the post with the latest data, re-checks it and publishes. Ignore the issue to skip.
   - `auto`: publishes directly after the checker passes. A blocked post opens a GitHub issue.
   - `off`: kill switch.
5. Duplicate protection: before posting, recent Page posts are checked for the same first line.

Preview anytime (nothing is posted): https://letan-moris.vercel.app/posts

## Checker rules
Required disclaimer, attribution, link and issue time · no NaN/undefined/null · every region has values · temperatures plausible and matching the text · no "official"/"warning" outside the disclaimer · no cyclone classes · never "safe" · data no older than 6 h · max 2,200 characters.

## Owner setup (from a phone)
1. **Facebook Page**: "Letan Moris – Mauritius Weather Forecast".
2. **Meta developer app** "Letan Poster" (same process as VEDAKORA Poster). Permissions: `pages_manage_posts`, `pages_read_engagement`, `pages_show_list`. Get a long-lived **Page** access token and the **Page ID**.
3. **Vercel → letan-moris → Settings → Environment Variables** (Production):
   - `FACEBOOK_PAGE_ID`
   - `FACEBOOK_PAGE_ACCESS_TOKEN`
   - `CRON_SECRET` (a long random password)
   Then **Deployments → ⋯ → Redeploy**.
4. **GitHub → Letan-moris → Settings → Secrets and variables → Actions → New repository secret**: `CRON_SECRET` with the same value.
5. In the GitHub app, make sure you **Watch** the repository so you get notified of approval issues.
6. Test: GitHub → Actions → Facebook posts → Run workflow → slot `morning`.

Token health (owner): `GET /api/social/health` with the same Bearer secret.
