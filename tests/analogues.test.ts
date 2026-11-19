import { describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync, copyFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { findAnalogues, heading, seasonLabel, type HistStorm } from "@/lib/weather/intelligence/analogues.service";
import type { TrackPoint } from "@/lib/weather/providers/gdacs.provider";

// TEST DATA ONLY.
const storm = (sid: string, pts: [number, number][], wind = 150): HistStorm => ({
  sid,
  name: sid,
  season: 2022,
  maxWindKmh: wind,
  closest: { mauritius: { km: 100, time: "2022-02-02T12:00", windKmh: wind }, rodrigues: { km: 400, time: "2022-02-01T12:00", windKmh: wind } },
  points: pts.map(([lat, lon], i) => [lat, lon, `2022-02-0${1 + Math.floor(i / 4)}T${String((i % 4) * 6).padStart(2, "0")}:00`, wind]),
});
const SW = storm("SOUTHWEST", [[-14, 64], [-15.5, 62], [-17, 60], [-18.5, 58.5], [-20, 57]]);
const EAST = storm("EASTWARD", [[-17, 58], [-16.5, 60], [-16, 62], [-15.5, 64]]);
const FAR = storm("FAR", [[-10, 80], [-12, 78], [-14, 76]]);

const now: TrackPoint[] = [
  { lat: -14.6, lon: 63.4, time: "2026-02-01T00:00:00Z", observed: true, windKmh: 140 },
  { lat: -15.9, lon: 61.7, time: "2026-02-01T12:00:00Z", observed: true, windKmh: 140 },
];

describe("past storms on a similar path", () => {
  it("matches storms near the current position moving the same way, and ignores others", () => {
    const a = findAnalogues(now, 140, [SW, EAST, FAR]);
    expect(a.map((x) => x.sid)).toEqual(["SOUTHWEST"]);
    expect(a[0].matchKm).toBeLessThan(100);
    expect(a[0].path[0]).toEqual([62, -15.5]);
  });
  it("needs at least two observed positions", () => {
    expect(findAnalogues(now.slice(0, 1), 140, [SW])).toEqual([]);
  });
  it("helpers", () => {
    expect(Math.round(heading({ lat: -20, lon: 57 }, { lat: -20, lon: 58 }))).toBe(90);
    expect(seasonLabel(2022)).toBe("2021–22");
  });
});

describe("IBTrACS builder script", () => {
  it("keeps only storms near Mauritius/Rodrigues since 1980, 6-hourly, with closest approach", () => {
    const dir = mkdtempSync(path.join(tmpdir(), "ibt-"));
    const rows = [
      "SID,SEASON,NUMBER,BASIN,SUBBASIN,NAME,ISO_TIME,NATURE,LAT,LON,WMO_WIND,WMO_PRES,WMO_AGENCY,TRACK_TYPE,USA_WIND,REU_WIND",
      " ,Year, , , , , , ,degrees_north,degrees_east,kts,mb, , ,kts,kts",
      "2022A,2022,1,SI,MM,NEAR,2022-02-02 00:00:00,TS,-18.0,58.0,80,960,reunion,main,90,80",
      "2022A,2022,1,SI,MM,NEAR,2022-02-02 03:00:00,TS,-18.5,57.8,80,960,reunion,main,90,80",
      "2022A,2022,1,SI,MM,NEAR,2022-02-02 06:00:00,TS,-19.5,57.6,85,955,reunion,main,95,85",
      "2022B,2022,2,SI,MM,FARAWAY,2022-03-01 00:00:00,TS,-10.0,85.0,50,990,reunion,main,55,50",
      "1975A,1975,1,SI,MM,OLD,1975-01-01 00:00:00,TS,-20.0,57.5,90,950,reunion,main,95,90",
    ];
    writeFileSync(path.join(dir, "si.csv"), rows.join("\n"));
    mkdirSync(path.join(dir, "src/data"), { recursive: true });
    mkdirSync(path.join(dir, "scripts"), { recursive: true });
    copyFileSync("scripts/build-cyclone-history.mjs", path.join(dir, "scripts/build-cyclone-history.mjs"));
    execFileSync("node", ["scripts/build-cyclone-history.mjs", "si.csv"], { cwd: dir });
    const out = JSON.parse(readFileSync(path.join(dir, "src/data/cyclone-history.json"), "utf8"));
    expect(out.storms).toHaveLength(1);
    const s = out.storms[0];
    expect(s.name).toBe("NEAR");
    expect(s.points).toHaveLength(2); // 03:00 dropped (6-hourly only)
    expect(s.closest.mauritius.km).toBeLessThan(90);
    expect(s.maxWindKmh).toBe(Math.round(85 * 1.852));
  });
});
