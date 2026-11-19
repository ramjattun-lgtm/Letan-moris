import { type NextRequest } from "next/server";
import { DEFAULT_LOCATION, getLocality, LOCALITIES } from "@/data/localities";
import { getForecastFor, getHeavyRainFor } from "@/lib/weather/services/forecast.service";
import { getActiveSystems } from "@/lib/weather/providers/gdacs.provider";
import { rainOutlook } from "@/lib/weather/intelligence/rainfall-intelligence.service";
import { cycloneMode } from "@/lib/weather/intelligence/cyclone-mode.service";
import { OFFICIAL, OFFICIAL_LINKS } from "@/data/official-status";
import { EMERGENCY_NUMBERS } from "@/data/emergency";
import { compass, describeCode } from "@/lib/weather/weather-codes";
import { dayLabel, formatUtcAsMU, hhmm, hourStart, nowMU } from "@/lib/time";

// Light version: plain HTML, no JavaScript, very small — for old phones, weak signal and cyclones.

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
const n = (v: number | null, u = "") => (v === null ? "—" : `${Math.round(v)}${u}`);

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("loc") ?? DEFAULT_LOCATION.mauritius;
  const loc = getLocality(id) ?? getLocality(DEFAULT_LOCATION.mauritius)!;
  const parts: string[] = [];
  const [f, hr, tc] = await Promise.all([
    getForecastFor(loc.id).catch(() => null),
    getHeavyRainFor(loc.id).catch(() => null),
    getActiveSystems().catch(() => null),
  ]);
  const mode = cycloneMode(loc.island, tc);
  const o = OFFICIAL[loc.island];

  if (mode.active) parts.push(`<p class="alert"><b>${mode.official ? "OFFICIAL MMS WARNING" : "CYCLONE MODE"}:</b> ${esc(mode.headline)}</p>`);
  else if (o.status === "not-entered") parts.push(`<p class="note">Official warnings: always check <a href="${OFFICIAL_LINKS.mms.url}">MMS</a>, radio or TV.</p>`);

  if (!f) {
    parts.push(`<p>Forecast unavailable right now. Please try again later. No forecast is shown rather than guessing.</p>`);
  } else {
    const c = f.current;
    const d = f.daily[0];
    const o2 = rainOutlook(f.hourly);
    parts.push(`<h2>Now (model estimate, ${hhmm(c.time)})</h2><p><b>${n(c.temperature, "°C")}</b>, ${esc(describeCode(c.weatherCode).label)}. Wind ${n(c.windSpeed)} km/h from ${compass(c.windDirection)}, gusts ${n(c.windGusts)} km/h.</p>`);
    parts.push(`<h2>Rain</h2><p><b>${esc(o2.headline)}</b>. ${esc(o2.detail)}</p>`);
    if (hr?.level) parts.push(`<p>Heavy-rain risk (next 24 h): <b>${hr.level.toUpperCase()}</b>. ${esc(hr.summary)} <i>Independent forecast, not an MMS warning.</i></p>`);
    const start = hourStart(nowMU());
    const next = f.hourly.filter((h) => h.time >= start).slice(0, 6);
    parts.push(`<h2>Next 6 hours</h2><table>${next.map((h) => `<tr><td>${hhmm(h.time)}</td><td>${n(h.temperature, "°")}</td><td>rain ${n(h.rainProbability, "%")}</td><td>${n(h.windSpeed)} km/h</td></tr>`).join("")}</table>`);
    parts.push(`<h2>Next days</h2><table>${f.daily.slice(0, 4).map((x) => `<tr><td>${esc(dayLabel(x.date))}</td><td>${n(x.tempMin, "°")}–${n(x.tempMax, "°")}</td><td>rain ${n(x.rainProbabilityMax, "%")}</td><td>gusts ${n(x.windGustsMax)}</td></tr>`).join("")}</table>`);
    if (d) parts.push(`<p>Sunrise ${hhmm(d.sunrise)} · Sunset ${hhmm(d.sunset)}</p>`);
    parts.push(`<p class="small">Updated ${formatUtcAsMU(f.provenance.retrievedAt)}. Weather data by Open-Meteo.com.</p>`);
  }
  const nearest = tc?.systems?.[0];
  if (nearest) parts.push(`<h2>Tropical system</h2><p>${esc(nearest.name)}: about ${nearest.distanceKm.mauritius.toLocaleString()} km from Mauritius, ${nearest.distanceKm.rodrigues.toLocaleString()} km from Rodrigues (international monitoring, GDACS).</p>`);
  parts.push(`<h2>Emergency</h2><p>${EMERGENCY_NUMBERS.map((e) => `${e.label}: <a href="tel:${e.number.split(" ")[0]}">${e.number}</a>`).join(" · ")}</p>`);

  const options = ["mauritius", "rodrigues"]
    .map((isl) => `<optgroup label="${isl === "rodrigues" ? "Rodrigues" : "Mauritius"}">${LOCALITIES.filter((l) => l.island === isl).map((l) => `<option value="${l.id}"${l.id === loc.id ? " selected" : ""}>${esc(l.name)}</option>`).join("")}</optgroup>`)
    .join("");

  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Letan Moris (light) — ${esc(loc.name)}</title>
<style>body{font:16px/1.45 system-ui,sans-serif;margin:0;padding:12px;color:#0B2A3C;background:#fff;max-width:640px}h1{font-size:20px;margin:0 0 6px}h2{font-size:16px;margin:16px 0 4px}table{border-collapse:collapse}td{padding:3px 10px 3px 0}.alert{background:#D9480F;color:#fff;padding:8px;border-radius:8px}.note{background:#F4F8F9;padding:8px;border-radius:8px}.small{font-size:12px;color:#4A5B66}select,button{font-size:16px;padding:6px}a{color:#0B7F86}</style></head>
<body><h1>Letan Moris — ${esc(loc.name)}</h1>
<form action="/lite" method="get"><select name="loc" aria-label="Place">${options}</select> <button>Show</button></form>
${parts.join("\n")}
<p class="small">Independent forecast, not an official warning. Official warnings: <a href="${OFFICIAL_LINKS.mms.url}">MMS</a>. <a href="/">Full version</a></p>
</body></html>`;
  return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "public, s-maxage=600, stale-while-revalidate=3600" } });
}
