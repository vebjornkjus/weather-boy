"""Client for MET Norway Frost API — fetches weather observations."""

from datetime import datetime, timedelta, timezone

import httpx

from config import FROST_CLIENT_ID, STATIONS, Station

FROST_BASE = "https://frost.met.no/observations/v0.jsonld"

# Quality codes: 0=OK, 1=suspicious but usable, 2=suspect, 3=wrong
ACCEPTABLE_QUALITY = {"0", "1"}

ELEMENTS = [
    "air_temperature",
    "min(air_temperature PT1H)",
    "surface_temperature",
    "wind_speed",
    "wind_from_direction",
    "sum(precipitation_amount PT1H)",
    "relative_humidity",
    "air_pressure_at_sea_level",
    "dew_point_temperature",
]


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
        "elements": ",".join(ELEMENTS),
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
        row: dict = {
            "station_id": station_id,
            "observed_at": obs_time,
        }
        for obs in item.get("observations", []):
            # Filter by quality code
            quality = str(obs.get("qualityCode", "0"))
            if quality not in ACCEPTABLE_QUALITY:
                continue

            element = obs["elementId"]
            value = obs["value"]
            match element:
                case "air_temperature":
                    row["temp"] = value
                case "min(air_temperature PT1H)":
                    row["temp_min"] = value
                case "surface_temperature":
                    row["surface_temp"] = value
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
                case "dew_point_temperature":
                    row["dew_point"] = value

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
