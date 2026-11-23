import { describe, expect, it } from "vitest";
import { translate } from "@/lib/i18n";
import { nextHours, nextHoursHeadline } from "@/lib/weather/intelligence/next-hours";
import type { HourlyPoint } from "@/lib/weather/types";

describe("languages", () => {
  it("fills in values and falls back to English", () => {
    expect(translate("fr", "alerts.for", { place: "Curepipe" })).toBe("Alertes pour Curepipe");
    expect(translate("mfe", "alerts.for", { place: "Curepipe" })).toBe("Alert pou Curepipe");
    expect(translate("en", "next6.dry")).toBe("Dry for the next 6 hours.");
  });

  it("the 6-hour headline follows the language", () => {
    const h = [0, 1, 2, 3, 4, 5].map((i) => ({ time: `2026-11-23T${String(9 + i).padStart(2, "0")}:00`, rainProbability: 5, precipitation: 0 }) as HourlyPoint);
    const hours = nextHours(h, "2026-11-23T09:00");
    expect(nextHoursHeadline(hours, (k, v) => translate("mfe", k, v))).toBe("Pa pou ena lapli dan 6 erdtan ki pe vini.");
    expect(nextHoursHeadline(hours, (k, v) => translate("fr", k, v))).toBe("Temps sec pour les 6 prochaines heures.");
  });
});
