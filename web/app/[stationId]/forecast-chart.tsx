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
  const pad = { left: 36, right: 12, top: 20, bottom: 56 };
  const precipH = 32;
  const chartH = 190;
  const chartW = n * 18;
  const totalW = chartW + pad.left + pad.right;
  const totalH = chartH + precipH + pad.top + pad.bottom;

  function tempToY(temp: number): number {
    return pad.top + chartH - ((temp - minTemp) / range) * chartH;
  }

  function xPos(i: number): number {
    return pad.left + (i / (n - 1)) * chartW;
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

  // Smooth path (catmull-rom approximation via cubic bezier)
  function smoothPath(points: [number, number][]): string {
    if (points.length < 2) return "";
    let d = `M${points[0][0]},${points[0][1]}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[Math.max(i - 1, 0)];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = points[Math.min(i + 2, points.length - 1)];
      const cp1x = p1[0] + (p2[0] - p0[0]) / 6;
      const cp1y = p1[1] + (p2[1] - p0[1]) / 6;
      const cp2x = p2[0] - (p3[0] - p1[0]) / 6;
      const cp2y = p2[1] - (p3[1] - p1[1]) / 6;
      d += ` C${cp1x},${cp1y} ${cp2x},${cp2y} ${p2[0]},${p2[1]}`;
    }
    return d;
  }

  const yrPoints: [number, number][] = corrections.map((c, i) => [
    xPos(i),
    tempToY(c.temp_original),
  ]);
  const corrPoints: [number, number][] = corrections.map((c, i) => [
    xPos(i),
    tempToY(c.temp_corrected),
  ]);

  const yrPath = smoothPath(yrPoints);
  const corrPath = smoothPath(corrPoints);

  // Fill under corrected line
  const corrFill =
    corrPath +
    ` L${xPos(n - 1)},${pad.top + chartH} L${xPos(0)},${pad.top + chartH} Z`;

  const maxPrecip = Math.max(...corrections.map((c) => c.precip ?? 0), 1);
  const precipTop = pad.top + chartH + 6;

  // Y labels
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
    <div className="animate-card-enter" style={{ animationDelay: "300ms" }}>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs font-medium tracking-widest uppercase text-slate-400">
          48-timers prognose
        </h2>
        <div className="flex gap-4 text-[11px] text-slate-400">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-[3px] w-3 rounded-full bg-sky-300" />
            Yr
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-[3px] w-3 rounded-full bg-emerald-500" />
            Korrigert
          </span>
        </div>
      </div>

      <div className="overflow-x-auto glass-card rounded-2xl p-1">
        <svg width={totalW} height={totalH} role="img" aria-label="Temperaturprognose">
          <defs>
            <linearGradient id="corrFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#059669" stopOpacity="0.12" />
              <stop offset="100%" stopColor="#059669" stopOpacity="0.01" />
            </linearGradient>
            <linearGradient id="frostZone" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#bfdbfe" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#93c5fd" stopOpacity="0.25" />
            </linearGradient>
          </defs>

          {/* Frost zone below 0°C */}
          {minTemp < 0 && maxTemp >= 0 && (
            <rect
              x={pad.left}
              y={tempToY(0)}
              width={chartW}
              height={tempToY(minTemp) - tempToY(0)}
              fill="url(#frostZone)"
            />
          )}

          {/* Y grid */}
          {yLabels.map((temp) => (
            <g key={temp}>
              <text
                x={pad.left - 7}
                y={tempToY(temp) + 4}
                textAnchor="end"
                fill="#94a3b8"
                fontSize={10}
                fontFamily="var(--font-body)"
              >
                {temp}°
              </text>
              <line
                x1={pad.left}
                y1={tempToY(temp)}
                x2={pad.left + chartW}
                y2={tempToY(temp)}
                stroke={temp === 0 ? "#e2786a" : "#e2e8f0"}
                strokeWidth={temp === 0 ? 1 : 0.5}
                strokeDasharray={temp === 0 ? "5 3" : undefined}
                opacity={temp === 0 ? 0.6 : 0.5}
              />
            </g>
          ))}

          {/* Date boundaries */}
          {dates.map((d, di) => (
            <g key={di}>
              <line
                x1={d.x}
                y1={pad.top}
                x2={d.x}
                y2={precipTop + precipH}
                stroke="#cbd5e1"
                strokeWidth={0.5}
                strokeDasharray="3 4"
                opacity={0.5}
              />
              <text
                x={d.x + 4}
                y={precipTop + precipH + 14}
                fill="#64748b"
                fontSize={11}
                fontWeight={500}
                fontFamily="var(--font-body)"
              >
                {d.label}
              </text>
            </g>
          ))}

          {/* Hour labels */}
          {corrections.map((c, i) =>
            i % 3 === 0 ? (
              <text
                key={i}
                x={xPos(i)}
                y={precipTop + precipH + 30}
                textAnchor="middle"
                fill="#94a3b8"
                fontSize={10}
                fontFamily="var(--font-body)"
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
                fill="#7dd3fc"
                opacity={0.6}
                rx={3}
              />
            );
          })}

          {/* Now marker */}
          {nowX !== null && (
            <g>
              <line
                x1={nowX}
                y1={pad.top}
                x2={nowX}
                y2={precipTop + precipH}
                stroke="#f97316"
                strokeWidth={1.5}
                opacity={0.7}
              />
              <circle cx={nowX} cy={pad.top - 2} r={3} fill="#f97316" opacity={0.8} />
              <text
                x={nowX}
                y={pad.top - 10}
                textAnchor="middle"
                fill="#f97316"
                fontSize={10}
                fontWeight={600}
                fontFamily="var(--font-body)"
              >
                nå
              </text>
            </g>
          )}

          {/* Fill under corrected line */}
          <path d={corrFill} fill="url(#corrFill)" />

          {/* Yr line */}
          <path
            d={yrPath}
            fill="none"
            stroke="#7dd3fc"
            strokeWidth={1.5}
            opacity={0.7}
          />

          {/* Corrected line */}
          <path
            d={corrPath}
            fill="none"
            stroke="#059669"
            strokeWidth={2.5}
            strokeLinecap="round"
          />
        </svg>
      </div>

      {/* Hourly table */}
      <details className="mt-4">
        <summary className="cursor-pointer glass-card rounded-xl px-4 py-3 text-sm text-slate-500 hover:text-slate-700 transition">
          Vis timesverdier
        </summary>
        <div className="mt-2 glass-card rounded-xl overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200/50 text-left text-[11px] tracking-wider uppercase text-slate-400">
                <th className="py-3 px-4">Tid</th>
                <th className="py-3 px-2">Yr</th>
                <th className="py-3 px-2">Korr.</th>
                <th className="py-3 px-2">Diff</th>
                <th className="py-3 px-2">Nedbør</th>
                <th className="py-3 px-2">Vind</th>
                <th className="py-3 px-2">Frost</th>
              </tr>
            </thead>
            <tbody>
              {corrections.map((c, i) => {
                const diff = c.temp_corrected - c.temp_original;
                const isEven = i % 2 === 0;
                return (
                  <tr
                    key={c.valid_at}
                    className={`border-b border-slate-100/30 ${isEven ? "bg-white/20" : ""}`}
                  >
                    <td className="py-2 px-4 text-slate-500 font-medium">
                      {formatHour(c.valid_at)}
                    </td>
                    <td className="py-2 px-2 text-slate-400">
                      {c.temp_original?.toFixed(1)}°
                    </td>
                    <td className="py-2 px-2 font-semibold text-slate-700">
                      {c.temp_corrected?.toFixed(1)}°
                    </td>
                    <td
                      className={`py-2 px-2 text-xs ${
                        diff < -0.1
                          ? "text-sky-500"
                          : diff > 0.1
                            ? "text-rose-400"
                            : "text-slate-300"
                      }`}
                    >
                      {diff > 0 ? "+" : ""}
                      {diff.toFixed(1)}°
                    </td>
                    <td className="py-2 px-2 text-sky-400">
                      {(c.precip ?? 0) > 0
                        ? `${(c.precip ?? 0).toFixed(1)}`
                        : "—"}
                    </td>
                    <td className="py-2 px-2 text-slate-400">
                      {c.wind_speed_original?.toFixed(1)}
                    </td>
                    <td className="py-2 px-2">
                      {c.frost_risk === "high" && (
                        <span className="inline-block h-2 w-2 rounded-full bg-red-400" aria-label="Høy" />
                      )}
                      {c.frost_risk === "medium" && (
                        <span className="inline-block h-2 w-2 rounded-full bg-amber-400" aria-label="Middels" />
                      )}
                      {c.frost_risk === "low" && (
                        <span className="inline-block h-2 w-2 rounded-full bg-emerald-400" aria-label="Lav" />
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
