"""Orchestrates data collection from Yr and Frost, writes to Supabase."""

from datetime import datetime, timezone

from supabase import create_client

from config import STATIONS, SUPABASE_SERVICE_KEY, SUPABASE_URL
from frost_client import fetch_all_stations as fetch_frost
from yr_client import fetch_all_stations as fetch_yr


def get_supabase():
    return create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)


def ensure_stations(sb):
    """Insert station metadata if not already present."""
    for station in STATIONS:
        sb.table("stations").upsert({
            "id": station.id,
            "name": station.name,
            "lat": station.lat,
            "lon": station.lon,
            "elevation": station.elevation,
            "region": station.region,
        }).execute()


def collect_forecasts(sb):
    """Fetch Yr forecasts and write to Supabase."""
    print("Collecting Yr forecasts...")
    forecasts = fetch_yr()
    if forecasts:
        sb.table("forecasts").upsert(
            forecasts,
            on_conflict="station_id,fetched_at,valid_at",
        ).execute()
    print(f"Stored {len(forecasts)} forecast records")
    return forecasts


def collect_observations(sb):
    """Fetch Frost observations and write to Supabase."""
    print("Collecting Frost observations...")
    observations = fetch_frost()
    if observations:
        sb.table("observations").upsert(
            observations,
            on_conflict="station_id,observed_at",
        ).execute()
    print(f"Stored {len(observations)} observation records")
    return observations


def main():
    print(f"Weather-Boy collector starting at {datetime.now(timezone.utc).isoformat()}")
    sb = get_supabase()
    ensure_stations(sb)
    collect_forecasts(sb)
    collect_observations(sb)
    print("Collection complete!")


if __name__ == "__main__":
    main()
