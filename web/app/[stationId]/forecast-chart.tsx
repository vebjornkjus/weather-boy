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

  const n = corrections.length;
  const padding = { left: 35, right: 10, top: 15, bottom: 55 };
  const precipH = 30;
  const chartH = 180;
  const chartW = n * 18;
  const totalW = chartW + padding.left + padding.right;
  const totalH = chartH + precipH + padding.top + padding.bottom;

  function tempToY(temp: number): number {
    return padding.top + chartH - ((temp - minTemp) / range) * chartH;
  }

  function xPos(i: number): number {
    return padding.left + (i / (n - 1)) * chartW;
  }

  // "Now" marker
  const now = Date.now();
  let nowX: number | null = null;
  for (let i = 0; i < n - 1; i++) {
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

  const maxPrecip = Math.max(...corrections.map((c) => c.precip ?? 0), 1);
  const precipTop = padding.top + chartH + 5;

  // Y-axis labels
  const yLabels: number[] = [];
  const step = range > 15 ? 3 : range > 8 ? 2 : 1;
  for (let t = minTemp; t <= maxTemp; t += step) yLabels.push(t);

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

  return (
    <div>
      <h2 className="mb-3 text-lg font-semibold">Prognose 48 timer</h2>

      <div className="mb-2 flex gap-4 text-sm">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-4 bg-blue-400" />
          Yr
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-4 bg-emerald-600" />
          Weather-Boy
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-sm bg-blue-300" />
          Nedbør
        </span>
      </div>

      <div className="overflow-x-auto rounded-lg border border-stone-200 bg-white">
        <svg
          width={totalW}
          height={totalH}
          role="img"
          aria-label="Temperaturprognose med nedbør"
        >
          {/* Frost zone */}
          {minTemp < 0 && maxTemp >= 0 && (
            <rect
              x={padding.left}
              y={tempToY(0)}
              width={chartW}
              height={tempToY(minTemp) - tempToY(0)}
              fill="#fecaca"
              opacity={0.25}
            />
          )}

          {/* Y grid + labels */}
          {yLabels.map((temp) => (
            <g key={temp}>
              <text
                x={padding.left - 6}
                y={tempToY(temp) + 4}
                textAnchor="end"
                fill="#a8a29e"
                fontSize={11}
              >
                {temp}°
              </text>
              <line
                x1={padding.left}
                y1={tempToY(temp)}
                x2={padding.left + chartW}
                y2={tempToY(temp)}
                stroke={temp === 0 ? "#ef4444" : "#e7e5e4"}
                strokeWidth={temp === 0 ? 1 : 0.5}
                strokeDasharray={temp === 0 ? "4 3" : undefined}
              />
            </g>
          ))}

          {/* Date boundaries + labels */}
          {dates.map((d, di) => (
            <g key={di}>
              <line
                x1={d.x}
                y1={padding.top}
                x2={d.x}
                y2={precipTop + precipH}
                stroke="#d6d3d1"
                strokeWidth={0.5}
                strokeDasharray="3 3"
              />
              <text
                x={d.x + 3}
                y={precipTop + precipH + 14}
                fill="#78716c"
                fontSize={11}
                fontWeight={500}
              >
                {d.label}
              </text>
            </g>
          ))}

          {/* Hour labels — every 3rd hour */}
          {corrections.map((c, i) =>
            i % 3 === 0 ? (
              <text
                key={i}
                x={xPos(i)}
                y={precipTop + precipH + 30}
                textAnchor="middle"
                fill="#a8a29e"
                fontSize={10}
              >
                {formatHour(c.valid_at)}
              </text>
            ) : null,
          )}

          {/* Precip bars */}
          {corrections.map((c, i) => {
            const precip = c.precip ?? 0;
            if (precip <= 0) return null;
            const barH = (precip / maxPrecip) * precipH;
            return (
              <rect
                key={`p-${i}`}
                x={xPos(i) - 4}
                y={precipTop + precipH - barH}
                width={8}
                height={barH}
                fill="#93c5fd"
                opacity={0.7}
                rx={2}
              />
            );
          })}

          {/* Now marker */}
          {nowX !== null && (
            <g>
              <line
                x1={nowX}
                y1={padding.top}
                x2={nowX}
                y2={precipTop + precipH}
                stroke="#f97316"
                strokeWidth={1.5}
              />
              <text
                x={nowX}
                y={padding.top - 4}
                textAnchor="middle"
                fill="#f97316"
                fontSize={11}
                fontWeight={600}
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
                        <span className="font-medium text-red-600" aria-label="Høy frostrisiko">Høy</span>
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
