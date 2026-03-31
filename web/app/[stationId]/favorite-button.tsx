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
      className="rounded-lg p-3 text-2xl hover:bg-stone-100 active:bg-stone-200"
      aria-label={isFavorite ? "Fjern fra favoritter" : "Sett som favoritt"}
    >
      {isFavorite ? "★" : "☆"}
    </button>
  );
}
