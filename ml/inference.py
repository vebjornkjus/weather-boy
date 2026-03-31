"""Run XGBoost correction on fresh Yr forecasts and write to Supabase."""

import json
from datetime import datetime, timedelta, timezone

import numpy as np
import pandas as pd
import xgboost as xgb
from supabase import create_client

from config import SUPABASE_SERVICE_KEY, SUPABASE_URL
from features import add_cyclical_features, add_station_metadata, add_dewpoint_depression


def load_model() -> tuple[xgb.XGBRegressor, dict]:
    """Load trained model and its metadata."""
    model = xgb.XGBRegressor()
    model.load_model("models/temp_correction.json")

    with open("models/temp_correction_meta.json") as f:
        metadata = json.load(f)

    return model, metadata


def compute_frost_risk(
    temp: float, wind_speed: float, cloud_cover: float | None, humidity: float | None
) -> str:
    """Determine frost risk level for farmers."""
    if temp > 6:
        return "low"
    cloud = cloud_cover if cloud_cover is not None else 50
    hum = humidity if humidity is not None else 70

    if temp <= 0:
        return "high"
    # Clear sky + calm + near freezing + humid = high risk (radiation frost)
    if temp <= 2 and wind_speed < 2 and cloud < 30:
        return "high"
    if temp <= 3 and wind_speed < 2 and hum > 90:
        return "high"
    if temp <= 4 and wind_speed < 3:
        return "medium"
    if temp <= 6 and wind_speed < 2 and cloud < 20:
        return "medium"
    return "low"


def compute_mowing_ok(temp: float, wind_speed: float, precip: float | None) -> bool:
    """Can the farmer mow? Needs dry, reasonably warm, some wind for drying."""
    rain = precip if precip is not None else 0
    return temp >= 10 and wind_speed >= 1.5 and rain < 0.2


def compute_spraying_ok(
    temp: float, wind_speed: float, precip: float | None, humidity: float | None
) -> bool:
    """Safe to spray? Needs low wind, no rain, right temp and humidity."""
    rain = precip if precip is not None else 0
    hum = humidity if humidity is not None else 70
    return wind_speed < 3 and rain < 0.1 and 8 <= temp <= 25 and 40 <= hum <= 90


def compute_drying_score(temp: float, wind_speed: float, humidity: float | None) -> float:
    """Drying conditions score 0-1. Calibrated for Norwegian conditions."""
    hum = humidity if humidity is not None else 70
    # Norwegian calibration: drying starts at 5°C, peaks around 25°C
    temp_score = min(max((temp - 5) / 15, 0), 1)
    wind_score = min(max(wind_speed / 6, 0), 1)
    hum_score = min(max((100 - hum) / 50, 0), 1)
    return round(temp_score * 0.3 + wind_score * 0.3 + hum_score * 0.4, 2)


def _compute_recent_bias(sb) -> dict[str, float]:
    """Compute per-station temperature bias from recent forecast/observation pairs.

    Looks at the last 48 hours of forecasts that have corresponding observations,
    and computes the mean error (forecast - observed) per station.
    """
    two_days_ago = (datetime.now(timezone.utc) - timedelta(hours=48)).isoformat()

    # Get recent forecasts with short lead times (most comparable to observations)
    forecasts_resp = (
        sb.table("forecasts")
        .select("station_id,valid_at,temp")
        .gte("valid_at", two_days_ago)
        .lte("lead_time_h", 6)
        .execute()
    )
    if not forecasts_resp.data:
        return {}

    # Get recent observations
    obs_resp = (
        sb.table("observations")
        .select("station_id,observed_at,temp")
        .gte("observed_at", two_days_ago)
        .execute()
    )
    if not obs_resp.data:
        return {}

    fc = pd.DataFrame(forecasts_resp.data)
    ob = pd.DataFrame(obs_resp.data)

    fc["hour"] = pd.to_datetime(fc["valid_at"], utc=True).dt.floor("h")
    ob["hour"] = pd.to_datetime(ob["observed_at"], utc=True).dt.floor("h")

    merged = fc.merge(ob, on=["station_id", "hour"], suffixes=("_fc", "_ob"))
    if merged.empty:
        return {}

    merged["error"] = merged["temp_fc"] - merged["temp_ob"]
    bias = merged.groupby("station_id")["error"].mean().to_dict()

    for sid, b in bias.items():
        print(f"  Bias {sid}: {b:+.2f}°C")

    return bias


