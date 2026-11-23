"use client";

import { useState } from "react";
import { flagReport, likeReport } from "@/lib/community/lapli";
import { readLS, writeLS } from "@/lib/client/storage";

/** "Useful" and "Report a problem" for one community report (database mode only). */
export function ReportActions({ id, likes }: { id: string; likes: number }) {
  const [state, setState] = useState<"idle" | "liked" | "flagged" | "busy">(() => (readLS<string[]>("letan.liked", []).includes(id) ? "liked" : "idle"));
  const [msg, setMsg] = useState<string | null>(null);
  const [bump, setBump] = useState(0);

  async function act(kind: "like" | "flag") {
    if (kind === "flag" && !window.confirm("Report this as wrong, spam or abusive? It is hidden once 3 people report it.")) return;
    setState("busy");
    try {
      await (kind === "like" ? likeReport : flagReport)(id);
      if (kind === "like") writeLS("letan.liked", [...readLS<string[]>("letan.liked", []), id].slice(-200));
      if (kind === "like") setBump(1);
      setState(kind === "like" ? "liked" : "flagged");
      setMsg(kind === "flag" ? "Thanks — we'll check it." : null);
    } catch (e) {
      setState("idle");
      setMsg((e as Error).message);
    }
  }

  const shown = likes + bump;
  return (
    <span className="ml-1 inline-flex flex-wrap items-center gap-2 text-xs">
      <button type="button" disabled={state !== "idle"} onClick={() => act("like")} className="rounded-full px-2 py-1 ring-1 ring-navy/15 disabled:opacity-60 dark:ring-white/20" aria-label="Mark this report as useful">
        👍 Useful{shown > 0 ? ` · ${shown}` : ""}
      </button>
      {state !== "flagged" && (
        <button type="button" disabled={state === "busy"} onClick={() => act("flag")} className="text-muted underline dark:text-slate-400">
          Report a problem
        </button>
      )}
      {msg && <span role="status">{msg}</span>}
    </span>
  );
}
