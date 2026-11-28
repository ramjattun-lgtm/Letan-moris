// Draws a Letan Moris reel (1080×1920 MP4, 30 fps) from a reel bundle made by /api/social/run?format=reel.
// Usage: node scripts/reel/render.mjs bundle.json out.mp4
// Needs: Chrome (CHROME_PATH, default /usr/bin/google-chrome), ffmpeg, playwright-core (or playwright).
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const [bundlePath, outPath] = process.argv.slice(2);
if (!bundlePath || !outPath) throw new Error("usage: render.mjs bundle.json out.mp4");

const require = createRequire(import.meta.url);
const load = (names) => {
  for (const n of names) {
    try {
      return require(n);
    } catch {}
  }
  throw new Error("Install playwright-core first.");
};
const { chromium } = load(["playwright-core", "playwright", process.env.PLAYWRIGHT_MODULE ?? "playwright-core"]);

const FPS = 30;
const bundle = JSON.parse(fs.readFileSync(bundlePath, "utf8"));
const plan = bundle.plan;
const dots = fs.readFileSync(path.join(here, "map-dots.json"), "utf8");
const frames = fs.mkdtempSync(path.join(os.tmpdir(), "reel-"));

const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH ?? "/usr/bin/google-chrome" });
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
await page.addInitScript(`window.__PLAN = ${JSON.stringify(plan)}; window.__DOTS = ${dots};`);
await page.goto(`file://${path.join(here, "reel.html")}`);
await page.evaluate(() => document.fonts.ready);
const duration = await page.evaluate(() => window.DURATION);
const n = Math.round(duration * FPS);
for (let i = 0; i < n; i++) {
  await page.evaluate((t) => window.draw(t), i / FPS);
  await page.screenshot({ path: path.join(frames, `f${String(i).padStart(4, "0")}.png`) });
}
await browser.close();

const video = ["-framerate", String(FPS), "-i", path.join(frames, "f%04d.png")];
const enc = ["-c:v", "libx264", "-preset", "veryfast", "-crf", "20", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "160k", "-movflags", "+faststart", "-t", duration.toFixed(2)];
const args =
  plan.kind === "mms"
    ? // The "Follow MMS" reel is silent on purpose.
      [...video, "-f", "lavfi", "-i", "anullsrc=r=44100:cl=stereo", "-map", "0:v", "-map", "1:a", ...enc]
    : [...video, "-i", path.join(here, "letan-moris-theme.m4a"), "-filter_complex", `[1:a]apad,atrim=0:${duration.toFixed(2)},afade=t=out:st=${(duration - 1.5).toFixed(2)}:d=1.5[a]`, "-map", "0:v", "-map", "[a]", ...enc];
execFileSync("ffmpeg", ["-y", "-loglevel", "error", ...args, outPath], { stdio: "inherit" });
fs.rmSync(frames, { recursive: true, force: true });
console.log(`Reel ready: ${outPath} (${duration.toFixed(1)} s, ${n} frames)`);
