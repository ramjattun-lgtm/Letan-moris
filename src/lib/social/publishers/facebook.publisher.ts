// Facebook Page publisher (Graph API). Credentials come only from environment variables.
// Posting to a Page needs a Page access token with pages_manage_posts.

export const GRAPH_VERSION = process.env.FACEBOOK_GRAPH_VERSION ?? "v26.0";

export interface FacebookConfig {
  pageId: string;
  token: string;
}

export function facebookConfig(): FacebookConfig | null {
  const pageId = process.env.FACEBOOK_PAGE_ID;
  const token = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
  return pageId && token ? { pageId, token } : null;
}

const graph = (p: string) => `https://graph.facebook.com/${GRAPH_VERSION}/${p}`;

/** Has a post with this exact first line already been published today? (prevents double posts) */
export async function alreadyPosted(cfg: FacebookConfig, title: string): Promise<boolean> {
  const since = Math.floor(Date.now() / 1000) - 36 * 3600;
  const url = `${graph(`${cfg.pageId}/posts`)}?fields=message&limit=25&since=${since}&access_token=${encodeURIComponent(cfg.token)}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Could not read recent Page posts (HTTP ${res.status})`);
  const body = (await res.json()) as { data?: { message?: string }[] };
  return (body.data ?? []).some((p) => (p.message ?? "").split("\n")[0].trim() === title.trim());
}

/** Upload the card image with the post text as its caption. */
export async function publishPhoto(cfg: FacebookConfig, png: ArrayBuffer, caption: string): Promise<{ id: string; postId?: string }> {
  const form = new FormData();
  form.append("source", new Blob([png], { type: "image/png" }), "letan-moris.png");
  form.append("caption", caption);
  form.append("published", "true");
  form.append("access_token", cfg.token);
  const res = await fetch(graph(`${cfg.pageId}/photos`), { method: "POST", body: form, cache: "no-store" });
  const body = (await res.json().catch(() => ({}))) as { id?: string; post_id?: string; error?: { message?: string } };
  if (!res.ok || !body.id) throw new Error(`Facebook refused the post: ${body.error?.message ?? `HTTP ${res.status}`}`);
  return { id: body.id, postId: body.post_id };
}

/** Quick token check: returns the Page name if the token works. */
export async function tokenHealth(cfg: FacebookConfig): Promise<{ ok: boolean; name?: string; error?: string }> {
  const res = await fetch(`${graph(cfg.pageId)}?fields=name&access_token=${encodeURIComponent(cfg.token)}`, { cache: "no-store" });
  const body = (await res.json().catch(() => ({}))) as { name?: string; error?: { message?: string } };
  return res.ok ? { ok: true, name: body.name } : { ok: false, error: body.error?.message ?? `HTTP ${res.status}` };
}

/** Has a reel with this exact first line been published in the last 36 hours? */
export async function alreadyPostedReel(cfg: FacebookConfig, title: string): Promise<boolean> {
  const url = `${graph(`${cfg.pageId}/video_reels`)}?fields=description,created_time&limit=25&access_token=${encodeURIComponent(cfg.token)}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Could not read recent Page reels (HTTP ${res.status})`);
  const body = (await res.json()) as { data?: { description?: string; created_time?: string }[] };
  const since = Date.now() - 36 * 3600e3;
  return (body.data ?? []).some((v) => (!v.created_time || Date.parse(v.created_time) >= since) && (v.description ?? "").split("\n")[0].trim() === title.trim());
}

/** Publish a reel (MP4, 9:16) in three steps: start → upload bytes → finish. Needs pages_manage_posts. */
export async function publishReel(cfg: FacebookConfig, mp4: ArrayBuffer, description: string): Promise<{ id: string; postId?: string }> {
  const start = await fetch(graph(`${cfg.pageId}/video_reels`), {
    method: "POST",
    body: new URLSearchParams({ upload_phase: "start", access_token: cfg.token }),
    cache: "no-store",
  });
  const s = (await start.json().catch(() => ({}))) as { video_id?: string; upload_url?: string; error?: { message?: string } };
  if (!start.ok || !s.video_id) throw new Error(`Facebook refused the reel (start): ${s.error?.message ?? `HTTP ${start.status}`}`);

  const up = await fetch(s.upload_url ?? `https://rupload.facebook.com/video-upload/${GRAPH_VERSION}/${s.video_id}`, {
    method: "POST",
    headers: { Authorization: `OAuth ${cfg.token}`, offset: "0", file_size: String(mp4.byteLength), "Content-Type": "application/octet-stream" },
    body: mp4,
    cache: "no-store",
  });
  const u = (await up.json().catch(() => ({}))) as { success?: boolean; error?: { message?: string } | string };
  if (!up.ok || !u.success) throw new Error(`Facebook refused the reel upload: ${typeof u.error === "string" ? u.error : (u.error?.message ?? `HTTP ${up.status}`)}`);

  const fin = await fetch(graph(`${cfg.pageId}/video_reels`), {
    method: "POST",
    body: new URLSearchParams({ upload_phase: "finish", video_id: s.video_id, video_state: "PUBLISHED", description, access_token: cfg.token }),
    cache: "no-store",
  });
  const f = (await fin.json().catch(() => ({}))) as { success?: boolean; post_id?: string; error?: { message?: string } };
  if (!fin.ok || f.success === false) throw new Error(`Facebook refused the reel (finish): ${f.error?.message ?? `HTTP ${fin.status}`}`);
  return { id: s.video_id, postId: f.post_id };
}
