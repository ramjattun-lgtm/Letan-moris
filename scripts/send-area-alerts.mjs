// Sends Letan Moris area alerts (heavy-rain risk, River watch high, strong earthquakes, confirmed community hazards) to free ntfy
// topics, one per area. Each alert is sent once: we check the topic's last 24 h first.
// Runs every 30 minutes in GitHub Actions.
import { getWithRetry } from "./lib/http.mjs";

const SITE = process.env.SITE_URL ?? "https://letan-moris.vercel.app";
const NTFY = "https://ntfy.sh";

const data = await getWithRetry(`${SITE}/api/area-alerts`, { tries: 3 });
let sent = 0;
for (const area of data.areas) {
  if (!area.alerts.length) continue;
  const past = await fetch(`${NTFY}/${area.topic}/json?poll=1&since=24h`).then((r) => (r.ok ? r.text() : ""));
  for (const a of area.alerts) {
    if (past.includes(`a=${a.key}`)) continue;
    const click = `${SITE}/?${a.loc ? `loc=${a.loc}&` : ""}a=${encodeURIComponent(a.key)}`;
    const res = await fetch(`${NTFY}/${area.topic}`, {
      method: "POST",
      headers: { Title: a.title, Priority: String(a.priority), Tags: a.priority >= 5 ? "rotating_light,ocean" : a.priority >= 4 ? "warning" : "cloud_with_rain", Click: click },
      body: `${a.body}\n\n${data.footer}`,
    });
    console.log(area.key, a.key, res.status);
    if (res.ok) sent++;
  }
}
console.log(`Done — ${sent} alert(s) sent.`);
