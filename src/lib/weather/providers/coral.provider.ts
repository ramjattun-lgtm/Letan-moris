// NOAA Coral Reef Watch, 5 km Regional Virtual Stations (public domain). Daily satellite sea temperature,
// anomaly, heat stress (Degree Heating Weeks) and Bleaching Alert level for "Northern Mauritius" and
// "Southern Mauritius". There is no station for Rodrigues.

export const CRW_STATIONS = [
  { id: "northern_mauritius", name: "Northern Mauritius" },
  { id: "southern_mauritius", name: "Southern Mauritius" },
] as const;

export const BAA_LEVELS = ["No stress", "Bleaching Watch", "Bleaching Warning", "Alert Level 1", "Alert Level 2", "Alert Level 3", "Alert Level 4", "Alert Level 5"];

export interface CoralStation {
  id: string;
  name: string;
  date: string; // YYYY-MM-DD
  sstMin: number;
  sstMax: number;
  anomaly: number; // °C vs normal for the date
  dhw: number; // °C-weeks of heat stress
  alert: number; // 0..7
  alertText: string;
  monthlyMean: number | null; // normal for this month
  mmm: number | null; // maximum monthly mean
  trend7: number | null; // change in SST max over 7 days
}

/** Parse a CRW Regional Virtual Station text file. */
export function parseCrw(text: string, id: string, name: string): CoralStation | null {
  const lines = text.split(/\r?\n/);
  const val = (label: string) => {
    const i = lines.findIndex((l) => l.trim().startsWith(label));
    return i >= 0 ? lines[i + 1]?.trim() ?? "" : "";
  };
  const mmm = Number(val("Averaged Maximum Monthly Mean"));
  const monthly = val("Averaged Monthly Mean").split(/\s+/).map(Number);
  const rows = lines
    .map((l) => l.trim().split(/\s+/))
    .filter((c) => c.length >= 10 && /^\d{4}$/.test(c[0]))
    .map((c) => ({ y: c[0], m: c[1], d: c[2], min: Number(c[3]), max: Number(c[4]), ssta: Number(c[6]), dhw: Number(c[8]), baa: Number(c[9]) }))
    .filter((r) => Number.isFinite(r.max) && r.max > 0 && r.max < 40);
  const last = rows[rows.length - 1];
  if (!last) return null;
  const week = rows[rows.length - 8];
  const month = Number(last.m);
  return {
    id,
    name,
    date: `${last.y}-${last.m}-${last.d}`,
    sstMin: last.min,
    sstMax: last.max,
    anomaly: Math.round(last.ssta * 10) / 10,
    dhw: Math.round(last.dhw * 10) / 10,
    alert: Number.isFinite(last.baa) ? last.baa : 0,
    alertText: BAA_LEVELS[last.baa] ?? "Unknown",
    monthlyMean: Number.isFinite(monthly[month - 1]) ? Math.round(monthly[month - 1] * 10) / 10 : null,
    mmm: Number.isFinite(mmm) && mmm > 0 ? Math.round(mmm * 10) / 10 : null,
    trend7: week ? Math.round((last.max - week.max) * 10) / 10 : null,
  };
}

export async function getCoralStations(): Promise<CoralStation[]> {
  const out = await Promise.all(
    CRW_STATIONS.map(async (s) => {
      try {
        const res = await fetch(`https://coralreefwatch.noaa.gov/product/vs/data/${s.id}.txt`, {
          next: { revalidate: 6 * 3600 },
          signal: AbortSignal.timeout(15_000),
          headers: { "User-Agent": "LetanMoris/0.1 (non-commercial)" },
        });
        if (!res.ok) return null;
        return parseCrw(await res.text(), s.id, s.name);
      } catch {
        return null;
      }
    }),
  );
  return out.filter((x): x is CoralStation => !!x);
}
