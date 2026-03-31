import Link from "next/link";
import { supabase, type Station, type Correction } from "@/lib/supabase";
import { DecisionCards } from "./decision-cards";
import { ForecastChart } from "./forecast-chart";

export const revalidate = 900; // 15 min

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
      <div className="py-12 text-center">
        <p className="text-lg font-medium">Stasjon ikke funnet</p>
        <Link href="/" className="mt-2 text-sm text-blue-600 hover:underline">
          Tilbake til oversikten
        </Link>
      </div>
    );
  }

  return (
    <div>
      <Link
        href="/"
        className="mb-4 inline-block text-sm text-stone-500 hover:text-stone-700"
      >
        &larr; Alle stasjoner
      </Link>

      <h1 className="mb-1 text-2xl font-bold">{station.name}</h1>
      <p className="mb-6 text-sm text-stone-500">
        {station.region} &middot; {station.elevation} moh. &middot;{" "}
        {station.lat.toFixed(2)}N, {station.lon.toFixed(2)}E
      </p>

      {corrections.length === 0 ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-center">
          <p className="font-medium text-amber-800">Ingen prognoser ennå</p>
          <p className="mt-1 text-sm text-amber-600">
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
