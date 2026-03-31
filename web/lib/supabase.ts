import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;

export type Station = {
  id: string;
  name: string;
  lat: number;
  lon: number;
  elevation: number;
  region: string;
};

export type Correction = {
  id: number;
  station_id: string;
  valid_at: string;
  lead_time_h: number;
  temp_original: number;
  temp_corrected: number;
  wind_speed_original: number;
  wind_speed_corrected: number;
  precip: number | null;
  humidity: number | null;
  cloud_cover: number | null;
  frost_risk: "low" | "medium" | "high";
  mowing_ok: boolean;
  spraying_ok: boolean;
  drying_score: number;
  confidence: number;
  created_at: string;
};

export type Season = "spring" | "summer" | "autumn" | "winter";

export function getSeason(date: Date = new Date()): Season {
  const month = date.getMonth(); // 0-indexed
  if (month >= 2 && month <= 4) return "spring";
  if (month >= 5 && month <= 7) return "summer";
  if (month >= 8 && month <= 10) return "autumn";
  return "winter";
}
