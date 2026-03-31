"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Station } from "@/lib/supabase";

type Props = {
  stations: Station[];
};

export function StationList({ stations }: Props) {
  const [favoriteId, setFavoriteId] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("weather-boy-favorite");
    if (saved) setFavoriteId(saved);
  }, []);

  // Sort: favorite first
  const sorted = [...stations].sort((a, b) => {
    if (a.id === favoriteId) return -1;
    if (b.id === favoriteId) return 1;
    return 0;
  });

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {sorted.map((station) => (
        <Link
          key={station.id}
          href={`/${station.id}`}
          className="relative rounded-lg border border-stone-200 bg-white p-4 transition hover:border-stone-300 hover:shadow-sm active:bg-stone-50 min-h-[56px]"
        >
          <div className="font-medium">
            {station.id === favoriteId && (
              <span className="mr-1.5 text-amber-500" aria-label="Favoritt">
                ★
              </span>
            )}
            {station.name}
          </div>
          <div className="text-sm text-stone-500">
            {station.region} · {station.elevation} moh.
          </div>
        </Link>
      ))}
    </div>
  );
}
