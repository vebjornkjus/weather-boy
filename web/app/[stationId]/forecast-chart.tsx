"use client";

import type { Correction } from "@/lib/supabase";

type Props = {
  corrections: Correction[];
};

function formatHour(iso: string): string {
  return new Date(iso).toLocaleTimeString("nb-NO", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDay(iso: string): string {
  return new Date(iso).toLocaleDateString("nb-NO", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

export function ForecastChart({ corrections }: Props) {
  if (corrections.length === 0) return null;

  const temps = corrections.map((c) => [c.temp_original, c.temp_corrected]).flat();
  const minTemp = Math.floor(Math.min(...temps) - 1);
  const maxTemp = Math.ceil(Math.max(...temps) + 1);
  const range = maxTemp - minTemp || 1;

  const chartHeight = 200;
  const chartWidth = Math.max(corrections.length * 24, 600);

  function tempToY(temp: number): number {
    return chartHeight - ((temp - minTemp) / range) * chartHeight;
  }

  const yrLine = corrections
    .map((c, i) => `${i * 24},${tempToY(c.temp_original)}`)
    .join(" ");

  const correctedLine = corrections
    .map((c, i) => `${i * 24},${tempToY(c.temp_corrected)}`)
    .join(" ");

  // Find date boundaries
  const dates: { label: string; x: number }[] = [];
  let lastDate = "";
  corrections.forEach((c, i) => {
    const day = formatDay(c.valid_at);
    if (day !== lastDate) {
      dates.push({ label: day, x: i * 24 });
      lastDate = day;
    }
  });

  return (
    <div>
      <h2 className="mb-3 text-lg font-semibold">Temperaturprognose 48t</h2>

      <div className="flex gap-4 mb-2 text-sm">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-4 bg-blue-400" />
          Yr original
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-4 bg-emerald-600" />
          Weather-Boy
        </span>
      </div>

      <div className="overflow-x-auto rounded-lg border border-stone-200 bg-white p-4">
        <svg
          viewBox={`-40 -10 ${chartWidth + 50} ${chartHeight + 40}`}
          className="w-full"
          style={{ minWidth: chartWidth / 2 }}
        >
          {/* Zero line */}
          {minTemp <= 0 && maxTemp >= 0 && (
            <line
              x1={0}
              y1={tempToY(0)}
              x2={chartWidth}
              y2={tempToY(0)}
              stroke="#dc2626"
              strokeWidth={0.5}
              strokeDasharray="4 4"
            />
          )}

          {/* Y-axis labels */}
          {Array.from({ length: Math.ceil(range) + 1 }, (_, i) => minTemp + i).map(
            (temp) => (
              <g key={temp}>
                <text
                  x={-8}
                  y={tempToY(temp) + 4}
                  textAnchor="end"
                  className="fill-stone-400"
                  fontSize={10}
                >
                  {temp}°
                </text>
                <line
                  x1={0}
                  y1={tempToY(temp)}
                  x2={chartWidth}
                  y2={tempToY(temp)}
                  stroke="#e7e5e4"
                  strokeWidth={0.5}
                />
              </g>
            ),
          )}

          {/* Date boundaries */}
          {dates.map((d) => (
            <g key={d.x}>
              <line
                x1={d.x}
                y1={0}
                x2={d.x}
                y2={chartHeight}
                stroke="#d6d3d1"
                strokeWidth={0.5}
                strokeDasharray="2 2"
              />
              <text
                x={d.x + 4}
                y={chartHeight + 16}
                className="fill-stone-500"
                fontSize={10}
              >
                {d.label}
              </text>
            </g>
          ))}

          {/* Hour labels */}
          {corrections.map(
            (c, i) =>
              i % 6 === 0 && (
                <text
                  key={i}
                  x={i * 24}
                  y={chartHeight + 28}
                  textAnchor="middle"
                  className="fill-stone-400"
                  fontSize={9}
                >
                  {formatHour(c.valid_at)}
                </text>
              ),
          )}

          {/* Yr line */}
          <polyline
            points={yrLine}
            fill="none"
            stroke="#60a5fa"
            strokeWidth={1.5}
            strokeLinejoin="round"
          />

          {/* Corrected line */}
          <polyline
            points={correctedLine}
            fill="none"
            stroke="#059669"
            strokeWidth={2}
            strokeLinejoin="round"
          />
        </svg>
      </div>

      {/* Hourly detail table */}
      <details className="mt-4">
        <summary className="cursor-pointer text-sm text-stone-500 hover:text-stone-700">
          Vis timesverdier
        </summary>
        <div className="mt-2 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone-200 text-left text-stone-500">
                <th className="py-2 pr-4">Tid</th>
                <th className="py-2 pr-4">Yr</th>
                <th className="py-2 pr-4">Korrigert</th>
                <th className="py-2 pr-4">Diff</th>
                <th className="py-2 pr-4">Frost</th>
                <th className="py-2">Vind</th>
              </tr>
            </thead>
            <tbody>
              {corrections.map((c) => {
                const diff = c.temp_corrected - c.temp_original;
                return (
                  <tr key={c.valid_at} className="border-b border-stone-100">
                    <td className="py-1.5 pr-4 text-stone-600">
                      {formatHour(c.valid_at)}
                    </td>
                    <td className="py-1.5 pr-4">{c.temp_original?.toFixed(1)}°</td>
                    <td className="py-1.5 pr-4 font-medium">
                      {c.temp_corrected?.toFixed(1)}°
                    </td>
                    <td
                      className={`py-1.5 pr-4 ${diff < 0 ? "text-blue-600" : diff > 0 ? "text-red-600" : ""}`}
                    >
                      {diff > 0 ? "+" : ""}
                      {diff.toFixed(1)}°
                    </td>
                    <td className="py-1.5 pr-4">
                      <span
                        className={`inline-block h-2 w-2 rounded-full ${
                          c.frost_risk === "high"
                            ? "bg-red-500"
                            : c.frost_risk === "medium"
                              ? "bg-amber-500"
                              : "bg-green-500"
                        }`}
                      />
                    </td>
                    <td className="py-1.5">
                      {c.wind_speed_original?.toFixed(1)} m/s
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
