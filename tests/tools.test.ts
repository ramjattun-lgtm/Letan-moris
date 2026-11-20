import { describe, expect, it } from "vitest";
import { heatDay, heatLevel, mosquitoLevel } from "@/lib/weather/intelligence/wellbeing.service";
import { moonPhase, skyTonight } from "@/lib/weather/intelligence/sky.service";
import { parseCrw } from "@/lib/weather/providers/coral.provider";
import { nearStormNormals, seasonDay, stormChanceNear, type HistStorm } from "@/lib/weather/intelligence/cyclone-climate.service";
import type { HourlyPoint } from "@/lib/weather/types";

const hp = (time: string, o: Partial<HourlyPoint>): HourlyPoint => ({
  time, temperature: null, feelsLike: null, humidity: null, rainProbability: null, precipitation: null, weatherCode: null, cloudCover: null,
  windSpeed: null, windDirection: null, windGusts: null, uvIndex: null, solarRadiation: null, cloudLow: null, visibility: null, ...o,
});

describe("heat and mosquito weather", () => {
  it("bands the feels-like temperature", () => {
    expect(heatLevel(25)).toBe("low");
    expect(heatLevel(30)).toBe("caution");
    expect(heatLevel(35)).toBe("high");
    expect(heatLevel(42)).toBe("danger");
  });
  it("finds the hot hours of the working day", () => {
    const hours = Array.from({ length: 24 }, (_, h) => hp(`2026-12-10T${String(h).padStart(2, "0")}:00`, { feelsLike: h >= 11 && h <= 14 ? 35 : 24, uvIndex: 10 }));
    const d = heatDay(hours, "2026-12-10");
    expect(d.peak?.level).toBe("high");
    expect(d.windows).toEqual([{ from: "2026-12-10T11:00", to: "2026-12-10T15:00", level: "high" }]);
    expect(d.uvMax).toBe(10);
  });
  it("applies the mosquito rule", () => {
    expect(mosquitoLevel(10, 26)).toBe("low");
    expect(mosquitoLevel(30, 24)).toBe("favourable");
    expect(mosquitoLevel(80, 26)).toBe("very-favourable");
    expect(mosquitoLevel(null, 26)).toBeNull();
  });
});

describe("stargazing", () => {
  it("computes the moon phase", () => {
    expect(moonPhase(new Date(Date.UTC(2000, 0, 6, 18))).name).toBe("New Moon");
    expect(moonPhase(new Date(Date.UTC(2000, 0, 21, 5))).illumination).toBeGreaterThan(95); // full moon 21 Jan 2000
  });
  it("finds the clearest window tonight", () => {
    const hours: HourlyPoint[] = [];
    for (let h = 0; h < 24; h++) hours.push(hp(`2026-12-10T${String(h).padStart(2, "0")}:00`, { cloudCover: h >= 21 ? 10 : 80 }));
    for (let h = 0; h < 6; h++) hours.push(hp(`2026-12-11T${String(h).padStart(2, "0")}:00`, { cloudCover: h <= 2 ? 10 : 90 }));
    const s = skyTonight(hours, "2026-12-10")!;
    expect(s.clearHours).toBe(6);
    expect(s.bestWindow?.from).toBe("2026-12-10T21:00");
    expect(s.bestWindow?.to).toBe("2026-12-11T02:00");
  });
});

describe("coral reef watch", () => {
  it("parses a regional virtual station file", () => {
    const txt = `---\nName:\nNorthern Mauritius\n \nAveraged Maximum Monthly Mean:\n28.1000\n \nAveraged Monthly Mean (Jan-Dec):\n27.5 28.0 28.1 27.6 26.4 25.1 24.2 23.9 24.1 24.8 25.9 26.9\n \nYYYY MM DD SST_MIN SST_MAX SST@90th_HS SSTA@90th_HS 90th_HS>0 DHW_from_90th_HS>1 BAA_7day_max\n${Array.from({ length: 10 }, (_, i) => `2026 11 ${String(10 + i).padStart(2, "0")} 26.10 ${(27 + i * 0.1).toFixed(2)} 27.00 1.2000 0.5000 2.3000 1`).join("\n")}\n`;
    const s = parseCrw(txt, "northern_mauritius", "Northern Mauritius")!;
    expect(s.date).toBe("2026-11-19");
    expect(s.sstMax).toBeCloseTo(27.9);
    expect(s.anomaly).toBe(1.2);
    expect(s.dhw).toBe(2.3);
    expect(s.alertText).toBe("Bleaching Watch");
    expect(s.monthlyMean).toBe(25.9);
    expect(s.trend7).toBe(0.7);
  });
});

describe("cyclone climatology", () => {
  const storm = (season: number, t: string, lat: number, lon: number): HistStorm => ({
    sid: `${season}${t}`, name: "X", season, maxWindKmh: 150,
    closest: { mauritius: { km: 100, time: `${t}T00:00` }, rodrigues: { km: 900, time: `${t}T00:00` } },
    points: [[lat, lon, `${t}T00:00`, 150]],
  });
  const storms: HistStorm[] = [];
  for (let y = 1981; y <= 2020; y++) storms.push(storm(y, `${y}-02-10`, y % 4 === 0 ? -20.3 : -30, 57.6));
  it("counts season days from 1 July", () => {
    expect(seasonDay("2026-07-01")).toBe(0);
    expect(seasonDay("2027-01-01")).toBe(184);
  });
  it("gives the chance of a storm near a date", () => {
    const c = stormChanceNear(storms, "mauritius", "2027-02-12")!;
    expect(c.seasons).toBe(40);
    expect(c.pct).toBe(25);
    expect(stormChanceNear(storms, "mauritius", "2027-06-12")!.pct).toBe(0);
  });
  it("gives typical near storms per season and by now", () => {
    const n = nearStormNormals(storms, "mauritius", "2026-11-20")!;
    expect(n.perSeason).toBe(1);
    expect(n.byNow).toBe(0);
  });
});

import { timingSentence } from "@/components/ClimateEvidence";
describe("rain timing", () => {
  it("describes the peak and quietest daytime hours", () => {
    const row = Array.from({ length: 24 }, (_, h) => (h === 15 ? 30 : h === 9 ? 10 : 15));
    expect(timingSentence(row, "Curepipe", 0)).toBe("In January, rain in Curepipe is most likely around 15:00 (30% of hours) and least likely around 09:00 (10%) — about 3× as likely.");
    expect(timingSentence(Array(24).fill(20), "Curepipe", 6)).toMatch(/about as likely at any time/);
  });
});
