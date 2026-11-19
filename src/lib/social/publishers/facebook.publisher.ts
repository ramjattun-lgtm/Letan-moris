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
