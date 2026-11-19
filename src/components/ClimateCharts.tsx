"use client";

import { Bar, CartesianGrid, ComposedChart, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { ClimateRegion } from "@/lib/weather/intelligence/climate.service";
import { monthName } from "@/lib/weather/intelligence/climate.service";

const AX = { fontSize: 11, fill: "#7A8B96" };

export function MonthlyChart({ r }: { r: ClimateRegion }) {
  const data = r.monthly.map((m) => ({ m: monthName(m.month), rain: m.rainMm, hi: m.tmax, lo: m.tmin }));
  return (
    <div className="h-64 w-full" role="img" aria-label={`Average monthly rain (bars) and temperatures (lines) for ${r.label}`}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: -18 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(74,91,102,0.18)" vertical={false} />
          <XAxis dataKey="m" tick={AX} interval={0} />
          <YAxis yAxisId="mm" tick={AX} unit="" />
          <YAxis yAxisId="t" orientation="right" tick={AX} domain={["dataMin - 2", "dataMax + 2"]} unit="°" />
          <Tooltip formatter={(v, n) => (n === "Rain" ? [`${v} mm`, n] : [`${v}°C`, n])} />
          <Bar yAxisId="mm" dataKey="rain" name="Rain" fill="#2F7DE1" radius={[4, 4, 0, 0]} />
          <Line yAxisId="t" dataKey="hi" name="Day high" stroke="#F2A541" strokeWidth={2.5} dot={false} />
          <Line yAxisId="t" dataKey="lo" name="Night low" stroke="#0FA3A3" strokeWidth={2.5} dot={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

export function TrendChart({ r }: { r: ClimateRegion }) {
  const data = r.annual.map((a) => ({ y: a.year, hi: a.tmax, lo: a.tmin }));
  return (
    <div className="h-48 w-full" role="img" aria-label={`Average yearly day and night temperatures for ${r.label}, ${r.annual[0]?.year}–${r.annual.at(-1)?.year}`}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: -18 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(74,91,102,0.18)" vertical={false} />
          <XAxis dataKey="y" tick={AX} interval={4} />
          <YAxis tick={AX} domain={["dataMin - 0.5", "dataMax + 0.5"]} unit="°" allowDecimals={false} />
          <Tooltip formatter={(v, n) => [`${v}°C`, n]} />
          <Line dataKey="hi" name="Average day high" stroke="#F2A541" strokeWidth={2} dot={false} />
          <Line dataKey="lo" name="Average night low" stroke="#0FA3A3" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
