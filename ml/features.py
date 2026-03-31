"""Feature engineering for weather correction model."""

import numpy as np
import pandas as pd

from config import STATIONS


# Station metadata lookup
_STATION_META = {s.id: s for s in STATIONS}


def add_cyclical_features(df: pd.DataFrame) -> pd.DataFrame:
    """Add cyclical encoding for time-based features."""
    if "valid_at" in df.columns:
        dt = pd.to_datetime(df["valid_at"], utc=True)
        hour = dt.dt.hour
        day_of_year = dt.dt.dayofyear

        df["hour_sin"] = np.sin(2 * np.pi * hour / 24)
        df["hour_cos"] = np.cos(2 * np.pi * hour / 24)
        df["doy_sin"] = np.sin(2 * np.pi * day_of_year / 365)
        df["doy_cos"] = np.cos(2 * np.pi * day_of_year / 365)

    if "wind_dir_forecast" in df.columns:
        wd = df["wind_dir_forecast"]
        df["wind_dir_sin"] = np.sin(np.radians(wd))
        df["wind_dir_cos"] = np.cos(np.radians(wd))
    elif "wind_dir" in df.columns:
        wd = df["wind_dir"]
        df["wind_dir_sin"] = np.sin(np.radians(wd))
        df["wind_dir_cos"] = np.cos(np.radians(wd))

    return df


def add_station_metadata(df: pd.DataFrame) -> pd.DataFrame:
    """Add station elevation, latitude, longitude as features."""
    df["elevation"] = df["station_id"].map(
        lambda sid: _STATION_META[sid].elevation if sid in _STATION_META else 0
    )
    df["latitude"] = df["station_id"].map(
        lambda sid: _STATION_META[sid].lat if sid in _STATION_META else 0
    )
    df["longitude"] = df["station_id"].map(
        lambda sid: _STATION_META[sid].lon if sid in _STATION_META else 0
    )
    return df


def add_dewpoint_depression(df: pd.DataFrame) -> pd.DataFrame:
    """Add dewpoint depression (temp - dewpoint). Key for frost/fog prediction."""
    temp_col = "temp_forecast" if "temp_forecast" in df.columns else "temp"
    dew_col = "dew_point_forecast" if "dew_point_forecast" in df.columns else "dew_point"

    if temp_col in df.columns and dew_col in df.columns:
        df["dewpoint_depression"] = df[temp_col] - df[dew_col]
    return df


def add_pressure_tendency(df: pd.DataFrame) -> pd.DataFrame:
    """Add pressure change over 3h and 6h windows per station."""
    pressure_col = "pressure_forecast" if "pressure_forecast" in df.columns else "pressure"
    if pressure_col not in df.columns:
        return df

    df = df.sort_values(["station_id", "valid_at"])
    for hours in [3, 6]:
        df[f"pressure_tendency_{hours}h"] = (
            df.groupby("station_id")[pressure_col]
            .diff(hours)
        )
    return df


def add_rolling_error(df: pd.DataFrame) -> pd.DataFrame:
    """Add rolling mean forecast error (last 24h) per station."""
    if "temp_error" in df.columns:
        df = df.sort_values(["station_id", "valid_at"])
        df["temp_error_rolling_24h"] = (
            df.groupby("station_id")["temp_error"]
            .transform(lambda x: x.rolling(24, min_periods=1).mean())
        )
    return df


def add_lead_time_bin(df: pd.DataFrame) -> pd.DataFrame:
    """Bin lead time into categories for interaction effects."""
    if "lead_time_h" in df.columns:
        bins = [0, 6, 12, 24, 48]
        labels = [0, 1, 2, 3]
        df["lead_time_bin"] = pd.cut(
            df["lead_time_h"], bins=bins, labels=labels, include_lowest=True
        ).astype(float)
    return df


def build_training_data(forecasts: pd.DataFrame, observations: pd.DataFrame) -> pd.DataFrame:
    """Merge forecasts with observations and engineer features."""
    # Round timestamps to nearest hour for alignment
    forecasts["valid_at_hour"] = pd.to_datetime(forecasts["valid_at"], utc=True).dt.floor("h")
    observations["observed_at_hour"] = pd.to_datetime(observations["observed_at"], utc=True).dt.floor("h")

    # Deduplicate forecasts: keep first fetch per (station, valid_at, lead_time)
    forecasts = (
        forecasts.sort_values("fetched_at")
        .drop_duplicates(subset=["station_id", "valid_at_hour", "lead_time_h"], keep="first")
    )

    # Only use 1h precipitation from Yr (not 6h sums)
    if "precip_period_h" in forecasts.columns:
        forecasts.loc[forecasts["precip_period_h"] != 1, "precip"] = np.nan

    # Merge on station + hour
    df = forecasts.merge(
        observations,
        left_on=["station_id", "valid_at_hour"],
        right_on=["station_id", "observed_at_hour"],
        suffixes=("_forecast", "_observed"),
    )

    # Compute errors
    df["temp_error"] = df["temp_forecast"] - df["temp_observed"]
    df["wind_speed_error"] = df["wind_speed_forecast"] - df["wind_speed_observed"]

    # Engineer features
    df = add_cyclical_features(df)
    df = add_station_metadata(df)
    df = add_dewpoint_depression(df)
    df = add_pressure_tendency(df)
    df = add_rolling_error(df)
    df = add_lead_time_bin(df)

    return df


FEATURE_COLUMNS = [
    "temp_forecast",
    "wind_speed_forecast",
    "humidity_forecast",
    "pressure_forecast",
    "cloud_cover",
    "cloud_cover_low",
    "dew_point_forecast",
    "dewpoint_depression",
    "lead_time_h",
    "lead_time_bin",
    "hour_sin",
    "hour_cos",
    "doy_sin",
    "doy_cos",
    "wind_dir_sin",
    "wind_dir_cos",
    "pressure_tendency_3h",
    "pressure_tendency_6h",
    "temp_error_rolling_24h",
    "elevation",
    "latitude",
    "longitude",
]
