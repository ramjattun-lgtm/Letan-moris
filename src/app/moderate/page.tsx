"use client";

import { useCallback, useState } from "react";
import { getLocality } from "@/data/localities";
import { KINDS } from "@/lib/community/lapli";

interface Flagged {
  id: string;
  loc: string;
  kind: string;
  time: number;
  likes: number;
  flags: number;
  hidden: boolean;
}

/** Owner-only review of flagged community reports. Needs the MODERATION_KEY set in Vercel. */
export default function ModeratePage() {
  const [key, setKey] = useState("");
  const [items, setItems] = useState<Flagged[] | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async (k: string) => {
    setMsg(null);
    const res = await fetch("/api/community/moderate", { headers: { "x-moderation-key": k }, cache: "no-store" });
    const j = (await res.json().catch(() => ({}))) as { reports?: Flagged[]; message?: string };
    if (!res.ok) return setMsg(j.message ?? `Error ${res.status}`);
    setItems(j.reports ?? []);
  }, []);

  async function decide(id: string, decision: "keep" | "remove") {
    const res = await fetch("/api/community/moderate", { method: "POST", headers: { "x-moderation-key": key, "content-type": "application/json" }, body: JSON.stringify({ id, decision }) });
    if (!res.ok) return setMsg(`Could not save (${res.status})`);
    setItems((xs) => (xs ?? []).filter((x) => x.id !== id));
  }

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="font-[family-name:var(--font-display)] text-2xl font-extrabold">Review flagged reports</h1>
      <p className="mt-1 text-sm text-muted dark:text-slate-400">For the site owner. Reports are hidden automatically once 3 phones flag them; here you decide for good.</p>
      <form
        className="mt-4 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          load(key);
        }}
      >
        <input type="password" value={key} onChange={(e) => setKey(e.target.value)} placeholder="Moderation key" className="min-h-11 flex-1 rounded-xl px-3 ring-1 ring-navy/20 dark:bg-night-card" autoComplete="current-password" />
        <button className="min-h-11 rounded-xl bg-navy px-4 font-semibold text-white">Open</button>
      </form>
      {msg && <p role="status" className="mt-3 text-sm font-semibold">{msg}</p>}
      {items && items.length === 0 && <p className="mt-4 text-sm">Nothing to review. 🎉</p>}
      <ul className="mt-4 space-y-3">
        {(items ?? []).map((r) => (
          <li key={r.id} className="card text-sm">
            <strong>{KINDS.find((k) => k.id === r.kind)?.english ?? r.kind}</strong> in {getLocality(r.loc)?.name ?? r.loc} · {new Date(r.time * 1000).toLocaleString("en-GB", { timeZone: "Indian/Mauritius" })}
            <br />
            {r.flags} flag{r.flags === 1 ? "" : "s"} · {r.likes} useful · {r.hidden ? "hidden now" : "still showing"}
            <div className="mt-2 flex gap-2">
              <button type="button" onClick={() => decide(r.id, "keep")} className="min-h-10 rounded-xl bg-teal/15 px-3 font-semibold">Keep (show)</button>
              <button type="button" onClick={() => decide(r.id, "remove")} className="min-h-10 rounded-xl bg-[#D9480F] px-3 font-semibold text-white">Remove</button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
