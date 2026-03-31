"use client";

import type { Correction } from "@/lib/supabase";

type Props = {
  corrections: Correction[];
};

function getNextHours(corrections: Correction[], hours: number): Correction[] {
  return corrections.slice(0, hours);
}

function FrostCard({ corrections }: Props) {
  const next12h = getNextHours(corrections, 12);
  const worstRisk = next12h.some((c) => c.frost_risk === "high")
    ? "high"
    : next12h.some((c) => c.frost_risk === "medium")
      ? "medium"
      : "low";

  const minTemp = Math.min(...next12h.map((c) => c.temp_corrected));

  const config = {
    high: {
      bg: "bg-red-50 border-red-200",
      dot: "bg-red-500",
      label: "Frostfare!",
      text: "text-red-800",
    },
    medium: {
      bg: "bg-amber-50 border-amber-200",
      dot: "bg-amber-500",
      label: "Mulig frost",
      text: "text-amber-800",
    },
    low: {
      bg: "bg-green-50 border-green-200",
      dot: "bg-green-500",
      label: "Ingen frostfare",
      text: "text-green-800",
    },
  }[worstRisk];

  return (
    <div className={`rounded-lg border p-4 ${config.bg}`}>
      <div className="flex items-center gap-2">
        <span className={`h-3 w-3 rounded-full ${config.dot}`} />
        <span className={`font-semibold ${config.text}`}>{config.label}</span>
      </div>
      <p className="mt-1 text-sm text-stone-600">
        Laveste temp neste 12t: {minTemp.toFixed(1)}°C (korrigert)
      </p>
    </div>
  );
}

function MowingCard({ corrections }: Props) {
  const next6h = getNextHours(corrections, 6);
  const allOk = next6h.every((c) => c.mowing_ok);
  const someOk = next6h.some((c) => c.mowing_ok);

  const status = allOk ? "good" : someOk ? "partial" : "bad";
  const config = {
    good: {
      bg: "bg-green-50 border-green-200",
      dot: "bg-green-500",
      label: "Slått OK",
      desc: "Gode forhold de neste 6 timene",
    },
    partial: {
      bg: "bg-amber-50 border-amber-200",
      dot: "bg-amber-500",
      label: "Delvis OK for slått",
      desc: "Noen timer med gode forhold",
    },
    bad: {
      bg: "bg-red-50 border-red-200",
      dot: "bg-red-500",
      label: "Ikke slått nå",
      desc: "For vått, kaldt eller vindstille",
    },
  }[status];

  return (
    <div className={`rounded-lg border p-4 ${config.bg}`}>
      <div className="flex items-center gap-2">
        <span className={`h-3 w-3 rounded-full ${config.dot}`} />
        <span className="font-semibold text-stone-800">{config.label}</span>
      </div>
      <p className="mt-1 text-sm text-stone-600">{config.desc}</p>
    </div>
  );
}

function SprayingCard({ corrections }: Props) {
  const next6h = getNextHours(corrections, 6);
  const allOk = next6h.every((c) => c.spraying_ok);
  const someOk = next6h.some((c) => c.spraying_ok);

  const status = allOk ? "good" : someOk ? "partial" : "bad";
  const config = {
    good: {
      bg: "bg-green-50 border-green-200",
      dot: "bg-green-500",
      label: "Sprøyting OK",
      desc: "Lav vind, ingen nedbør",
    },
    partial: {
      bg: "bg-amber-50 border-amber-200",
      dot: "bg-amber-500",
      label: "Delvis sprøytevindu",
      desc: "Sjekk timesvisning",
    },
    bad: {
      bg: "bg-red-50 border-red-200",
      dot: "bg-red-500",
      label: "Ikke sprøyting",
      desc: "For mye vind eller nedbør",
    },
  }[status];

  return (
    <div className={`rounded-lg border p-4 ${config.bg}`}>
      <div className="flex items-center gap-2">
        <span className={`h-3 w-3 rounded-full ${config.dot}`} />
        <span className="font-semibold text-stone-800">{config.label}</span>
      </div>
      <p className="mt-1 text-sm text-stone-600">{config.desc}</p>
    </div>
  );
}

function DryingCard({ corrections }: Props) {
  const next6h = getNextHours(corrections, 6);
  const avgScore =
    next6h.reduce((sum, c) => sum + c.drying_score, 0) / next6h.length;

  const status = avgScore > 0.6 ? "good" : avgScore > 0.3 ? "partial" : "bad";
  const config = {
    good: {
      bg: "bg-green-50 border-green-200",
      dot: "bg-green-500",
      label: "Gode tørkeforhold",
    },
    partial: {
      bg: "bg-amber-50 border-amber-200",
      dot: "bg-amber-500",
      label: "Middels tørkeforhold",
    },
    bad: {
      bg: "bg-red-50 border-red-200",
      dot: "bg-red-500",
      label: "Dårlige tørkeforhold",
    },
  }[status];

  return (
    <div className={`rounded-lg border p-4 ${config.bg}`}>
      <div className="flex items-center gap-2">
        <span className={`h-3 w-3 rounded-full ${config.dot}`} />
        <span className="font-semibold text-stone-800">{config.label}</span>
      </div>
      <p className="mt-1 text-sm text-stone-600">
        Tørkescore: {(avgScore * 100).toFixed(0)}%
      </p>
    </div>
  );
}

export function DecisionCards({ corrections }: Props) {
  return (
    <div className="mb-6 grid gap-3 sm:grid-cols-2">
      <FrostCard corrections={corrections} />
      <MowingCard corrections={corrections} />
      <SprayingCard corrections={corrections} />
      <DryingCard corrections={corrections} />
    </div>
  );
}
