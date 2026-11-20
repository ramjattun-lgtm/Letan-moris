// ---- "Does history help?" — test of the "similar years" insight on the average of the 7 catchments.
// For each month start since 1951: take the last 6 months' rain (% of normal), find the 10 most similar
// OTHER years, predict the next 3 months as their median, and compare with what actually happened.
// The yardstick is simply assuming the next 3 months will be normal (100%).
export function validateAnalogues(series, start, end) {
  // series: Map date -> mm (average of catchments). Cumulative sums by day index for fast window sums.
  const day0 = Date.UTC(start, 0, 1);
  const n = Math.round((Date.UTC(end, 11, 31) - day0) / 86400000) + 1;
  const cum = new Float64Array(n + 1);
  const iso = (i) => new Date(day0 + i * 86400000).toISOString().slice(0, 10);
  for (let i = 0; i < n; i++) cum[i + 1] = cum[i] + (series.get(iso(i)) ?? 0);
  const idx = (y, m, d = 1) => Math.round((Date.UTC(y, m - 1, d) - day0) / 86400000);
  const sum = (a, b) => (a < 0 || b > n ? null : cum[b] - cum[a]); // [a, b)
  const med = (xs) => {
    const s = [...xs].sort((a, b) => a - b);
    const k = Math.floor(s.length / 2);
    return s.length % 2 ? s[k] : (s[k - 1] + s[k]) / 2;
  };
  let aErr = 0;
  let nErr = 0;
  let wins = 0;
  let cases = 0;
  let dryCalls = 0;
  let dryRight = 0;
  let dryBase = 0;
  const pairs = [];
  for (let m = 1; m <= 12; m++) {
    const rows = [];
    for (let y = start + 1; y <= end; y++) {
      const t = idx(y, m);
      const past = sum(t - 182, t);
      const next = sum(t, t + 90);
      if (past !== null && next !== null) rows.push({ y, past, next });
    }
    for (const r of rows) {
      const others = rows.filter((o) => o.y !== r.y);
      const pN = med(others.map((o) => o.past));
      const nN = med(others.map((o) => o.next));
      if (!pN || !nN) continue;
      const pct = (r.past / pN) * 100;
      const actual = (r.next / nN) * 100;
      const near = others
        .map((o) => ({ d: Math.abs((o.past / pN) * 100 - pct), next: (o.next / nN) * 100 }))
        .sort((a, b) => a.d - b.d)
        .slice(0, 10);
      const pred = med(near.map((x) => x.next));
      const ea = Math.abs(pred - actual);
      const en = Math.abs(100 - actual);
      aErr += ea;
      nErr += en;
      if (ea < en) wins++;
      cases++;
      if (actual < 85) dryBase++;
      if (pred < 85) {
        dryCalls++;
        if (actual < 85) dryRight++;
      }
      pairs.push([pct, actual]);
    }
  }
  if (!cases) return null;
  // Correlation between the last 6 months and the next 3 months (both % of normal).
  const mx = pairs.reduce((a, p) => a + p[0], 0) / pairs.length;
  const my = pairs.reduce((a, p) => a + p[1], 0) / pairs.length;
  let sxy = 0;
  let sxx = 0;
  let syy = 0;
  for (const [x, y] of pairs) {
    sxy += (x - mx) * (y - my);
    sxx += (x - mx) ** 2;
    syy += (y - my) ** 2;
  }
  return {
    method: "leave-one-year-out, every month since " + (start + 1),
    cases,
    analogueErrorPct: Math.round(aErr / cases),
    assumeNormalErrorPct: Math.round(nErr / cases),
    beatsNormalPct: Math.round((wins / cases) * 100),
    correlation: Math.round((sxy / Math.sqrt(sxx * syy)) * 100) / 100,
    drierCallHitPct: dryCalls ? Math.round((dryRight / dryCalls) * 100) : null,
    drierBaseRatePct: Math.round((dryBase / cases) * 100),
  };
}

