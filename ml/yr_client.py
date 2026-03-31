"""Client for Yr Locationforecast 2.0 — fetches weather forecasts."""

from datetime import datetime, timezone

import httpx

from config import STATIONS, YR_USER_AGENT, Station

YR_BASE = "https://api.met.no/weatherapi/locationforecast/2.0/compact"


def fetch_forecast(station: Station) -> list[dict]:
    """Fetch Locationforecast for a station's coordinates."""
    resp = httpx.get(
        YR_BASE,
        params={"lat": station.lat, "lon": station.lon},
        headers={"User-Agent": YR_USER_AGENT},
        timeout=30,
    )
    resp.raise_for_status()
    data = resp.json()

    fetched_at = datetime.now(timezone.utc).isoformat()
    return _parse_forecast(data, station.id, fetched_at)


def _parse_forecast(data: dict, station_id: str, fetched_at: str) -> list[dict]:
    """Parse Locationforecast response into flat forecast records."""
    records = []
    timeseries = data.get("properties", {}).get("timeseries", [])
    fetch_time = datetime.fromisoformat(fetched_at)

    for entry in timeseries:
        valid_at = datetime.fromisoformat(entry["time"])
        lead_time_h = int((valid_at - fetch_time).total_seconds() / 3600)

        # Only keep forecasts up to 48 hours ahead
        if lead_time_h < 0 or lead_time_h > 48:
            continue

        instant = entry.get("data", {}).get("instant", {}).get("details", {})

        records.append({
            "station_id": station_id,
            "fetched_at": fetched_at,
            "valid_at": entry["time"],
            "lead_time_h": lead_time_h,
            "temp": instant.get("air_temperature"),
            "wind_speed": instant.get("wind_speed"),
            "wind_dir": instant.get("wind_from_direction"),
            "precip": _get_precip(entry),
            "humidity": instant.get("relative_humidity"),
            "pressure": instant.get("air_pressure_at_sea_level"),
            "cloud_cover": instant.get("cloud_area_fraction"),
        })

    return records


def _get_precip(entry: dict) -> float | None:
    """Extract precipitation from next_1_hours or next_6_hours."""
    data = entry.get("data", {})
    for period in ("next_1_hours", "next_6_hours"):
        details = data.get(period, {}).get("details", {})
        if "precipitation_amount" in details:
            return details["precipitation_amount"]
    return None


def fetch_all_stations() -> list[dict]:
    """Fetch forecasts for all configured stations."""
    all_forecasts = []
    for station in STATIONS:
        try:
            forecasts = fetch_forecast(station)
            all_forecasts.extend(forecasts)
            print(f"  Yr: {station.name} — {len(forecasts)} timepoints")
        except httpx.HTTPStatusError as e:
            print(f"  Yr: {station.name} — ERROR {e.response.status_code}")
    return all_forecasts
