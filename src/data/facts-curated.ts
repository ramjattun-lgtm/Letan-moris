// "Did you know?" — hand-written facts. Only facts with `approved: true` are shown.
// To approve or edit from your phone: GitHub › this file › pencil icon › change false to true › Commit.
// Keep them short, factual and free of the words "official", "warning" and "safe" (Facebook checker).

export interface CuratedFact {
  id: string;
  category: "how" | "myth" | "local";
  text: string;
  source: string;
  approved: boolean;
  island?: "mauritius" | "rodrigues";
}

export const CURATED_FACTS: CuratedFact[] = [
  {
    id: "trade-winds",
    category: "how",
    text: "Most of the year, the south-east trade winds push moist sea air up against the island's hills. As the air rises it cools and drops its rain — which is why the windward south-east and the central plateau are much wetter than the sheltered west.",
    source: "How island rainfall works",
    approved: true,
  },
  {
    id: "plateau-cool",
    category: "how",
    text: "Air cools by roughly 6°C for every 1,000 m you climb. That is a big part of why Curepipe, at about 550 m, is often 3–5°C cooler than Port Louis on the same day.",
    source: "Standard atmosphere (environmental lapse rate)",
    approved: true,
  },
  {
    id: "cyclone-turn",
    category: "how",
    text: "In the Southern Hemisphere, cyclones spin clockwise. Many form north-east of Mauritius, move south-west, then curve away to the south-east as they meet the westerly winds further south.",
    source: "Tropical cyclone climatology, South-West Indian Ocean",
    approved: true,
  },
  {
    id: "afternoon-showers",
    category: "how",
    text: "On summer days the sun heats the land faster than the sea. Warm air rises over the hills and can build towering clouds by early afternoon — the classic short, heavy summer shower.",
    source: "How tropical showers form",
    approved: true,
  },
  {
    id: "normal-rain-level",
    category: "how",
    text: "\"Normal rain level\" on Letan Moris is the middle value of the same dates over many past years — half of past years were wetter, half drier. 100% means a typical amount for the time of year.",
    source: "Letan Moris method",
    approved: true,
  },
  {
    id: "uv-cloud",
    category: "myth",
    text: "Myth: you can't get sunburnt on a cloudy day. In Mauritius the UV index regularly reaches 10+ in summer, and thin cloud lets much of it through — sun protection still matters.",
    source: "WHO UV index guidance",
    approved: true,
  },
  {
    id: "rain-lagoon",
    category: "local",
    text: "After heavy rain, rivers carry soil and runoff into the lagoon. The water near river mouths can stay murky for a day or two even when the sun is back.",
    source: "Coastal runoff after heavy rain",
    approved: true,
  },
  {
    id: "rodrigues-dry",
    category: "local",
    text: "Rodrigues is much lower and smaller than Mauritius, so it squeezes less rain out of the trade winds — one reason households there rely so much on rainwater tanks.",
    source: "How island rainfall works",
    approved: true,
    island: "rodrigues",
  },
  {
    id: "lightning",
    category: "how",
    text: "If you can hear thunder, you are close enough to be struck by lightning. Get indoors and wait about 30 minutes after the last thunder before going back out.",
    source: "Lightning guidance (30-minute rule)",
    approved: true,
  },
  {
    id: "coral-heat",
    category: "how",
    text: "Corals bleach when the sea stays about 1°C above its usual summer maximum for several weeks. Scientists measure this build-up in \"degree heating weeks\" — the number shown on our Beach & Sea page.",
    source: "NOAA Coral Reef Watch",
    approved: true,
  },
];
