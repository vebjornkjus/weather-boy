"""Feature engineering for weather correction model."""

import numpy as np
import pandas as pd


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

    return df


def add_pressure_tendency(df: pd.DataFrame) -> pd.DataFrame:
    """Add pressure change over 3h and 6h windows per station."""
    df = df.sort_values(["station_id", "valid_at"])
    for hours in [3, 6]:
        df[f"pressure_tendency_{hours}h"] = (
            df.groupby("station_id")["pressure_forecast"]
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


def build_training_data(forecasts: pd.DataFrame, observations: pd.DataFrame) -> pd.DataFrame:
    """Merge forecasts with observations and engineer features."""
    # Round timestamps to nearest hour for alignment
    forecasts["valid_at_hour"] = pd.to_datetime(forecasts["valid_at"], utc=True).dt.floor("h")
    observations["observed_at_hour"] = pd.to_datetime(observations["observed_at"], utc=True).dt.floor("h")

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
    df = add_pressure_tendency(df)
    df = add_rolling_error(df)

    return df


FEATURE_COLUMNS = [
    "temp_forecast",
    "wind_speed_forecast",
    "humidity_forecast",
    "pressure_forecast",
    "cloud_cover",
    "lead_time_h",
    "hour_sin",
    "hour_cos",
    "doy_sin",
    "doy_cos",
    "wind_dir_sin",
    "wind_dir_cos",
    "pressure_tendency_3h",
    "pressure_tendency_6h",
    "temp_error_rolling_24h",
]
