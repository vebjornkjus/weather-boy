import Link from "next/link";
import { supabase, type Station, type Correction } from "@/lib/supabase";
import { DecisionCards } from "./decision-cards";
import { ForecastChart } from "./forecast-chart";
import { FavoriteButton } from "./favorite-button";

export const revalidate = 900;

type Props = {
  params: Promise<{ stationId: string }>;
};

async function getStation(id: string): Promise<Station | null> {
  if (!supabase) return null;
  const { data } = await supabase
    .from("stations")
    .select("*")
    .eq("id", id)
    .single();
  return data;
}

async function getCorrections(stationId: string): Promise<Correction[]> {
  if (!supabase) return [];
  const { data } = await supabase
    .from("corrections")
    .select("*")
    .eq("station_id", stationId)
    .gte("valid_at", new Date().toISOString())
    .order("valid_at")
    .limit(48);
  return data ?? [];
}

export default async function StationPage({ params }: Props) {
  const { stationId } = await params;
  const [station, corrections] = await Promise.all([
    getStation(stationId),
    getCorrections(stationId),
  ]);

  if (!station) {
    return (
      <div className="py-16 text-center">
        <p className="font-[family-name:var(--font-display)] text-xl text-slate-600">
          Stasjon ikke funnet
        </p>
        <Link
          href="/"
          className="mt-4 inline-block rounded-full bg-white/60 backdrop-blur px-5 py-2.5 text-sm text-slate-600 hover:bg-white/80 transition"
        >
          ← Tilbake
        </Link>
      </div>
    );
  }

  const lastUpdated = corrections.length > 0 ? corrections[0].created_at : null;
  const currentTemp =
    corrections.length > 0 ? corrections[0].temp_corrected : null;

  return (
    <div>
      <Link
        href="/"
        className="mb-5 inline-flex items-center gap-1 rounded-full bg-white/50 backdrop-blur px-4 py-2 text-sm text-slate-500 hover:bg-white/70 hover:text-slate-700 transition active:scale-95"
      >
        ← Alle stasjoner
      </Link>

      {/* Station hero */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-2xl text-slate-700 mb-0.5">
            {station.name}
          </h1>
          <p className="text-xs tracking-wide text-slate-400">
            {station.region} · {station.elevation} moh.
          </p>

          {currentTemp !== null && (
            <div className="mt-3 flex items-end gap-1">
              <span className="font-[family-name:var(--font-display)] text-5xl leading-none text-slate-700">
                {currentTemp.toFixed(0)}
              </span>
              <span className="text-2xl text-slate-400 mb-1">°C</span>
            </div>
          )}

          {lastUpdated && (
            <div className="mt-2 flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-soft-pulse" />
              <span className="text-[11px] text-slate-400">
                Oppdatert{" "}
                {new Date(lastUpdated).toLocaleTimeString("nb-NO", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
          )}
        </div>
        <FavoriteButton stationId={station.id} />
      </div>

      {corrections.length === 0 ? (
        <div className="glass-card rounded-2xl p-8 text-center">
          <p className="text-lg text-slate-600 mb-1">Ingen prognoser ennå</p>
          <p className="text-sm text-slate-400">
            Venter på første datainnsamling.
          </p>
        </div>
      ) : (
        <>
          <DecisionCards corrections={corrections} />
          <ForecastChart corrections={corrections} />
        </>
      )}
    </div>
  );
}
