import { describe, expect, it } from "vitest";
import { normaliseForecast } from "@/lib/weather/providers/open-meteo.provider";
import { buildSnapshot, POST_REGIONS, rainPhrase, slotPlan, DISCLAIMER } from "@/lib/social/content/post-builder";
import { checkPost } from "@/lib/social/checker/post-validator.service";
import type { Forecast } from "@/lib/weather/types";
import { fakeOpenMeteo, hoursOf } from "./fixtures";

// TEST DATA ONLY.
function forecasts(date: string, rain: Record<string, Record<number, [number, number]>> = {}) {
  const out: Record<string, Forecast> = {};
  for (const r of POST_REGIONS) {
    const raw = fakeOpenMeteo(date, rain[r.locId] ?? {}) as Record<string, any>;
    const time = hoursOf(date, 168);
    for (const k of Object.keys(raw.hourly)) if (k !== "time") raw.hourly[k] = time.map((_: string, j: number) => raw.hourly[k][j % 24]);
    raw.hourly.time = time;
    raw.__fetchedAt = "2026-11-20T01:30:00Z";
    out[r.locId] = normaliseForecast(r.locId, raw);
  }
  return out;
}

describe("Facebook post builder", () => {
  const NOW = "2026-11-20T05:45"; // Friday morning, Mauritius time
  const now = new Date("2026-11-20T01:45:00Z");

  it("plans the right days for each slot", () => {
    expect(slotPlan("morning", NOW)[0].date).toBe("2026-11-20");
    expect(slotPlan("evening", "2026-11-20T18:30")[0].date).toBe("2026-11-21");
    const w = slotPlan("weekend", "2026-11-20T17:00");
    expect(w.map((x) => x.date)).toEqual(["2026-11-21", "2026-11-22"]);
  });

  it("builds a post covering every region including Rodrigues, with disclaimer and attribution", () => {
    const s = buildSnapshot("morning", forecasts("2026-11-20", { curepipe: { 14: [80, 3], 15: [70, 2] } }), NOW);
    expect(s.text).toContain("Rodrigues (Port Mathurin)");
    expect(s.text).toContain("Central Plateau (Curepipe): 26–26°C · rain likely about 14:00–16:00 (up to 80%)");
    expect(s.headline).toBe("Showers likely in the Central Plateau; drier elsewhere.");
    expect(s.text).toContain(DISCLAIMER);
    expect(s.text).toContain("Open-Meteo.com");
    expect(s.title).toContain("Friday 20 November");
    expect(checkPost(s, now).failures).toEqual([]);
  });

  it("checker blocks stale data, broken values, official-sounding words and missing disclaimer", () => {
    const f = forecasts("2026-11-20");
    const s = buildSnapshot("morning", f, NOW);
    expect(checkPost({ ...s, oldestDataUtc: "2026-11-19T10:00:00Z" }, now).failures.join()).toContain("too old");
    expect(checkPost({ ...s, text: s.text.replace(DISCLAIMER, "") }, now).ok).toBe(false);
    expect(checkPost({ ...s, text: s.text + "\nCyclone warning class II" }, now).ok).toBe(false);
    expect(checkPost({ ...s, text: s.text + " NaN" }, now).ok).toBe(false);
    expect(checkPost({ ...s, text: s.text + "\nThe sea is safe today." }, now).ok).toBe(false);
  });

  it("checker blocks posts with missing forecast values instead of guessing", () => {
    const f = forecasts("2026-11-20");
    f["port-mathurin"] = { ...f["port-mathurin"], hourly: [] };
    const s = buildSnapshot("morning", f, NOW);
    const c = checkPost(s, now);
    expect(c.ok).toBe(false);
    expect(c.failures.join()).toContain("Rodrigues");
  });

  it("describes rain honestly", () => {
    expect(rainPhrase(10, 0, [])).toBe("mostly dry (rain chance up to 10%)");
    expect(rainPhrase(40, 0.3, [])).toBe("a few showers possible (up to 40%)");
    expect(rainPhrase(null, null, [])).toBe("rain forecast not available");
  });
});
