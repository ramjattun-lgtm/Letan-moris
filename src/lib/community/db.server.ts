import { createHash } from "node:crypto";
import { neon } from "@neondatabase/serverless";
import { WINDOW_MIN, type Report, type ReportKind } from "./lapli";

// Free Neon Postgres database for community reports. No accounts, no photos, no names.
// Each phone sends a random ID; we store only a one-way code made from it (and from the
// network address, for spam limits), so nobody can be identified from the data.

export const DB_URL = process.env.DATABASE_URL ?? process.env.POSTGRES_URL ?? "";
export const dbEnabled = () => DB_URL.length > 0;

export const LIMITS = {
  reportCooldownMin: 10, // one report per phone every 10 minutes
  reportsPerNetworkHour: 12, // shared Wi-Fi gets some room, a script does not
  flagsToHide: 3, // hidden from everyone once 3 different phones flag it
  keepDays: 7, // old reports are deleted after a week
};

const SALT = process.env.COMMUNITY_SALT ?? "letan-moris-community-v1";
export const oneWay = (v: string) => createHash("sha256").update(`${SALT}|${v}`).digest("hex").slice(0, 16);

type Sql = ReturnType<typeof neon>;
let sql: Sql | null = null;
let ready: Promise<void> | null = null;

function db(): Sql {
  if (!sql) sql = neon(DB_URL);
  return sql;
}

/** Creates the tables the first time (safe to run again). */
export function ensureSchema(): Promise<void> {
  if (!ready) {
    const q = db();
    ready = (async () => {
      await q`CREATE TABLE IF NOT EXISTS reports (
        id BIGSERIAL PRIMARY KEY,
        loc TEXT NOT NULL,
        kind TEXT NOT NULL,
        dev TEXT NOT NULL,
        net TEXT NOT NULL,
        created TIMESTAMPTZ NOT NULL DEFAULT now(),
        likes INT NOT NULL DEFAULT 0,
        flags INT NOT NULL DEFAULT 0,
        hidden BOOLEAN NOT NULL DEFAULT false,
        reviewed BOOLEAN NOT NULL DEFAULT false
      )`;
      await q`CREATE INDEX IF NOT EXISTS reports_created ON reports (created)`;
      await q`CREATE TABLE IF NOT EXISTS report_likes (report_id BIGINT NOT NULL, dev TEXT NOT NULL, PRIMARY KEY (report_id, dev))`;
      await q`CREATE TABLE IF NOT EXISTS report_flags (report_id BIGINT NOT NULL, dev TEXT NOT NULL, PRIMARY KEY (report_id, dev))`;
      // Visitor counter: one row per phone (anonymous code), plus one row per phone per day.
      await q`CREATE TABLE IF NOT EXISTS visitors (dev TEXT PRIMARY KEY, first_seen DATE NOT NULL DEFAULT CURRENT_DATE)`;
      await q`CREATE TABLE IF NOT EXISTS visits (day DATE NOT NULL, dev TEXT NOT NULL, PRIMARY KEY (day, dev))`;
    })().catch((e) => {
      ready = null;
      throw e;
    });
  }
  return ready;
}

interface Row {
  id: string;
  loc: string;
  kind: string;
  dev: string;
  t: string;
  likes: number;
}

export async function recentReports(): Promise<Report[]> {
  await ensureSchema();
  const rows = (await db()`SELECT id::text, loc, kind, dev, extract(epoch FROM created)::bigint::text AS t, likes
    FROM reports WHERE hidden = false AND created > now() - make_interval(mins => ${WINDOW_MIN})
    ORDER BY created DESC LIMIT 500`) as Row[];
  // The phone code is shortened again before it leaves the server.
  return rows.map((r) => ({ id: r.id, loc: r.loc, kind: r.kind as ReportKind, time: Number(r.t), dev: r.dev.slice(0, 8), likes: r.likes }));
}

export class LimitError extends Error {}

