"""Train XGBoost correction model on forecast errors."""

import json

import numpy as np
import pandas as pd
import xgboost as xgb
from sklearn.model_selection import TimeSeriesSplit
from supabase import create_client

from config import SUPABASE_SERVICE_KEY, SUPABASE_URL
from features import FEATURE_COLUMNS, build_training_data


def load_data_from_supabase() -> tuple[pd.DataFrame, pd.DataFrame]:
    """Load forecasts and observations from Supabase."""
    sb = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    forecasts_resp = sb.table("forecasts").select("*").execute()
    obs_resp = sb.table("observations").select("*").execute()

    forecasts = pd.DataFrame(forecasts_resp.data)
    observations = pd.DataFrame(obs_resp.data)

    print(f"Loaded {len(forecasts)} forecasts, {len(observations)} observations")
    return forecasts, observations


def train_temperature_model(df: pd.DataFrame) -> xgb.XGBRegressor:
    """Train XGBoost model to predict temperature forecast error."""
    available_features = [f for f in FEATURE_COLUMNS if f in df.columns]
    df_clean = df.dropna(subset=available_features + ["temp_error"])

    if len(df_clean) < 100:
        raise ValueError(
            f"Not enough training data: {len(df_clean)} rows (need at least 100)"
        )

    X = df_clean[available_features]
    y = df_clean["temp_error"]

    print(f"Training on {len(X)} samples with {len(available_features)} features")

    # Temporal cross-validation
    tscv = TimeSeriesSplit(n_splits=3)
    mae_scores = []

    for fold, (train_idx, val_idx) in enumerate(tscv.split(X)):
        X_train, X_val = X.iloc[train_idx], X.iloc[val_idx]
        y_train, y_val = y.iloc[train_idx], y.iloc[val_idx]

        model = xgb.XGBRegressor(
            n_estimators=200,
            max_depth=5,
            learning_rate=0.05,
            subsample=0.8,
            colsample_bytree=0.8,
            random_state=42,
        )
        model.fit(
            X_train, y_train,
            eval_set=[(X_val, y_val)],
            verbose=False,
        )

        preds = model.predict(X_val)
        mae = np.mean(np.abs(preds - y_val))
        baseline_mae = np.mean(np.abs(y_val))
        mae_scores.append(mae)
        print(f"  Fold {fold + 1}: MAE={mae:.3f}°C (baseline={baseline_mae:.3f}°C)")

    print(f"  Mean CV MAE: {np.mean(mae_scores):.3f}°C")

    # Train final model on all data
    final_model = xgb.XGBRegressor(
        n_estimators=200,
        max_depth=5,
        learning_rate=0.05,
        subsample=0.8,
        colsample_bytree=0.8,
        random_state=42,
    )
    final_model.fit(X, y, verbose=False)

    # Save feature list with model
    metadata = {
        "features": available_features,
        "mean_cv_mae": float(np.mean(mae_scores)),
        "n_samples": len(X),
    }

    return final_model, metadata


def main():
    print("Loading data from Supabase...")
    forecasts, observations = load_data_from_supabase()

    print("Building training data...")
    df = build_training_data(forecasts, observations)
    print(f"Training data: {len(df)} aligned records")

    print("Training temperature correction model...")
    model, metadata = train_temperature_model(df)

    model_path = "models/temp_correction.json"
    model.save_model(model_path)
    print(f"Model saved to {model_path}")

    meta_path = "models/temp_correction_meta.json"
    with open(meta_path, "w") as f:
        json.dump(metadata, f, indent=2)
    print(f"Metadata saved to {meta_path}")


if __name__ == "__main__":
    main()