def run_inference():
    """Load latest forecasts, correct them, write to Supabase."""
    sb = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    try:
        model, metadata = load_model()
        features = metadata["features"]
        has_model = True
        print(f"Model loaded (trained on {metadata['n_samples']} samples, MAE={metadata['mean_cv_mae']:.3f}°C)")
    except (FileNotFoundError, xgb.core.XGBoostError):
        has_model = False
        print("No trained model found — using recent-bias correction")

    # Get forecasts from the last 6 hours
    six_hours_ago = (datetime.now(timezone.utc) - timedelta(hours=6)).isoformat()
    resp = (
        sb.table("forecasts")
        .select("*")
        .gte("fetched_at", six_hours_ago)
        .execute()
    )

    if not resp.data:
        # Fallback: get most recent batch
        resp = (
            sb.table("forecasts")
            .select("*")
            .order("fetched_at", desc=True)
            .limit(500)
            .execute()
        )

    if not resp.data:
        print("No forecasts available to correct")
        return

    df = pd.DataFrame(resp.data)

    # Deduplicate: keep only the latest fetch per (station, valid_at, lead_time)
    df = (
        df.sort_values("fetched_at")
        .drop_duplicates(subset=["station_id", "valid_at", "lead_time_h"], keep="last")
    )
    print(f"Processing {len(df)} forecast records")

    if has_model:
        df = add_cyclical_features(df)
        df = add_station_metadata(df)
        df = add_dewpoint_depression(df)

        rename_map = {
            "temp": "temp_forecast",
            "wind_speed": "wind_speed_forecast",
            "humidity": "humidity_forecast",
            "pressure": "pressure_forecast",
            "dew_point": "dew_point_forecast",
        }
        df_features = df.rename(columns=rename_map)

        # Let XGBoost handle missing values natively (NaN)
        for f in features:
            if f not in df_features.columns:
                df_features[f] = np.nan

        X = df_features[features]
        predicted_error = model.predict(X)
        df["temp_corrected"] = df["temp"] - predicted_error
        confidence = max(0.3, 1 - metadata["mean_cv_mae"] / 3)
    else:
        # Simple bias correction: compare recent forecasts to observations
        bias_by_station = _compute_recent_bias(sb)
        df["temp_corrected"] = df.apply(
            lambda row: row["temp"] - bias_by_station.get(row["station_id"], 0),
            axis=1,
        )
        n_corrected = sum(1 for sid in df["station_id"] if sid in bias_by_station)
        print(f"Applied recent-bias correction to {n_corrected} records ({len(bias_by_station)} stations with bias data)")
        confidence = 0.2

    corrections = []
    for _, row in df.iterrows():
        temp_c = row["temp_corrected"]
        wind = row.get("wind_speed") or 0
        cloud = row.get("cloud_cover")
        precip = row.get("precip")
        humidity = row.get("humidity")

        corrections.append({
            "station_id": row["station_id"],
            "valid_at": row["valid_at"],
            "lead_time_h": row["lead_time_h"],
            "temp_original": row["temp"],
            "temp_corrected": round(float(temp_c), 1),
            "wind_speed_original": wind,
            "wind_speed_corrected": wind,
            "precip": precip,
            "humidity": humidity,
            "cloud_cover": cloud,
            "frost_risk": compute_frost_risk(temp_c, wind, cloud, humidity),
            "mowing_ok": compute_mowing_ok(temp_c, wind, precip),
            "spraying_ok": compute_spraying_ok(temp_c, wind, precip, humidity),
            "drying_score": compute_drying_score(temp_c, wind, humidity),
            "confidence": round(confidence, 2),
        })

    if corrections:
        sb.table("corrections").upsert(
            corrections,
            on_conflict="station_id,valid_at,lead_time_h",
        ).execute()
        print(f"Wrote {len(corrections)} corrections to Supabase")


def main():
    print(f"Weather-Boy inference starting at {datetime.now(timezone.utc).isoformat()}")
    run_inference()
    print("Inference complete!")


if __name__ == "__main__":
    main()
