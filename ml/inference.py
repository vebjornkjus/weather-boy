"""Run XGBoost correction on fresh Yr forecasts and write to Supabase."""

import json
from datetime import datetime, timezone

import numpy as np
import pandas as pd
import xgboost as xgb
from supabase import create_client

from config import SUPABASE_SERVICE_KEY, SUPABASE_URL
from features import add_cyclical_features


def load_model() -> tuple[xgb.XGBRegressor, dict]:
    """Load trained model and its metadata."""
    model = xgb.XGBRegressor()
    model.load_model("models/temp_correction.json")

    with open("models/temp_correction_meta.json") as f:
        metadata = json.load(f)

    return model, metadata


def compute_frost_risk(temp: float, wind_speed: float, cloud_cover: float | None) -> str:
    """Determine frost risk level for farmers."""
    if temp > 4:
        return "low"
    cloud = cloud_cover if cloud_cover is not None else 50
    if temp <= 0:
        return "high"
    if temp <= 2 and wind_speed < 2 and cloud < 30:
        return "high"
    if temp <= 3 and wind_speed < 3:
        return "medium"
    return "low"


def compute_mowing_ok(temp: float, wind_speed: float, precip: float | None) -> bool:
    """Can the farmer mow? Needs dry, warm, some wind for drying."""
    rain = precip if precip is not None else 0
    return temp >= 15 and wind_speed >= 1.5 and rain < 0.2


def compute_spraying_ok(wind_speed: float, precip: float | None) -> bool:
    """Safe to spray? Needs low wind and no rain."""
    rain = precip if precip is not None else 0
    return wind_speed < 3 and rain < 0.1


def compute_drying_score(temp: float, wind_speed: float, humidity: float | None) -> float:
    """Drying conditions score 0-1."""
    hum = humidity if humidity is not None else 70
    temp_score = min(max((temp - 10) / 20, 0), 1)
    wind_score = min(max(wind_speed / 8, 0), 1)
    hum_score = min(max((100 - hum) / 60, 0), 1)
    return round(temp_score * 0.3 + wind_score * 0.3 + hum_score * 0.4, 2)


def run_inference():
    """Load latest forecasts, correct them, write to Supabase."""
    sb = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    try:
        model, metadata = load_model()
        features = metadata["features"]
        has_model = True
        print(f"Model loaded (trained on {metadata['n_samples']} samples, MAE={metadata['mean_cv_mae']:.3f}°C)")
    except FileNotFoundError:
        has_model = False
        print("No trained model found — using raw Yr forecasts with decision signals only")

    # Get latest forecasts (last 6 hours)
    resp = (
        sb.table("forecasts")
        .select("*")
        .gte("fetched_at", datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"))
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
    print(f"Processing {len(df)} forecast records")

    if has_model:
        df = add_cyclical_features(df)
        # Rename columns to match training feature names
        rename_map = {
            "temp": "temp_forecast",
            "wind_speed": "wind_speed_forecast",
            "humidity": "humidity_forecast",
            "pressure": "pressure_forecast",
        }
        df_features = df.rename(columns=rename_map)

        available = [f for f in features if f in df_features.columns]
        for f in features:
            if f not in df_features.columns:
                df_features[f] = 0  # fill missing features with 0

        X = df_features[features]
        predicted_error = model.predict(X)
        df["temp_corrected"] = df["temp"] - predicted_error
        confidence = max(0.3, 1 - metadata["mean_cv_mae"] / 3)
    else:
        df["temp_corrected"] = df["temp"]
        confidence = 0.1

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
            "wind_speed_corrected": wind,  # no wind correction yet
            "frost_risk": compute_frost_risk(temp_c, wind, cloud),
            "mowing_ok": compute_mowing_ok(temp_c, wind, precip),
            "spraying_ok": compute_spraying_ok(wind, precip),
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
