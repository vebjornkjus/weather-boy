import type { Correction, Season } from "@/lib/supabase";
import { getSeason } from "@/lib/supabase";

type Props = {
  corrections: Correction[];
};

function formatHour(iso: string): string {
  return new Date(iso).toLocaleTimeString("nb-NO", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function findTimeWindow(
  corrections: Correction[],
  check: (c: Correction) => boolean,
  maxHours: number,
): string | null {
  const subset = corrections.slice(0, maxHours);
  let start: string | null = null;
  let end: string | null = null;

  for (const c of subset) {
    if (check(c)) {
      if (!start) start = c.valid_at;
      end = c.valid_at;
    } else if (start) {
      break;
    }
  }

  if (!start || !end) return null;
  return `${formatHour(start)}–${formatHour(end)}`;
}

// --- Card components ---

function FrostCard({ corrections }: Props) {
  const next12h = corrections.slice(0, 12);
  const worstRisk = next12h.some((c) => c.frost_risk === "high")
    ? "high"
    : next12h.some((c) => c.frost_risk === "medium")
      ? "medium"
      : "low";

  const minEntry = next12h.reduce(
    (min, c) => (c.temp_corrected < min.temp_corrected ? c : min),
    next12h[0],
  );

  const config = {
    high: {
      bg: "bg-red-50 border-red-200",
      icon: "❄️",
      label: "Frostfare!",
      labelColor: "text-red-800",
    },
    medium: {
      bg: "bg-amber-50 border-amber-200",
      icon: "🌡️",
      label: "Mulig frost",
      labelColor: "text-amber-800",
    },
    low: {
      bg: "bg-green-50 border-green-200",
      icon: "✓",
      label: "Ingen frostfare",
      labelColor: "text-green-800",
    },
  }[worstRisk];

  return (
    <article className={`rounded-lg border p-4 ${config.bg}`} aria-label={config.label}>
      <div className="flex items-center gap-2">
        <span className="text-xl" aria-hidden="true">{config.icon}</span>
        <span className={`font-semibold ${config.labelColor}`}>{config.label}</span>
      </div>
      <p className="mt-1 text-sm text-stone-600">
        Laveste: {minEntry.temp_corrected.toFixed(1)}°C kl.{" "}
        {formatHour(minEntry.valid_at)}
      </p>
    </article>
  );
}

function PrecipCard({ corrections }: Props) {
  const next12h = corrections.slice(0, 12);
  const totalPrecip = next12h.reduce((sum, c) => sum + (c.precip ?? 0), 0);
  const hasRain = totalPrecip > 0.5;
  const firstRain = next12h.find((c) => (c.precip ?? 0) > 0.1);

  const config = hasRain
    ? {
        bg: "bg-blue-50 border-blue-200",
        icon: "🌧️",
        label: `${totalPrecip.toFixed(1)} mm neste 12t`,
        labelColor: "text-blue-800",
      }
    : {
        bg: "bg-green-50 border-green-200",
        icon: "☀️",
        label: "Oppholdsvær",
        labelColor: "text-green-800",
      };

  return (
    <article className={`rounded-lg border p-4 ${config.bg}`} aria-label={config.label}>
      <div className="flex items-center gap-2">
        <span className="text-xl" aria-hidden="true">{config.icon}</span>
        <span className={`font-semibold ${config.labelColor}`}>{config.label}</span>
      </div>
      <p className="mt-1 text-sm text-stone-600">
        {hasRain && firstRain
          ? `Nedbør fra kl. ${formatHour(firstRain.valid_at)}`
          : "Tørt de neste 12 timene"}
      </p>
    </article>
  );
}

function MowingCard({ corrections }: Props) {
  const window = findTimeWindow(corrections, (c) => c.mowing_ok, 12);
  const anyOk = corrections.slice(0, 12).some((c) => c.mowing_ok);

  const config = window
    ? {
        bg: "bg-green-50 border-green-200",
        icon: "🌾",
        label: "Slått OK",
        labelColor: "text-green-800",
        desc: `Vindu: ${window}`,
      }
    : anyOk
      ? {
          bg: "bg-amber-50 border-amber-200",
          icon: "🌾",
          label: "Delvis OK for slått",
          labelColor: "text-amber-800",
          desc: "Spredte vinduer — sjekk timesvisning",
        }
      : {
          bg: "bg-red-50 border-red-200",
          icon: "🌾",
          label: "Ikke slått nå",
          labelColor: "text-red-800",
          desc: "For vått eller kaldt",
        };

  return (
    <article className={`rounded-lg border p-4 ${config.bg}`} aria-label={config.label}>
      <div className="flex items-center gap-2">
        <span className="text-xl" aria-hidden="true">{config.icon}</span>
        <span className={`font-semibold ${config.labelColor}`}>{config.label}</span>
      </div>
      <p className="mt-1 text-sm text-stone-600">{config.desc}</p>
    </article>
  );
}

function SprayingCard({ corrections }: Props) {
  const window = findTimeWindow(corrections, (c) => c.spraying_ok, 12);
  const anyOk = corrections.slice(0, 12).some((c) => c.spraying_ok);

  const config = window
    ? {
        bg: "bg-green-50 border-green-200",
        icon: "💧",
        label: "Sprøyting OK",
        labelColor: "text-green-800",
        desc: `Vindu: ${window}`,
      }
    : anyOk
      ? {
          bg: "bg-amber-50 border-amber-200",
          icon: "💧",
          label: "Delvis sprøytevindu",
          labelColor: "text-amber-800",
          desc: "Korte vinduer — sjekk timesvisning",
        }
      : {
          bg: "bg-red-50 border-red-200",
          icon: "💧",
          label: "Ikke sprøyting",
          labelColor: "text-red-800",
          desc: "For mye vind, nedbør eller feil temperatur",
        };

  return (
    <article className={`rounded-lg border p-4 ${config.bg}`} aria-label={config.label}>
      <div className="flex items-center gap-2">
        <span className="text-xl" aria-hidden="true">{config.icon}</span>
        <span className={`font-semibold ${config.labelColor}`}>{config.label}</span>
      </div>
      <p className="mt-1 text-sm text-stone-600">{config.desc}</p>
    </article>
  );
}

function DryingCard({ corrections }: Props) {
  const next6h = corrections.slice(0, 6);
  const avgScore =
    next6h.reduce((sum, c) => sum + c.drying_score, 0) / next6h.length;

  const config =
    avgScore > 0.6
      ? {
          bg: "bg-green-50 border-green-200",
          icon: "☀️",
          label: "Gode tørkeforhold",
          labelColor: "text-green-800",
        }
      : avgScore > 0.3
        ? {
            bg: "bg-amber-50 border-amber-200",
            icon: "🌤️",
            label: "Middels tørkeforhold",
            labelColor: "text-amber-800",
          }
        : {
            bg: "bg-red-50 border-red-200",
            icon: "☁️",
            label: "Dårlige tørkeforhold",
            labelColor: "text-red-800",
          };

  return (
    <article className={`rounded-lg border p-4 ${config.bg}`} aria-label={config.label}>
      <div className="flex items-center gap-2">
        <span className="text-xl" aria-hidden="true">{config.icon}</span>
        <span className={`font-semibold ${config.labelColor}`}>{config.label}</span>
      </div>
      <p className="mt-1 text-sm text-stone-600">
        Tørkescore: {(avgScore * 100).toFixed(0)}%
      </p>
    </article>
  );
}

function WindCard({ corrections }: Props) {
  const next6h = corrections.slice(0, 6);
  const maxWind = Math.max(...next6h.map((c) => c.wind_speed_original));
  const avgWind =
    next6h.reduce((sum, c) => sum + c.wind_speed_original, 0) / next6h.length;

  return (
    <article className="rounded-lg border border-stone-200 bg-white p-4" aria-label="Vind">
      <div className="flex items-center gap-2">
        <span className="text-xl" aria-hidden="true">💨</span>
        <span className="font-semibold text-stone-800">Vind</span>
      </div>
      <p className="mt-1 text-sm text-stone-600">
        Snitt: {avgWind.toFixed(1)} m/s · Maks: {maxWind.toFixed(1)} m/s
      </p>
    </article>
  );
}

// --- Season-based card selection ---

function getSeasonCards(season: Season): ((props: Props) => React.ReactNode)[] {
  switch (season) {
    case "spring":
      // Frost critical for new growth, spraying starts, wind matters
      return [FrostCard, PrecipCard, SprayingCard, WindCard];
    case "summer":
      // Mowing/drying season, spraying, precipitation
      return [PrecipCard, MowingCard, DryingCard, SprayingCard];
    case "autumn":
      // Harvest, precipitation critical, frost returns
      return [PrecipCard, FrostCard, DryingCard, WindCard];
    case "winter":
      // Frost monitoring, precipitation (snow), wind
      return [FrostCard, PrecipCard, WindCard, DryingCard];
  }
}

export function DecisionCards({ corrections }: Props) {
  if (corrections.length === 0) return null;

  const season = getSeason();
  const cards = getSeasonCards(season);

  const seasonLabels: Record<Season, string> = {
    spring: "Vår",
    summer: "Sommer",
    autumn: "Høst",
    winter: "Vinter",
  };

  return (
    <div className="mb-6">
      <p className="mb-2 text-xs text-stone-400">
        Sesong: {seasonLabels[season]} — kort tilpasset
      </p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
        {cards.map((Card, i) => (
          <Card key={i} corrections={corrections} />
        ))}
      </div>
    </div>
  );
}
