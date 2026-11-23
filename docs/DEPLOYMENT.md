# Deployment and schedule

Letan Moris runs on **Vercel Hobby** (free, non-commercial). Every push to `main` on GitHub deploys
the site automatically in about a minute. The data jobs run on **GitHub Actions** (free for this
public repository). Times below are **Mauritius time (UTC+4)**; GitHub can start scheduled jobs
a few minutes late.

## Release window
- Code changes are pushed **once a day at 19:00** (evening, after the day's main use), unless an
  urgent fix is needed. Work done during the day stays as local commits until then.
- Before every push: `npx vitest run`, `npm run build`, and phone-size screenshots of changed screens.
- After every push: check the deployment status
  (`gh api repos/ramjattun-lgtm/Letan-moris/commits/<sha>/statuses`) — it must say *success*.
- If a deployment fails, the previous version keeps running. Fix, test and push again; or in
  Vercel › Deployments › ⋯ › **Promote to Production** on the last good one.

## Automatic jobs
| Job | When (Mauritius time) | Changes the site? |
|---|---|---|
| Area alerts (ntfy) | every 30 min (:04 and :34) | No — sends notifications only |
| Forecast accuracy | daily 06:17 | Yes — commits `accuracy.json` → deploys |
| Facebook posts | 05:45, 12:30, 18:30 daily; Fri 17:00 | No — prepares/publishes posts |
| Cyclone history | 1st of each month, 07:17 | Yes, if new storms |
| Climate history | 3 Jan, 02:23 | Yes |
| Reservoir rain history | 4 Jan, 01:41 | Yes |
| Rain timing history | 5 Jan, 02:53 | Yes |

Data jobs that commit (accuracy, history) deploy outside the 19:00 window. They only change data
files, which are checked by the tests in the next code release. To pause all automatic deploys,
in Vercel › Settings › Git turn off automatic deployments (re-enable afterwards).

## Settings needed in Vercel (Settings › Environment Variables)
| Name | Why | If missing |
|---|---|---|
| `DATABASE_URL` | Neon free database for community reports (added by the Neon integration) | Reports use ntfy, no likes/flags |
| `MODERATION_KEY` | Opens `/moderate` (≥ 12 characters) | Moderation page refuses |
| `CRON_SECRET` | Facebook post job (also a GitHub secret) | Posts are not prepared |
| `COMMUNITY_SALT` | Optional extra secret for anonymous phone codes | A built-in value is used |

After adding or changing a setting, redeploy (Deployments › ⋯ › Redeploy).
