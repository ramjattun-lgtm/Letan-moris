import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET as forecastGET } from "@/app/api/forecast/route";
import { GET as mapGET } from "@/app/api/map/route";
import { fakeOpenMeteo } from "./fixtures";

afterEach(() => vi.unstubAllGlobals());

const req = (path: string) => new NextRequest(new URL(path, "http://localhost"));

describe("API routes", () => {
  it("returns a normalised forecast with cache headers", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify(fakeOpenMeteo("2026-11-20")), { status: 200 })));
    const res = await forecastGET(req("/api/forecast?loc=port-louis"));
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toContain("s-maxage");
    const body = await res.json();
    expect(body.locationId).toBe("port-louis");
    expect(body.provenance.provider).toBe("open-meteo");
  });

  it("rejects bad input", async () => {
    expect((await forecastGET(req("/api/forecast?loc=../../etc"))).status).toBe(400);
    expect((await forecastGET(req("/api/forecast?loc=atlantis"))).status).toBe(404);
    expect((await mapGET(req("/api/map?island=reunion"))).status).toBe(400);
  });

  it("reports provider failure honestly (502) instead of returning fake data", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ error: true, reason: "Daily API request limit exceeded" }), { status: 429 })));
    const res = await forecastGET(req("/api/forecast?loc=curepipe"));
    expect(res.status).toBe(502);
    const body = await res.json();
    expect(body.message).toContain("limit");
    expect(res.headers.get("cache-control")).toBe("no-store");
  });

  it("returns map points for Rodrigues", async () => {
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      const n = new URL(url).searchParams.get("latitude")!.split(",").length;
      return new Response(JSON.stringify(Array.from({ length: n }, () => fakeOpenMeteo("2026-11-20"))), { status: 200 });
    }));
    const res = await mapGET(req("/api/map?island=rodrigues"));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.points.length).toBeGreaterThan(3);
    expect(body.points[0].temperature).toBe(27.4);
  });
});
