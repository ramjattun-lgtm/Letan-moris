import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fullDate, type PostSnapshot, type RegionSummary } from "./post-builder";
import type { IconKind } from "@/lib/weather/weather-codes";
import { hhmm } from "@/lib/time";

// Branded 1080×1350 share card (Facebook portrait). Built from the same snapshot as the text.

export const CARD_W = 1080;
export const CARD_H = 1350;

const NAVY = "#0B2A3C";
const TEAL_SOFT = "#3CCFCF";
const CORAL = "#F2A541";
const RAIN = "#2F7DE1";
const MIST = "#F4F8F9";

let fontsPromise: Promise<{ name: string; data: Buffer; weight: 400 | 600 | 800; style: "normal" }[]> | null = null;
function loadFonts() {
  fontsPromise ??= (async () => {
    const dir = path.join(process.cwd(), "assets", "fonts");
    const [jak, i400, i600] = await Promise.all([
      readFile(path.join(dir, "plus-jakarta-sans-latin-800-normal.woff")),
      readFile(path.join(dir, "inter-latin-400-normal.woff")),
      readFile(path.join(dir, "inter-latin-600-normal.woff")),
    ]);
    return [
      { name: "Jakarta", data: jak, weight: 800 as const, style: "normal" as const },
      { name: "Inter", data: i400, weight: 400 as const, style: "normal" as const },
      { name: "Inter", data: i600, weight: 600 as const, style: "normal" as const },
    ];
  })();
  return fontsPromise;
}

function Mark({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120">
      <line x1="22" y1="22" x2="17" y2="33" stroke="#5AA2FF" strokeWidth="5" strokeLinecap="round" />
      <line x1="34" y1="16" x2="29" y2="27" stroke="#5AA2FF" strokeWidth="5" strokeLinecap="round" />
      <line x1="46" y1="24" x2="41" y2="35" stroke="#5AA2FF" strokeWidth="5" strokeLinecap="round" />
      <path d="M90 96 a15 15 0 0 1 30 0z" fill={CORAL} />
      <path d="M8 96 L40 52 L54 68 L72 34 L112 96Z" fill={TEAL_SOFT} />
      <circle cx="72" cy="27" r="7" fill="#FFFFFF" />
      <path d="M10 106 q8 -7 16 0 t16 0 t16 0 t16 0 t16 0 t16 0" fill="none" stroke="#FFFFFF" strokeWidth="5" strokeLinecap="round" />
      <path d="M86 44 c-10 -2 -14 6 -6 8 c6 1 6 -6 0 -6" fill="none" stroke="#E7EEF2" strokeWidth="3.5" strokeLinecap="round" />
      <path d="M80 52 h22 M84 60 h16" stroke="#E7EEF2" strokeWidth="3.5" strokeLinecap="round" />
      <path d="M44 101 q13 5 28 0 l-4 5 h-20 z" fill="#FFFFFF" stroke="#0B2A3C" strokeWidth="1.5" />
      <path d="M57 100 L57 78 L70 98 Z" fill="#FFFFFF" stroke="#FFFFFF" strokeWidth="2.5" strokeLinejoin="round" />
    </svg>
  );
}

function Icon({ kind, size }: { kind: IconKind; size: number }) {
  const sun = (
    <g>
      <circle cx="24" cy="22" r="8" fill={CORAL} />
      {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
        <line key={a} x1={24 + 11 * Math.cos((a * Math.PI) / 180)} y1={22 + 11 * Math.sin((a * Math.PI) / 180)} x2={24 + 14 * Math.cos((a * Math.PI) / 180)} y2={22 + 14 * Math.sin((a * Math.PI) / 180)} stroke={CORAL} strokeWidth="2.5" strokeLinecap="round" />
      ))}
    </g>
  );
  const cloud = (fill: string) => <path d="M16 40h24a8 8 0 0 0 0-16 11 11 0 0 0-21-2 8 8 0 0 0-3 18Z" fill={fill} />;
  const drops = [20, 28, 36].map((x) => <line key={x} x1={x} y1="44" x2={x - 2} y2="50" stroke={RAIN} strokeWidth="2.5" strokeLinecap="round" />);
  let body;
  if (kind === "clear") body = <g transform="translate(4 6)">{sun}</g>;
  else if (kind === "partly") body = <g><g transform="translate(-2 -4)">{sun}</g><g transform="translate(4 2)">{cloud("#D7E2E8")}</g></g>;
  else if (kind === "rain" || kind === "showers" || kind === "drizzle") body = <g><g transform="translate(0 -4)">{cloud("#9FB2BF")}</g>{drops}</g>;
  else if (kind === "storm") body = <g><g transform="translate(0 -4)">{cloud("#7F94A3")}</g><path d="M28 40l-5 8h5l-3 7 9-11h-5l3-4Z" fill={CORAL} /></g>;
  else body = <g transform="translate(0 -2)">{cloud("#B8C7D1")}</g>;
  return (
    <svg width={size} height={size} viewBox="0 0 56 56">
      {body}
    </svg>
  );
}

