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

  const temps = corrections
    .map((c) => [c.temp_original, c.temp_corrected])
    .flat();
  const minTemp = Math.floor(Math.min(...temps) - 1);
  const maxTemp = Math.ceil(Math.max(...temps) + 1);
  const range = maxTemp - minTemp || 1;

  // Responsive: use percentage-based x positioning
  const n = corrections.length;
  const chartHeight = 180;
  const chartWidth = 100; // percentage-based

  function tempToY(temp: number): number {
    return chartHeight - ((temp - minTemp) / range) * chartHeight;
  }

  function xPos(i: number): number {
    return (i / (n - 1)) * chartWidth;
  }

  // Find "now" position
  const now = Date.now();
  let nowX: number | null = null;
  for (let i = 0; i < corrections.length - 1; i++) {
    const t0 = new Date(corrections[i].valid_at).getTime();
    const t1 = new Date(corrections[i + 1].valid_at).getTime();
    if (now >= t0 && now <= t1) {
      const frac = (now - t0) / (t1 - t0);
      nowX = xPos(i) + frac * (xPos(i + 1) - xPos(i));
      break;
    }
  }

  const yrLine = corrections
    .map((c, i) => `${xPos(i)},${tempToY(c.temp_original)}`)
    .join(" ");

  const correctedLine = corrections
    .map((c, i) => `${xPos(i)},${tempToY(c.temp_corrected)}`)
    .join(" ");

  // Precipitation bars
  const maxPrecip = Math.max(...corrections.map((c) => c.precip ?? 0), 1);
  const precipBarHeight = 30;

  // Date boundaries
  const dates: { label: string; x: number }[] = [];
  let lastDate = "";
  corrections.forEach((c, i) => {
    const day = formatDay(c.valid_at);
    if (day !== lastDate) {
      dates.push({ label: day, x: xPos(i) });
      lastDate = day;
    }
  });

  // Y-axis labels
  const yLabels: number[] = [];
  for (let t = minTemp; t <= maxTemp; t++) {
    yLabels.push(t);
  }

  return (
    <div>
      <h2 className="mb-3 text-lg font-semibold">Prognose 48 timer</h2>

      <div className="mb-2 flex gap-4 text-sm">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-4 bg-blue-400" />
          Yr original
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-4 bg-emerald-600" />
          Weather-Boy
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-sm bg-blue-300/60" />
          Nedbør
        </span>
      </div>

      <div className="rounded-lg border border-stone-200 bg-white p-3">
        <svg
          viewBox={`-6 -10 ${chartWidth + 10} ${chartHeight + precipBarHeight + 45}`}
          className="w-full"
          preserveAspectRatio="xMidYMid meet"
          role="img"
          aria-label="Temperaturprognose med nedbør"
        >
          <title>Temperaturprognose 48 timer</title>

          {/* Frost zone shading below 0°C */}
          {minTemp < 0 && (
            <rect
              x={0}
              y={tempToY(0)}
              width={chartWidth}
              height={chartHeight - tempToY(0) + (chartHeight - tempToY(minTemp)) === 0 ? 0 : tempToY(minTemp) - tempToY(0)}
              fill="#fecaca"
              opacity={0.3}
            />
          )}

          {/* Y-axis grid + labels */}
          {yLabels.map((temp) => (
            <g key={temp}>
              <text
                x={-2}
                y={tempToY(temp) + 1}
                textAnchor="end"
                className="fill-stone-400"
                fontSize={2.5}
              >
                {temp}°
              </text>
              <line
                x1={0}
                y1={tempToY(temp)}
                x2={chartWidth}
                y2={tempToY(temp)}
                stroke={temp === 0 ? "#ef4444" : "#e7e5e4"}
                strokeWidth={temp === 0 ? 0.3 : 0.15}
                strokeDasharray={temp === 0 ? "1 1" : undefined}
              />
            </g>
          ))}

          {/* Date boundaries */}
          {dates.map((d) => (
            <g key={d.x}>
              <line
                x1={d.x}
                y1={0}
                x2={d.x}
                y2={chartHeight}
                stroke="#d6d3d1"
                strokeWidth={0.15}
                strokeDasharray="0.5 0.5"
              />
              <text
                x={d.x + 1}
                y={chartHeight + precipBarHeight + 12}
                className="fill-stone-500"
                fontSize={2.5}
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
                  x={xPos(i)}
                  y={chartHeight + precipBarHeight + 22}
                  textAnchor="middle"
                  className="fill-stone-400"
                  fontSize={2}
                >
                  {formatHour(c.valid_at)}
                </text>
              ),
          )}

          {/* Precipitation bars */}
          {corrections.map((c, i) => {
            const precip = c.precip ?? 0;
            if (precip <= 0) return null;
            const barH = (precip / maxPrecip) * precipBarHeight;
            return (
              <rect
                key={`precip-${i}`}
                x={xPos(i) - 0.6}
                y={chartHeight + precipBarHeight - barH}
                width={1.2}
                height={barH}
                fill="#93c5fd"
                opacity={0.6}
                rx={0.2}
              />
            );
          })}

          {/* Now marker */}
          {nowX !== null && (
            <g>
              <line
                x1={nowX}
                y1={0}
                x2={nowX}
                y2={chartHeight + precipBarHeight}
                stroke="#f97316"
                strokeWidth={0.3}
              />
              <text
                x={nowX}
                y={-3}
                textAnchor="middle"
                className="fill-orange-500"
                fontSize={2.2}
                fontWeight="bold"
              >
                nå
              </text>
            </g>
          )}

          {/* Yr line */}
          <polyline
            points={yrLine}
            fill="none"
            stroke="#60a5fa"
            strokeWidth={0.5}
            strokeLinejoin="round"
          />

          {/* Corrected line */}
          <polyline
            points={correctedLine}
            fill="none"
            stroke="#059669"
            strokeWidth={0.7}
            strokeLinejoin="round"
          />
        </svg>
      </div>

      {/* Hourly detail table */}
      <details className="mt-4">
        <summary className="cursor-pointer rounded-lg bg-stone-100 px-4 py-3 text-sm text-stone-600 hover:bg-stone-200 active:bg-stone-300">
          Vis timesverdier
        </summary>
        <div className="mt-2 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone-200 text-left text-stone-500">
                <th className="py-2 pr-3">Tid</th>
                <th className="py-2 pr-3">Yr</th>
                <th className="py-2 pr-3">Korr.</th>
                <th className="py-2 pr-3">Diff</th>
                <th className="py-2 pr-3">Nedbør</th>
                <th className="py-2 pr-3">Vind</th>
                <th className="py-2">Frost</th>
              </tr>
            </thead>
            <tbody>
              {corrections.map((c) => {
                const diff = c.temp_corrected - c.temp_original;
                return (
                  <tr key={c.valid_at} className="border-b border-stone-100">
                    <td className="py-1.5 pr-3 text-stone-600">
                      {formatHour(c.valid_at)}
                    </td>
                    <td className="py-1.5 pr-3">
                      {c.temp_original?.toFixed(1)}°
                    </td>
                    <td className="py-1.5 pr-3 font-medium">
                      {c.temp_corrected?.toFixed(1)}°
                    </td>
                    <td
                      className={`py-1.5 pr-3 ${diff < -0.1 ? "text-blue-600" : diff > 0.1 ? "text-red-600" : ""}`}
                    >
                      {diff > 0 ? "+" : ""}
                      {diff.toFixed(1)}°
                    </td>
                    <td className="py-1.5 pr-3 text-blue-600">
                      {(c.precip ?? 0) > 0
                        ? `${(c.precip ?? 0).toFixed(1)} mm`
                        : "—"}
                    </td>
                    <td className="py-1.5 pr-3">
                      {c.wind_speed_original?.toFixed(1)} m/s
                    </td>
                    <td className="py-1.5">
                      {c.frost_risk === "high" && (
                        <span className="text-red-600 font-medium" aria-label="Høy frostrisiko">Høy</span>
                      )}
                      {c.frost_risk === "medium" && (
                        <span className="text-amber-600" aria-label="Middels frostrisiko">Mid</span>
                      )}
                      {c.frost_risk === "low" && (
                        <span className="text-green-600" aria-label="Lav frostrisiko">Lav</span>
                      )}
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
