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

  const sorted = [...stations].sort((a, b) => {
    if (a.id === favoriteId) return -1;
    if (b.id === favoriteId) return 1;
    return 0;
  });

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {sorted.map((station, i) => (
        <Link
          key={station.id}
          href={`/${station.id}`}
          className="glass-card group rounded-2xl p-5 transition-all duration-200 hover:shadow-md hover:scale-[1.02] active:scale-[0.98] min-h-[72px] animate-card-enter"
          style={{ animationDelay: `${i * 60}ms` }}
        >
          <div className="flex items-center gap-2 mb-1">
            {station.id === favoriteId && (
              <span className="text-amber-400 text-sm" aria-label="Favoritt">
                ★
              </span>
            )}
            <span className="font-medium text-slate-700 group-hover:text-slate-900 transition-colors">
              {station.name}
            </span>
          </div>
          <div className="text-xs text-slate-400 tracking-wide">
            {station.region} · {station.elevation} moh.
          </div>
          <div className="mt-3 flex items-center gap-1 text-[11px] text-slate-300 group-hover:text-sky-400 transition-colors">
            <span>Se prognose</span>
            <span className="transition-transform group-hover:translate-x-0.5">→</span>
          </div>
        </Link>
      ))}
    </div>
  );
}
