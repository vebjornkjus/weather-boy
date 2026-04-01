"use client";

import { useEffect, useState } from "react";

export function FavoriteButton({ stationId }: { stationId: string }) {
  const [isFavorite, setIsFavorite] = useState(false);

  useEffect(() => {
    setIsFavorite(localStorage.getItem("weather-boy-favorite") === stationId);
  }, [stationId]);

  function toggle() {
    if (isFavorite) {
      localStorage.removeItem("weather-boy-favorite");
      setIsFavorite(false);
    } else {
      localStorage.setItem("weather-boy-favorite", stationId);
      setIsFavorite(true);
    }
  }

  return (
    <button
      onClick={toggle}
      className="rounded-full bg-white/40 backdrop-blur p-3 text-xl hover:bg-white/60 active:scale-90 transition-all"
      aria-label={isFavorite ? "Fjern fra favoritter" : "Sett som favoritt"}
    >
      <span className={isFavorite ? "text-amber-400" : "text-slate-300"}>
        {isFavorite ? "★" : "☆"}
      </span>
    </button>
  );
}
