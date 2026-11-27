import { describe, expect, it } from "vitest";
import { tr } from "@/lib/i18n";

describe("whole-site translation", () => {
  it("translates fixed text and falls back from Kreol to French", () => {
    expect(tr("River watch", {}, "fr")).toBe("Surveillance des rivières");
    expect(tr("River watch", {}, "mfe")).toBe("Siveyans larivier");
    expect(tr("Explore", {}, "mfe")).toBe("Explorer"); // no Kreol yet → French
    expect(tr("Something brand new", {}, "fr")).toBe("Something brand new"); // unknown → English
  });

  it("translates rule sentences with numbers and times", () => {
    expect(tr("Up to 12.5 mm in one hour around 14:00.", {}, "fr")).toBe("Jusqu'à 12.5 mm en une heure vers 14:00.");
    expect(tr("Morning (06:00–08:00): rain risk high", {}, "mfe")).toBe("Bomatin (06:00–08:00): gro risk lapli");
    expect(tr("Rain likely from about 13:00 until about 16:00", {}, "fr")).toBe("Pluie probable de 13:00 à 16:00 environ");
  });

  it("drops optional parts when a value is missing", () => {
    expect(tr("High heavy-rain risk. Water accumulation and flash flooding are possible in low-lying and flood-prone areas.", {}, "fr")).toBe(
      "Risque élevé de fortes pluies. Accumulations d'eau et crues soudaines possibles dans les zones basses et inondables.",
    );
    expect(tr("Up to 70% chance.", {}, "fr")).toBe("Jusqu'à 70 % de risque.");
    expect(tr("Up to 70% chance (moderate), about 4 mm in total.", {}, "fr")).toBe("Jusqu'à 70 % de risque (intensité : modérée), environ 4 mm au total.");
  });

  it("river safety messages are in Kreol", () => {
    expect(tr("Heavy rain over the hills above Port Louis: about 32 mm in the last 3 hours. The river can rise quickly and suddenly in Port Louis — even if it is dry there. Keep away from the river, bridges, fords and canals.", {}, "mfe")).toBe(
      "Gro lapli lor the hills above Port Louis: apepre 32 mm dan 3 dernie erdtan. Larivier kapav monte vit ek sibitman dan Port Louis — mem si li sek laba. Res lwin ar larivier, pon, pasaz ek kanal.",
    );
  });
});

import { splitSentences } from "@/lib/i18n";
describe("sentence splitting (no lookbehind, works on older iPhones)", () => {
  it("splits like before", () => {
    expect(splitSentences("One. Two! 3 more? \"Quote\" ok.")).toEqual(["One.", "Two!", "3 more?", '"Quote" ok.']);
    expect(splitSentences("About 4.5 mm. not split")).toEqual(["About 4.5 mm. not split"]);
    expect(splitSentences("No split here")).toEqual(["No split here"]);
  });
});
