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

type CardStatus = "danger" | "warning" | "safe" | "info";

function cardClass(status: CardStatus): string {
  const map: Record<CardStatus, string> = {
    danger: "glass-card-danger",
    warning: "glass-card-warning",
    safe: "glass-card-safe",
    info: "glass-card-info",
  };
  return `${map[status]} rounded-2xl p-5`;
}

function statusDot(status: CardStatus): string {
  const map: Record<CardStatus, string> = {
    danger: "bg-red-500",
    warning: "bg-amber-400",
    safe: "bg-emerald-500",
    info: "bg-sky-400",
  };
  return map[status];
}

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

  const status: CardStatus =
    worstRisk === "high" ? "danger" : worstRisk === "medium" ? "warning" : "safe";

  const labels = {
    high: "Frostfare!",
    medium: "Mulig frost",
    low: "Trygt for frost",
  };

  return (
    <article className={cardClass(status)} aria-label={labels[worstRisk]}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2.5">
          <span className={`h-2.5 w-2.5 rounded-full ${statusDot(status)}`} />
          <span className="text-sm font-semibold text-slate-700">
            {labels[worstRisk]}
          </span>
        </div>
        <span className="text-xl" aria-hidden="true">
          {worstRisk === "low" ? "🌿" : "❄️"}
        </span>
      </div>
      <div className="flex items-end gap-1">
        <span className="font-[family-name:var(--font-display)] text-2xl text-slate-700">
          {minEntry.temp_corrected.toFixed(1)}°
        </span>
        <span className="text-xs text-slate-400 mb-1">
          lavest · kl. {formatHour(minEntry.valid_at)}
        </span>
      </div>
    </article>
  );
}

function PrecipCard({ corrections }: Props) {
  const next12h = corrections.slice(0, 12);
  const totalPrecip = next12h.reduce((sum, c) => sum + (c.precip ?? 0), 0);
  const hasRain = totalPrecip > 0.5;
  const firstRain = next12h.find((c) => (c.precip ?? 0) > 0.1);

  const status: CardStatus = hasRain ? "info" : "safe";

  return (
    <article className={cardClass(status)} aria-label="Nedbør">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2.5">
          <span className={`h-2.5 w-2.5 rounded-full ${statusDot(status)}`} />
          <span className="text-sm font-semibold text-slate-700">
            {hasRain ? "Nedbør" : "Oppholdsvær"}
          </span>
        </div>
        <span className="text-xl" aria-hidden="true">
          {hasRain ? "🌧" : "☀️"}
        </span>
      </div>
      {hasRain ? (
        <div className="flex items-end gap-1">
          <span className="font-[family-name:var(--font-display)] text-2xl text-slate-700">
            {totalPrecip.toFixed(1)}
          </span>
          <span className="text-xs text-slate-400 mb-1">
            mm · {firstRain ? `fra kl. ${formatHour(firstRain.valid_at)}` : "neste 12t"}
          </span>
        </div>
      ) : (
        <p className="text-xs text-slate-400">Tørt de neste 12 timene</p>
      )}
    </article>
  );
}

function MowingCard({ corrections }: Props) {
  const window = findTimeWindow(corrections, (c) => c.mowing_ok, 12);
  const anyOk = corrections.slice(0, 12).some((c) => c.mowing_ok);

  const status: CardStatus = window ? "safe" : anyOk ? "warning" : "danger";

  return (
    <article className={cardClass(status)} aria-label="Slått">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2.5">
          <span className={`h-2.5 w-2.5 rounded-full ${statusDot(status)}`} />
          <span className="text-sm font-semibold text-slate-700">
            {window ? "Slått OK" : anyOk ? "Delvis OK" : "Ikke slått"}
          </span>
        </div>
        <span className="text-xl" aria-hidden="true">🌾</span>
      </div>
      <p className="text-xs text-slate-400">
        {window ? `Vindu: ${window}` : anyOk ? "Spredte vinduer" : "For vått eller kaldt"}
      </p>
    </article>
  );
}