function Row({ r, compact }: { r: RegionSummary; compact: boolean }) {
  const rainy = r.rainWindows.length > 0;
  return (
    <div style={{ display: "flex", alignItems: "center", background: "#FFFFFF", borderRadius: 28, padding: compact ? "4px 24px" : "16px 28px", marginBottom: compact ? 5 : 14 }}>
      <Icon kind={r.icon} size={compact ? 48 : 80} />
      <div style={{ display: "flex", flexDirection: "column", marginLeft: 20, flexGrow: 1 }}>
        <div style={{ display: "flex", fontFamily: "Jakarta", fontSize: compact ? 28 : 36, color: NAVY }}>{r.label}</div>
        <div style={{ display: "flex", fontSize: compact ? 20 : 24, color: "#4A5B66" }}>{r.place}</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
        <div style={{ display: "flex", fontFamily: "Jakarta", fontSize: compact ? 30 : 42, color: NAVY }}>
          {r.tempMin}–{r.tempMax}°
        </div>
        <div style={{ display: "flex", fontSize: compact ? 22 : 26, fontWeight: 600, color: rainy ? RAIN : /^(showers possible|a few showers)/.test(r.phrase) ? "#3A6EA5" : "#0B7F86" }}>
          {rainy
            ? `Rain ${r.rainWindows[0]} · ${r.maxRainProb}%`
            : /^(showers possible|a few showers)/.test(r.phrase)
              ? `Showers possible · ${r.maxRainProb}%`
              : `Mostly dry · ${r.maxRainProb}%`}
        </div>
      </div>
    </div>
  );
}

export async function renderCard(s: PostSnapshot): Promise<ImageResponse> {
  const fonts = await loadFonts();
  const two = s.sections.length > 1;
  const titles: Record<string, string> = { morning: "Today", midday: "This afternoon", evening: "Tomorrow", weekend: "This weekend" };
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: MIST, fontFamily: "Inter" }}>
        <div style={{ display: "flex", flexShrink: 0, alignItems: "center", background: NAVY, padding: "36px 48px", color: "#FFFFFF" }}>
          <Mark size={96} />
          <div style={{ display: "flex", flexDirection: "column", marginLeft: 22, flexGrow: 1 }}>
            <div style={{ display: "flex", fontFamily: "Jakarta", fontSize: 46 }}>
              Letan <span style={{ color: TEAL_SOFT, marginLeft: 12 }}>Moris</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex", fontSize: 24, color: "#BFD3DD" }}>Konn letan, planifie to zournee.</div>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
            <div style={{ display: "flex", fontFamily: "Jakarta", fontSize: 44, color: CORAL }}>{titles[s.slot]}</div>
            <div style={{ display: "flex", fontSize: 24, color: "#BFD3DD" }}>{two ? s.sections.map((x) => x.label).join(" & ") : fullDate(s.sections[0].date)}</div>
          </div>
        </div>
        <div style={{ display: "flex", flexShrink: 0, background: "#0F3A55", padding: "8px 48px", fontSize: 19, color: TEAL_SOFT, fontWeight: 600 }}>
          Powered by 30 years of local weather history from Open-Meteo (ECMWF ERA5)
        </div>
        {!two && (
          <div style={{ display: "flex", padding: "26px 48px 0", fontFamily: "Jakarta", fontSize: 34, color: NAVY, lineHeight: 1.25 }}>{s.headline}</div>
        )}
        <div style={{ display: "flex", flexDirection: "column", padding: two ? "12px 48px 0" : "24px 48px 0", flexGrow: 1 }}>
          {s.sections.map((sec) => (
            <div key={sec.date} style={{ display: "flex", flexDirection: "column" }}>
              {two && <div style={{ display: "flex", fontFamily: "Jakarta", fontSize: 28, color: NAVY, marginBottom: 6 }}>{sec.label}</div>}
              {two
                ? sec.regions.map((r) => <Row key={r.key} r={r} compact />)
                : sec.regions.map((r) => <Row key={r.key} r={r} compact={false} />)}
            </div>
          ))}
        </div>
        <div style={{ display: "flex", flexDirection: "column", flexShrink: 0, padding: "14px 48px 26px", fontSize: 21, color: "#4A5B66" }}>
          <div style={{ display: "flex" }}>
            Issued {hhmm(s.issuedAtMU)} Mauritius time · letan-moris.vercel.app · Weather data by Open-Meteo.com
          </div>
          <div style={{ display: "flex", fontWeight: 600, color: NAVY }}>Independent forecast, not an official warning. Official warnings: MMS.</div>
        </div>
      </div>
    ),
    { width: CARD_W, height: CARD_H, fonts },
  );
}