export async function addReport(loc: string, kind: ReportKind, dev: string, net: string): Promise<void> {
  await ensureSchema();
  const q = db();
  const [{ mine, network }] = (await q`SELECT
      count(*) FILTER (WHERE dev = ${dev} AND created > now() - make_interval(mins => ${LIMITS.reportCooldownMin}))::int AS mine,
      count(*) FILTER (WHERE net = ${net} AND created > now() - interval '1 hour')::int AS network
    FROM reports WHERE created > now() - interval '1 hour'`) as { mine: number; network: number }[];
  if (mine > 0) throw new LimitError(`Thanks — you can send another report in a few minutes.`);
  if (network >= LIMITS.reportsPerNetworkHour) throw new LimitError("Too many reports from this network — please try again later.");
  await q`INSERT INTO reports (loc, kind, dev, net) VALUES (${loc}, ${kind}, ${dev}, ${net})`;
  // Light housekeeping: about 1 write in 20 clears reports older than a week.
  if (Math.random() < 0.05) {
    await q`DELETE FROM report_likes WHERE report_id IN (SELECT id FROM reports WHERE created < now() - make_interval(days => ${LIMITS.keepDays}))`;
    await q`DELETE FROM report_flags WHERE report_id IN (SELECT id FROM reports WHERE created < now() - make_interval(days => ${LIMITS.keepDays}))`;
    await q`DELETE FROM reports WHERE created < now() - make_interval(days => ${LIMITS.keepDays})`;
  }
}

export async function like(id: string, dev: string): Promise<void> {
  await ensureSchema();
  const q = db();
  const added = (await q`INSERT INTO report_likes (report_id, dev) SELECT id, ${dev} FROM reports WHERE id = ${id} AND hidden = false
    ON CONFLICT DO NOTHING RETURNING report_id`) as unknown[];
  if (added.length) await q`UPDATE reports SET likes = likes + 1 WHERE id = ${id}`;
}

export async function flag(id: string, dev: string): Promise<void> {
  await ensureSchema();
  const q = db();
  const added = (await q`INSERT INTO report_flags (report_id, dev) SELECT id, ${dev} FROM reports WHERE id = ${id}
    ON CONFLICT DO NOTHING RETURNING report_id`) as unknown[];
  if (added.length)
    await q`UPDATE reports SET flags = flags + 1, hidden = (hidden OR (flags + 1 >= ${LIMITS.flagsToHide} AND reviewed = false)) WHERE id = ${id}`;
}

// ——— Moderation (owner only, protected by the MODERATION_KEY setting) ———

export async function flagged(): Promise<(Report & { flags: number; hidden: boolean })[]> {
  await ensureSchema();
  const rows = (await db()`SELECT id::text, loc, kind, dev, extract(epoch FROM created)::bigint::text AS t, likes, flags, hidden
    FROM reports WHERE flags > 0 AND reviewed = false ORDER BY flags DESC, created DESC LIMIT 100`) as (Row & { flags: number; hidden: boolean })[];
  return rows.map((r) => ({ id: r.id, loc: r.loc, kind: r.kind as ReportKind, time: Number(r.t), likes: r.likes, flags: r.flags, hidden: r.hidden }));
}

/** keep = show it again and ignore further flags; remove = hide it for good. */
export async function moderate(id: string, decision: "keep" | "remove"): Promise<void> {
  await ensureSchema();
  if (decision === "keep") await db()`UPDATE reports SET hidden = false, reviewed = true WHERE id = ${id}`;
  else await db()`UPDATE reports SET hidden = true, reviewed = true WHERE id = ${id}`;
}

// ——— Visitor counter (anonymous; one count per phone per day) ———

export async function recordVisit(dev: string, day: string): Promise<void> {
  await ensureSchema();
  const q = db();
  await q`INSERT INTO visitors (dev) VALUES (${dev}) ON CONFLICT DO NOTHING`;
  await q`INSERT INTO visits (day, dev) VALUES (${day}::date, ${dev}) ON CONFLICT DO NOTHING`;
  if (Math.random() < 0.02) await q`DELETE FROM visits WHERE day < (${day}::date - 35)`;
}

export async function visitCounts(day: string): Promise<{ total: number; today: number; month: number }> {
  await ensureSchema();
  const [r] = (await db()`SELECT
      (SELECT count(*) FROM visitors)::int AS total,
      (SELECT count(*) FROM visits WHERE day = ${day}::date)::int AS today,
      (SELECT count(DISTINCT dev) FROM visits WHERE day > (${day}::date - 30))::int AS month`) as { total: number; today: number; month: number }[];
  return r;
}
