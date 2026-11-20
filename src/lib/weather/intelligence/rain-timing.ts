// Rain timing helpers ("When does it usually rain here?"), shared by the Climate page and "Did you know?".
const FULL = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const hh = (h: number) => `${String(h).padStart(2, "0")}:00`;

/** Peak vs quietest daytime hour, and a plain sentence. */
export function timingSentence(row: (number | null)[], place: string, month: number) {
  const day = row.map((p, h) => ({ p, h })).filter((x) => x.p !== null && x.h >= 6 && x.h <= 21) as { p: number; h: number }[];
  if (day.length < 10) return null;
  const peak = day.reduce((a, b) => (b.p > a.p ? b : a));
  const low = day.reduce((a, b) => (b.p < a.p ? b : a));
  const ratio = low.p > 0 ? peak.p / low.p : null;
  if (ratio === null || ratio < 1.3) return `In ${FULL[month]}, rain in ${place} is about as likely at any time of day (around ${Math.round(day.reduce((a, x) => a + x.p, 0) / day.length)}% of daytime hours).`;
  return `In ${FULL[month]}, rain in ${place} is most likely around ${hh(peak.h)} (${peak.p}% of hours) and least likely around ${hh(low.h)} (${low.p}%) — about ${ratio >= 2 ? `${Math.round(ratio * 10) / 10}×` : `${Math.round((ratio - 1) * 100)}%`} ${ratio >= 2 ? "as likely" : "more likely"}.`;
}

