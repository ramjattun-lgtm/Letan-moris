// OFFICIAL INFORMATION — entered manually by the owner, copied from Mauritius
// Meteorological Services (MMS). Never invent or guess. Leave `status` as "not-entered"
// unless you have just checked MMS. Always include the source link and the time.
//
// How to update (from a phone): open this file on GitHub › pencil icon › edit › Commit.
// Vercel redeploys automatically in about a minute.

export type OfficialStatus =
  | "not-entered" // we have not entered anything — users are told to check MMS
  | "no-warning" // MMS states no cyclone warning is in force
  | "warning"; // a warning is in force — put the exact MMS wording in `headline`

export interface OfficialEntry {
  status: OfficialStatus;
  /** Exact wording from MMS, e.g. "Cyclone warning Class II in force in Mauritius". */
  headline: string;
  /** Link to the MMS page or bulletin used. */
  sourceUrl: string;
  /** When MMS issued it, Mauritius time, e.g. "2026-11-20 10:00". */
  issuedAtMU: string;
  /** When the owner entered it, Mauritius time. */
  enteredAtMU: string;
}

export const OFFICIAL: Record<"mauritius" | "rodrigues", OfficialEntry> = {
  mauritius: { status: "not-entered", headline: "", sourceUrl: "", issuedAtMU: "", enteredAtMU: "" },
  rodrigues: { status: "not-entered", headline: "", sourceUrl: "", issuedAtMU: "", enteredAtMU: "" },
};

export const OFFICIAL_LINKS = {
  mms: { label: "Mauritius Meteorological Services (MMS)", url: "http://metservice.intnet.mu/" },
  rsmc: { label: "Météo-France La Réunion — regional tropical cyclone centre (RSMC)", url: "https://meteofrance.re/" },
};
