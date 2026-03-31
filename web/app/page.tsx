import { supabase, type Station } from "@/lib/supabase";
import { StationList } from "./station-list";

export const revalidate = 3600;

async function getStations(): Promise<Station[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("stations")
    .select("*")
    .order("region");

  if (error) {
    console.error("Failed to fetch stations:", error);
    return [];
  }
  return data ?? [];
}

export default async function Home() {
  const stations = await getStations();

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold">Velg stasjon</h1>
      <p className="mb-6 text-stone-500">
        Korrigerte værvarsler for landbruksstasjoner i Norge
      </p>

      {stations.length === 0 ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-center">
          <p className="font-medium text-amber-800">Ingen stasjoner ennå</p>
          <p className="mt-1 text-sm text-amber-600">
            Datainnsamling har ikke startet. Sjekk at GitHub Actions kjører.
          </p>
        </div>
      ) : (
        <StationList stations={stations} />
      )}
    </div>
  );
}
