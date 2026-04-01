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
      <div className="mb-8 mt-2">
        <h1 className="font-[family-name:var(--font-display)] text-3xl text-slate-700 mb-1">
          Stasjoner
        </h1>
        <p className="text-sm text-slate-400">
          Velg din nærmeste landbruksstasjon
        </p>
      </div>

      {stations.length === 0 ? (
        <div className="glass-card rounded-2xl p-8 text-center">
          <p className="text-lg text-slate-600 mb-1">Ingen stasjoner ennå</p>
          <p className="text-sm text-slate-400">
            Datainnsamling har ikke startet. Sjekk at GitHub Actions kjører.
          </p>
        </div>
      ) : (
        <StationList stations={stations} />
      )}
    </div>
  );
}
