// Scoring for the forecast accuracy check (used by build-accuracy.mjs and the tests).
// What the forecast said for the day, in the same three steps the app uses in its wording:
export const SAID_DRY_MM = 0.5; // under 0.5 mm forecast → "dry"
export const SAID_LIKELY_MM = 2; // 2 mm or more → "rain likely"; in between → "showers possible"

export const said = (mm) => (mm >= SAID_LIKELY_MM ? "likely" : mm >= SAID_DRY_MM ? "possible" : "dry");

/**
 * pairs: [{ fcMm, obsWet }]. Scores what the forecast SAID, in the app's three steps:
 *  - "rain likely" days: how often it really rained
 *  - "dry" days: how often it really stayed dry
 *  - "showers possible" days: shown for information (a maybe can't be right or wrong)
 * clearCallPct = right answers among the "likely" and "dry" days.
 */
export function score(pairs) {
  const n = pairs.length;
  if (!n) return null;
  const by = { likely: [], possible: [], dry: [] };
  for (const p of pairs) by[said(p.fcMm)].push(p.obsWet);
  const rained = (xs) => xs.filter(Boolean).length;
  const clear = by.likely.length + by.dry.length;
  const right = rained(by.likely) + (by.dry.length - rained(by.dry));
  return {
    days: n,
    rainDaysSeen: pairs.filter((p) => p.obsWet).length,
    said: {
      likely: { days: by.likely.length, rained: rained(by.likely) },
      possible: { days: by.possible.length, rained: rained(by.possible) },
      dry: { days: by.dry.length, stayedDry: by.dry.length - rained(by.dry) },
    },
    clearCallPct: clear ? Math.round((right / clear) * 100) : null,
    missed: rained(by.dry), // said dry, but it rained
    falseAlarms: by.likely.length - rained(by.likely), // said rain likely, stayed dry
  };
}
