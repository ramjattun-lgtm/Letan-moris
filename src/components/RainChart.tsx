"use client";

import { Bar, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { HourlyPoint } from "@/lib/weather/types";
import { hhmm } from "@/lib/time";

export function RainChart({ hours }: { hours: HourlyPoint[] }) {
  const data = hours.map((h) => ({
    t: hhmm(h.time),
    day: h.time.slice(0, 10),
    prob: h.rainProbability,
    mm: h.precipitation,
  }));
  return (
    <div className="h-64 w-full" role="img" aria-label="Chart of hourly rain chance (line) and rain amount (bars)">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(74,91,102,0.18)" vertical={false} />
          <XAxis dataKey="t" tick={{ fontSize: 11, fill: "#7A8B96" }} interval={5} />
          <YAxis yAxisId="p" domain={[0, 100]} tick={{ fontSize: 11, fill: "#7A8B96" }} unit="%" />
          <YAxis yAxisId="mm" orientation="right" tick={{ fontSize: 11, fill: "#7A8B96" }} unit="mm" allowDecimals />
          <Tooltip
            formatter={(v, name) => (v === null || v === undefined ? ["—", name] : name === "Rain chance" ? [`${v}%`, name] : [`${v} mm`, name])}
            labelFormatter={(l, p) => `${p?.[0]?.payload?.day ?? ""} ${l}`}
          />
          <Bar yAxisId="mm" dataKey="mm" name="Rain amount" fill="#2F7DE1" radius={[4, 4, 0, 0]} />
          <Line yAxisId="p" dataKey="prob" name="Rain chance" stroke="#0FA3A3" strokeWidth={2.5} dot={false} connectNulls={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
