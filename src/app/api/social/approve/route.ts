import { type NextRequest } from "next/server";
import { isSlot, publish, publishStoredReel, validPlan, verify, verifyReel } from "@/lib/social/social.service";

export const maxDuration = 60;

const page = (title: string, body: string, ok: boolean) =>
  new Response(
    `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${title}</title>
<style>body{font-family:system-ui,sans-serif;background:#F4F8F9;color:#0B2A3C;margin:0;padding:24px}main{max-width:560px;margin:auto;background:#fff;border-radius:24px;padding:24px}h1{color:${ok ? "#0B7F86" : "#9A5B06"}}pre{white-space:pre-wrap;font:14px/1.5 system-ui;background:#F4F8F9;padding:12px;border-radius:12px}</style></head>
<body><main><h1>${title}</h1>${body}</main></body></html>`,
    { status: ok ? 200 : 400, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } },
  );

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

function params(req: NextRequest) {
  const q = req.nextUrl.searchParams;
  return { slot: q.get("slot"), plan: q.get("plan"), exp: Number(q.get("exp")), sig: q.get("sig") ?? "", reel: q.get("reel") === "1", vh: q.get("vh") ?? "", jh: q.get("jh") ?? "" };
}

function valid(p: ReturnType<typeof params>): boolean {
  if (!isSlot(p.slot) || !validPlan(p.plan)) return false;
  return p.reel ? verifyReel(p.slot, p.plan, p.exp, p.vh, p.jh, p.sig) : verify(p.slot, p.plan, p.exp, p.sig);
}

// Step 1 (GET): show a confirmation page. Opening the link alone never posts —
// some email apps open links automatically to scan them.
export async function GET(req: NextRequest) {
  const p = params(req);
  if (!valid(p)) {
    return page("Link not valid", "<p>This approval link is invalid or has expired, so nothing was posted. Old forecasts are not posted on purpose.</p>", false);
  }
  const action = esc(req.nextUrl.pathname + req.nextUrl.search);
  return page(
    "Post to Facebook?",
    `<p>${p.reel ? "The reel you watched will be checked again (and the latest MMS status) before publishing." : "The post will be rebuilt with the latest forecast and checked again before publishing."}</p>
<form method="post" action="${action}"><button style="font:600 18px system-ui;background:#0B2A3C;color:#fff;border:0;border-radius:999px;padding:14px 28px;cursor:pointer">Post now</button></form>
<p style="font-size:13px;color:#4A5B66">Changed your mind? Just close this page — nothing will be posted.</p>`,
    true,
  );
}

// Step 2 (POST): rebuild with the latest data, re-check, then publish.
export async function POST(req: NextRequest) {
  const p = params(req);
  const { slot, plan } = p;
  if (!valid(p) || !isSlot(slot) || !plan) {
    return page("Link not valid", "<p>This approval link is invalid or has expired, so nothing was posted. Old forecasts are not posted on purpose.</p>", false);
  }
  try {
    const out = p.reel ? await publishStoredReel(slot, plan, p.vh, p.jh) : await publish(slot, plan);
    if (out.status === "published") return page("Posted ✓", `<p>The post is now on the Letan Moris Facebook Page.</p><pre>${esc(out.text ?? "")}</pre>`, true);
    if (out.status === "duplicate") return page("Already posted", "<p>This post was already published, so it was not posted again.</p>", true);
    if (out.status === "blocked") return page("Not posted — checker found problems", `<ul>${out.failures.map((f) => `<li>${esc(f)}</li>`).join("")}</ul>`, false);
    if (out.status === "not-configured") return page("Facebook not connected yet", "<p>Add FACEBOOK_PAGE_ID and FACEBOOK_PAGE_ACCESS_TOKEN in Vercel first.</p>", false);
    return page("Posting is switched off", "<p>Posting mode is set to off in social-settings.</p>", false);
  } catch (e) {
    return page("Not posted", `<p>${esc((e as Error).message)}</p>`, false);
  }
}
