// FACEBOOK POSTING SETTINGS — edit on GitHub from your phone (pencil icon › Commit).
// Vercel redeploys in about a minute.
//
// mode:
//   "off"    — nothing is posted (kill switch)
//   "review" — each post is prepared, checked and sent to you to approve first
//   "auto"   — posts publish automatically after passing the checker
//
// Start in "review" for the first 2 weeks.

export const SOCIAL = {
  mode: "review" as "off" | "review" | "auto",
  slots: { morning: true, midday: true, evening: true, weekend: true },
  /** Approval links stop working after this many minutes (old forecasts should not be posted). */
  approvalValidMinutes: 180,
};
