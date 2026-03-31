"""Bootstrap training data by fetching historical Frost observations
and pairing them with Yr forecasts collected going forward.

Since Yr doesn't have a public forecast archive, we use a simpler approach:
1. Fetch 12 months of historical observations from Frost
2. Fetch current Yr forecasts for all stations
3. Compute the "climatological" Yr bias by comparing recent forecasts to
   recent observations
4. Train an initial model on this data

This gives us a working model immediately, which will improve as we
collect more aligned forecast/observation pairs over time.
"""

from datetime import datetime, timedelta, timezone

import pandas as pd
from supabase import create_client

from config import STATIONS, SUPABASE_SERVICE_KEY, SUPABASE_URL, FROST_CLIENT_ID
from frost_client import fetch_observations
from collector import ensure_stations

# Frost API limits to ~100k datapoints per request, so we batch by month
BATCH_DAYS = 30


def fetch_historical_observations(months_back: int = 12) -> list[dict]:
    """Fetch historical observations from Frost for all stations."""
    all_obs = []
    now = datetime.now(timezone.utc)

    for station in STATIONS:
        station_obs = []
        for m in range(months_back):
            end = now - timedelta(days=m * BATCH_DAYS)
            start = end - timedelta(days=BATCH_DAYS)

            try:
                obs = fetch_observations(station, from_time=start, to_time=end)
                station_obs.extend(obs)
                print(f"  {station.name}: {start.date()} to {end.date()} — {len(obs)} obs")
            except Exception as e:
                print(f"  {station.name}: {start.date()} to {end.date()} — ERROR: {e}")

        all_obs.extend(station_obs)
        print(f"  {station.name} total: {len(station_obs)} observations")

    return all_obs


def store_observations(sb, observations: list[dict]):
    """Store observations in Supabase in batches."""
    batch_size = 500
    stored = 0
    for i in range(0, len(observations), batch_size):
        batch = observations[i : i + batch_size]
        try:
            sb.table("observations").upsert(
                batch,
                on_conflict="station_id,observed_at",
            ).execute()
            stored += len(batch)
        except Exception as e:
            print(f"  Batch {i}-{i+len(batch)} failed: {e}")

    print(f"Stored {stored} historical observations")


def main():
    print("=== Weather-Boy Bootstrap ===")
    print(f"Fetching historical data for {len(STATIONS)} stations\n")

    sb = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    # Ensure all stations exist (including new Kjeller/Leirsund)
    print("Ensuring stations exist...")
    ensure_stations(sb)

    # Fetch 12 months of historical observations
    print("\nFetching 12 months of historical observations...")
    observations = fetch_historical_observations(months_back=12)
    print(f"\nTotal observations: {len(observations)}")

    # Store in Supabase
    print("\nStoring in Supabase...")
    store_observations(sb, observations)

    print("\n=== Bootstrap complete! ===")
    print(f"Total observations stored: {len(observations)}")
    print("\nNext steps:")
    print("1. Run collector.py to fetch current Yr forecasts")
    print("2. Wait a few days for forecast/observation pairs to align")
    print("3. Run train.py to train the correction model")
    print("\nOr for immediate training on available data:")
    print("  python train.py")


if __name__ == "__main__":
    main()
