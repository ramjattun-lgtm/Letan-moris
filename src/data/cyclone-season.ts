// Seasonal context shown on the Cyclone page. Update each season from official sources.

export const SEASON = {
  name: "2026–2027",
  officialEnd: "15 May 2027",
  outlook:
    "Below-normal activity is expected in the South-West Indian Ocean (70% probability), with 6 to 10 named storms including 3 to 5 tropical cyclones, linked to a strong El Niño. An average season has about 10 named storms. The count includes Tropical Storm Agueda, which formed in October 2026.",
  outlookSource: { text: "WMO / RSMC La Réunion (Météo-France), 5 November 2026", url: "https://wmo.int/ar/node/39194" },
  reminder: "A quieter season does not mean no cyclone: one storm is enough to cause damage. Stay prepared all season.",
};

/** Plain-language summary of the MMS cyclone warning classes. Always defer to MMS for exact wording. */
export const WARNING_CLASSES = [
  { cls: "Class I", text: "Issued about 36–48 hours before the island may be affected by gusts of 120 km/h. Check your supplies and follow bulletins." },
  { cls: "Class II", text: "Issued, as far as practicable, about 12 hours before gusts of 120 km/h. Complete your preparations." },
  { cls: "Class III", text: "Issued, as far as practicable, about 6 hours before gusts of 120 km/h. Stay indoors in a safe place." },
  { cls: "Class IV", text: "Gusts of 120 km/h have been recorded and are expected to continue. Do not go out until the all-clear." },
];
