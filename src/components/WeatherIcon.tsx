import type { IconKind } from "@/lib/weather/weather-codes";

// Simple, consistent line icons (no emoji). Decorative: the label is always shown as text.
export function WeatherIcon({ kind, size = 32, night = false, animated = false }: { kind: IconKind; size?: number; night?: boolean; animated?: boolean }) {
  const sun = night ? (
    <path d="M30 14a12 12 0 1 0 10 18 10 10 0 0 1-10-18Z" fill="#94A9B8" />
  ) : (
    <g>
      <circle cx="24" cy="22" r="8" fill="#F2A541" />
      {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
        <line key={a} x1={24 + 11 * Math.cos((a * Math.PI) / 180)} y1={22 + 11 * Math.sin((a * Math.PI) / 180)} x2={24 + 14 * Math.cos((a * Math.PI) / 180)} y2={22 + 14 * Math.sin((a * Math.PI) / 180)} stroke="#F2A541" strokeWidth="2.5" strokeLinecap="round" />
      ))}
    </g>
  );
  const cloud = (fill = "#C9D6DE", dx = 0, dy = 0) => (
    <path transform={`translate(${dx} ${dy})`} d="M16 40h24a8 8 0 0 0 0-16 11 11 0 0 0-21-2 8 8 0 0 0-3 18Z" fill={fill} className={animated ? "drift" : ""} />
  );
  const drops = (n: number, color = "#2F7DE1") => (
    <g>
      {Array.from({ length: n }).map((_, i) => (
        <line key={i} x1={20 + i * 8} y1={44} x2={18 + i * 8} y2={50} stroke={color} strokeWidth="2.5" strokeLinecap="round" className={animated ? "fall" : ""} style={animated ? { animationDelay: `${i * 0.3}s` } : undefined} />
      ))}
    </g>
  );
  let body;
  switch (kind) {
    case "clear":
      body = night ? sun : <g transform="translate(4 4)">{sun}</g>;
      break;
    case "partly":
      body = (
        <g>
          <g transform="translate(-2 -4)">{sun}</g>
          {cloud("#D7E2E8", 4, 2)}
        </g>
      );
      break;
    case "cloudy":
      body = cloud("#B8C7D1", 0, -2);
      break;
    case "fog":
      body = (
        <g>
          {cloud("#C9D6DE", 0, -6)}
          {[40, 46].map((y) => (
            <line key={y} x1="12" y1={y} x2="44" y2={y} stroke="#9FB2BF" strokeWidth="2.5" strokeLinecap="round" />
          ))}
        </g>
      );
      break;
    case "drizzle":
      body = (
        <g>
          {cloud("#B8C7D1", 0, -4)}
          {drops(2, "#5AA2FF")}
        </g>
      );
      break;
    case "rain":
    case "showers":
      body = (
        <g>
          {kind === "showers" && <g transform="translate(-4 -8) scale(0.8)">{sun}</g>}
          {cloud("#9FB2BF", 0, -4)}
          {drops(3)}
        </g>
      );
      break;
    case "storm":
      body = (
        <g>
          {cloud("#7F94A3", 0, -4)}
          <path d="M28 40l-5 8h5l-3 7 9-11h-5l3-4Z" fill="#F2A541" />
        </g>
      );
      break;
    default:
      body = <circle cx="28" cy="28" r="10" fill="none" stroke="#9FB2BF" strokeWidth="2.5" strokeDasharray="4 4" />;
  }
  return (
    <svg width={size} height={size} viewBox="0 0 56 56" aria-hidden="true">
      {body}
    </svg>
  );
}
