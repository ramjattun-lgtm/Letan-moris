import { describe, expect, it } from "vitest";
import { addDays, addHours, dayLabel, hhmm, minutesBetween, nowMU, todayMU } from "@/lib/time";

describe("Mauritius time (UTC+4)", () => {
  it("converts UTC to Mauritius time, including the date change at 20:00 UTC", () => {
    expect(nowMU(new Date("2026-11-19T15:30:00Z"))).toBe("2026-11-19T19:30");
    expect(nowMU(new Date("2026-11-19T21:30:00Z"))).toBe("2026-11-20T01:30");
    expect(todayMU(new Date("2026-12-31T20:00:00Z"))).toBe("2027-01-01");
  });
  it("adds hours and days across boundaries", () => {
    expect(addHours("2026-11-19T23:00", 1)).toBe("2026-11-20T00:00");
    expect(addDays("2026-02-28", 1)).toBe("2026-03-01");
    expect(minutesBetween("2026-11-19T23:30", "2026-11-20T00:15")).toBe(45);
  });
  it("labels today/tomorrow in Mauritius time", () => {
    const now = new Date("2026-11-19T21:00:00Z"); // 01:00 on the 20th in Mauritius
    expect(dayLabel("2026-11-20", now)).toBe("Today");
    expect(dayLabel("2026-11-21", now)).toBe("Tomorrow");
    expect(dayLabel("2026-11-22", now)).toBe("Sunday 22 Nov");
  });
  it("formats missing times as a dash", () => {
    expect(hhmm(null)).toBe("—");
    expect(hhmm("2026-11-19T07:00")).toBe("07:00");
  });
});
