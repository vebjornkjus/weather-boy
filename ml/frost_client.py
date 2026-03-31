"""Client for MET Norway Frost API — fetches weather observations."""

from datetime import datetime, timedelta, timezone

import httpx

from config import FROST_CLIENT_ID, STATIONS, Station

FROST_BASE = "https://frost.met.no/observations/v0.jsonld"


def fetch_observations(
    station: Station,
    from_time: datetime | None = None,
    to_time: datetime | None = None,
) -> list[dict]:
    """Fetch hourly observations from Frost API for a station."""
    if to_time is None:
        to_time = datetime.now(timezone.utc)
    if from_time is None:
        from_time = to_time - timedelta(hours=24)

    params = {
        "sources": station.id,
        "referencetime": f"{from_time.isoformat()}/{to_time.isoformat()}",
        "elements": ",".join([
            "air_temperature",
            "wind_speed",
            "wind_from_direction",
            "sum(precipitation_amount PT1H)",
            "relative_humidity",
            "air_pressure_at_sea_level",
        ]),
        "timeresolutions": "PT1H",
    }

    resp = httpx.get(
        FROST_BASE,
        params=params,
        auth=(FROST_CLIENT_ID, ""),
        timeout=30,
    )
    resp.raise_for_status()
    data = resp.json()

    return _parse_observations(data, station.id)


def _parse_observations(data: dict, station_id: str) -> list[dict]:
    """Parse Frost API response into flat observation records."""
    records = []
    for item in data.get("data", []):
        obs_time = item["referenceTime"]
        row = {
            "station_id": station_id,
            "observed_at": obs_time,
        }
        for obs in item.get("observations", []):
            element = obs["elementId"]
            value = obs["value"]
            match element:
                case "air_temperature":
                    row["temp"] = value
                case "wind_speed":
                    row["wind_speed"] = value
                case "wind_from_direction":
                    row["wind_dir"] = value
                case "sum(precipitation_amount PT1H)":
                    row["precip"] = value
                case "relative_humidity":
                    row["humidity"] = value
                case "air_pressure_at_sea_level":
                    row["pressure"] = value

        records.append(row)
    return records


def fetch_all_stations(
    from_time: datetime | None = None,
    to_time: datetime | None = None,
) -> list[dict]:
    """Fetch observations for all configured stations."""
    all_obs = []
    for station in STATIONS:
        try:
            obs = fetch_observations(station, from_time, to_time)
            all_obs.extend(obs)
            print(f"  Frost: {station.name} — {len(obs)} observations")
        except httpx.HTTPStatusError as e:
            print(f"  Frost: {station.name} — ERROR {e.response.status_code}")
    return all_obs
