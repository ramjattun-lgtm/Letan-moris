import type { PostSnapshot } from "../content/post-builder";
import { ATTRIBUTION, DISCLAIMER, POST_REGIONS, SITE_URL } from "../content/post-builder";
import { minutesBetween, nowMU } from "@/lib/time";

// Independent checker: runs before EVERY post. Any failure blocks publishing.

export interface CheckResult {
  ok: boolean;
  failures: string[];
  warnings: string[];
}

export const MAX_DATA_AGE_MIN = 6 * 60;
export const MAX_LENGTH = 2200;

export function checkPost(s: PostSnapshot, nowUtc: Date = new Date()): CheckResult {
  const failures: string[] = [];
  const warnings: string[] = [];
  const t = s.text;

  // 1. Required lines
  for (const req of [DISCLAIMER, ATTRIBUTION, SITE_URL, "Issued "]) if (!t.includes(req)) failures.push(`Missing required text: "${req}"`);

  // 2. Nothing broken or invented
  if (/\b(NaN|undefined|null|Infinity)\b/.test(t)) failures.push("Text contains a broken value (NaN/undefined/null).");
  for (const sec of s.sections) {
    if (sec.regions.length !== POST_REGIONS.length) failures.push(`Missing regions for ${sec.date}.`);
    for (const r of sec.regions) {
      if (r.tempMin === null || r.tempMax === null || r.maxRainProb === null) failures.push(`${r.label}: forecast values missing for ${sec.date}.`);
      else {
        if (r.tempMin > r.tempMax) failures.push(`${r.label}: min temperature above max.`);
        if (r.tempMin < 5 || r.tempMax > 40) failures.push(`${r.label}: temperature ${r.tempMin}–${r.tempMax}°C is outside the plausible range.`);
        if (r.maxRainProb < 0 || r.maxRainProb > 100) failures.push(`${r.label}: rain probability out of range.`);
        // Text and card come from the same snapshot; confirm the text really states these values.
        if (!t.includes(`${r.label} (${r.place}): ${r.tempMin}–${r.tempMax}°C`)) failures.push(`${r.label}: text does not match the forecast values.`);
      }
    }
  }

  // 3. Wording rules: never sound official, never mention warning classes
  const withoutDisclaimer = t.replace(DISCLAIMER, "");
  if (/\bofficial\b/i.test(withoutDisclaimer)) failures.push('The word "official" is only allowed in the disclaimer.');
  if (/\bwarning\b/i.test(withoutDisclaimer)) failures.push('The word "warning" is only allowed in the disclaimer.');
  if (/\bclass\s*(i{1,3}|iv|[1-4])\b/i.test(t)) failures.push("Cyclone warning classes must never appear in independent posts.");
  if (/\bsafe\b/i.test(t.replace("sea safety", ""))) failures.push('Never say conditions are "safe".');

  // 4. Freshness
  const ageMin = Math.round((nowUtc.getTime() - new Date(s.oldestDataUtc).getTime()) / 60000);
  if (!Number.isFinite(ageMin)) failures.push("Data time unknown.");
  else if (ageMin < -10) failures.push("Data time is in the future — clock problem.");
  else if (ageMin > MAX_DATA_AGE_MIN) failures.push(`Forecast data is too old (${ageMin} minutes).`);
  const issuedLag = Math.abs(minutesBetween(s.issuedAtMU, nowMU(nowUtc)));
  if (issuedLag > 30) failures.push("Issue time does not match the current Mauritius time.");

  // 5. Length
  if (t.length > MAX_LENGTH) failures.push(`Text too long (${t.length} characters).`);
  if (s.confidence === "low") warnings.push("Low confidence forecast — consider reviewing the wording.");

  return { ok: failures.length === 0, failures, warnings };
}