function SprayingCard({ corrections }: Props) {
  const window = findTimeWindow(corrections, (c) => c.spraying_ok, 12);
  const anyOk = corrections.slice(0, 12).some((c) => c.spraying_ok);

  const status: CardStatus = window ? "safe" : anyOk ? "warning" : "danger";

  return (
    <article className={cardClass(status)} aria-label="Sprøyting">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2.5">
          <span className={`h-2.5 w-2.5 rounded-full ${statusDot(status)}`} />
          <span className="text-sm font-semibold text-slate-700">
            {window ? "Sprøyting OK" : anyOk ? "Delvis vindu" : "Ikke sprøyt"}
          </span>
        </div>
        <span className="text-xl" aria-hidden="true">💧</span>
      </div>
      <p className="text-xs text-slate-400">
        {window ? `Vindu: ${window}` : anyOk ? "Korte vinduer" : "Vind, nedbør eller temp"}
      </p>
    </article>
  );
}

function DryingCard({ corrections }: Props) {
  const next6h = corrections.slice(0, 6);
  const avgScore =
    next6h.reduce((sum, c) => sum + c.drying_score, 0) / next6h.length;

  const status: CardStatus = avgScore > 0.6 ? "safe" : avgScore > 0.3 ? "warning" : "danger";
  const label = avgScore > 0.6 ? "Gode tørkeforhold" : avgScore > 0.3 ? "Middels" : "Dårlig tørk";
  const pct = Math.round(avgScore * 100);

  return (
    <article className={cardClass(status)} aria-label={label}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2.5">
          <span className={`h-2.5 w-2.5 rounded-full ${statusDot(status)}`} />
          <span className="text-sm font-semibold text-slate-700">{label}</span>
        </div>
        <span className="text-xl" aria-hidden="true">
          {avgScore > 0.6 ? "☀️" : avgScore > 0.3 ? "🌤" : "☁️"}
        </span>
      </div>
      {/* Progress bar */}
      <div className="mt-1 h-1.5 rounded-full bg-white/50 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${avgScore > 0.6 ? "bg-emerald-400" : avgScore > 0.3 ? "bg-amber-400" : "bg-red-300"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="mt-1.5 text-[11px] text-slate-400">{pct}% tørkescore</p>
    </article>
  );
}

function WindCard({ corrections }: Props) {
  const next6h = corrections.slice(0, 6);
  const maxWind = Math.max(...next6h.map((c) => c.wind_speed_original));
  const avgWind =
    next6h.reduce((sum, c) => sum + c.wind_speed_original, 0) / next6h.length;

  return (
    <article className="glass-card rounded-2xl p-5" aria-label="Vind">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2.5">
          <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
          <span className="text-sm font-semibold text-slate-700">Vind</span>
        </div>
        <span className="text-xl" aria-hidden="true">💨</span>
      </div>
      <div className="flex items-end gap-1">
        <span className="font-[family-name:var(--font-display)] text-2xl text-slate-700">
          {avgWind.toFixed(1)}
        </span>
        <span className="text-xs text-slate-400 mb-1">
          m/s snitt · maks {maxWind.toFixed(1)}
        </span>
      </div>
    </article>
  );
}

function getSeasonCards(season: Season): ((props: Props) => React.ReactNode)[] {
  switch (season) {
    case "spring":
      return [FrostCard, PrecipCard, SprayingCard, WindCard];
    case "summer":
      return [PrecipCard, MowingCard, DryingCard, SprayingCard];
    case "autumn":
      return [PrecipCard, FrostCard, DryingCard, WindCard];
    case "winter":
      return [FrostCard, PrecipCard, WindCard, DryingCard];
  }
}

export function DecisionCards({ corrections }: Props) {
  if (corrections.length === 0) return null;

  const season = getSeason();
  const cards = getSeasonCards(season);

  const seasonLabels: Record<Season, string> = {
    spring: "vår",
    summer: "sommer",
    autumn: "høst",
    winter: "vinter",
  };

  return (
    <div className="mb-8">
      <div className="flex items-center gap-2 mb-3">
        <h2 className="text-xs font-medium tracking-widest uppercase text-slate-400">
          Beslutninger
        </h2>
        <span className="text-[10px] text-slate-300">
          · {seasonLabels[season]}
        </span>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {cards.map((Card, i) => (
          <div key={i} className="animate-card-enter" style={{ animationDelay: `${i * 80}ms` }}>
            <Card corrections={corrections} />
          </div>
        ))}
      </div>
    </div>
  );
}
