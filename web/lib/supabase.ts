import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;

export function getSupabase() {
  if (!supabase) {
    throw new Error("Supabase not configured — set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }
  return supabase;
}

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
  frost_risk: "low" | "medium" | "high";
  mowing_ok: boolean;
  spraying_ok: boolean;
  drying_score: number;
  confidence: number;
  created_at: string;
};
