import { describe, expect, it } from "vitest";
import { forecastUrl, normaliseForecast, normaliseMapPoint } from "@/lib/weather/providers/open-meteo.provider";
import { fakeOpenMeteo } from "./fixtures";

describe("Open-Meteo normalisation", () => {
  it("maps the response into internal objects", () => {
    const f = normaliseForecast("port-louis", fakeOpenMeteo("2026-11-20"));
    expect(f.current.temperature).toBe(27.4);
    expect(f.current.kind).toBe("model");
    expect(f.hourly).toHaveLength(48);
    expect(f.daily[0].uvIndexMax).toBe(9.5);
    expect(f.rainResolution).toBe("hourly");
    expect(f.provenance.attribution.url).toContain("open-meteo.com");
    expect(f.provenance.gridElevation).toBe(12);
  });

  it("keeps missing values as null — never zero", () => {
    const raw = fakeOpenMeteo("2026-11-20");
    (raw.hourly.precipitation as (number | null)[])[3] = null;
    (raw.current as Record<string, unknown>).temperature_2m = null;
    delete (raw.daily as Record<string, unknown>).uv_index_max;
    const f = normaliseForecast("x", raw);
    expect(f.hourly[3].precipitation).toBeNull();
    expect(f.current.temperature).toBeNull();
    expect(f.daily[0].uvIndexMax).toBeNull();
  });

  it("survives an empty or malformed response without inventing data", () => {
    const f = normaliseForecast("x", {});
    expect(f.hourly).toEqual([]);
    expect(f.daily).toEqual([]);
    expect(f.current.temperature).toBeNull();
  });

  it("requests Mauritius time zone and km/h", () => {
    const u = forecastUrl(-20.16, 57.5);
    expect(u).toContain("timezone=Indian%2FMauritius");
    expect(u).toContain("wind_speed_unit=kmh");
    expect(u).toContain("forecast_days=7");
  });

  it("summarises the next 3 hours for the map", () => {
    const raw = fakeOpenMeteo("2026-11-20", { 10: [60, 1.2], 11: [80, 3] });
    const p = normaliseMapPoint("port-louis", raw, "2026-11-20T10:20");
    expect(p.rainProbNext3h).toBe(80);
    expect(p.rainNext3h).toBe(4.2);
  });
});
