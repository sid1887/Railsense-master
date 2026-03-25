#!/usr/bin/env python3
"""
STAGE 16: ML Training Script for RailSense
Trains an XGBoost model to predict halt duration
Requires: pandas, xgboost, scikit-learn, joblib

Installation:
    pip install pandas xgboost scikit-learn joblib

Usage:
    python scripts/train_model.py

Output:
    models/xgb_model.bin - Trained XGBoost model
    models/model_metadata.json - Feature names and hyperparameters
"""

import json
import sqlite3
from pathlib import Path
from collections import defaultdict
from datetime import datetime
import math

# Try to import ML libraries; provide helpful error if missing
try:
    import pandas as pd
    import numpy as np
    from sklearn.preprocessing import LabelEncoder
    from sklearn.model_selection import train_test_split
except ImportError:
    print("❌ Missing dependencies. Install with:")
    print("   pip install pandas numpy scikit-learn")
    exit(1)

try:
    import xgboost as xgb
    import joblib
except ImportError:
    print("❌ Missing ML libraries. Install with:")
    print("   pip install xgboost joblib")
    exit(1)

# Paths
REPO_ROOT = Path(__file__).parent.parent
DB_PATH = REPO_ROOT / "data" / "history.db"
MODELS_DIR = REPO_ROOT / "models"
MODEL_PATH = MODELS_DIR / "xgb_model.bin"
METADATA_PATH = MODELS_DIR / "model_metadata.json"

# Ensure models directory exists
MODELS_DIR.mkdir(parents=True, exist_ok=True)


def extract_region_from_coordinates(lat, lng):
    """Simple region mapper based on lat/lng bounds"""
    # India regions (simplified)
    regions = {
        "North": {"lat": (28, 35), "lng": (68, 80)},
        "South": {"lat": (8, 15), "lng": (77, 88)},
        "East": {"lat": (23, 28), "lng": (85, 92)},
        "West": {"lat": (18, 26), "lng": (69, 77)},
        "Centre": {"lat": (20, 27), "lng": (77, 85)},
    }

    for region, bounds in regions.items():
        lat_min, lat_max = bounds["lat"]
        lng_min, lng_max = bounds["lng"]
        if lat_min <= lat <= lat_max and lng_min <= lng <= lng_max:
            return region

    return "Unknown"


def extract_hour_from_timestamp(timestamp_ms):
    """Extract hour of day (0-23) from timestamp"""
    timestamp_s = timestamp_ms / 1000
    dt = datetime.fromtimestamp(timestamp_s)
    return dt.hour


def load_data_from_db():
    """Load train snapshots from SQLite database"""
    if not DB_PATH.exists():
        print(f"⚠️  Database not found at {DB_PATH}")
        print("   Run snapshotWorker.ts first to collect data")
        return None

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    try:
        cursor.execute("""
            SELECT train_number, lat, lng, speed, delay, timestamp, provider
            FROM train_snapshots
            ORDER BY train_number, timestamp
        """)
        snapshots = cursor.fetchall()
    except sqlite3.OperationalError:
        print("❌ Table 'train_snapshots' not found. Run snapshotWorker first")
        return None
    finally:
        conn.close()

    return snapshots


def aggregate_halts(snapshots):
    """
    Aggregate consecutive stationary snapshots into halt records
    Returns list of: {train_no, start_time, end_time, duration_min, lat, lng, region, hour}
    """
    if not snapshots:
        return []

    halts = []
    train_groups = defaultdict(list)

    # Group snapshots by train
    for train_no, lat, lng, speed, delay, ts, provider in snapshots:
        train_groups[train_no].append((lat, lng, speed, delay, ts))

    # Detect halts within each train's history
    for train_no, history in train_groups.items():
        if len(history) < 2:
            continue

        halt_start_idx = None

        for i, (lat, lng, speed, delay, ts) in enumerate(history):
            # Speed near zero = potential halt
            if speed <= 1:
                if halt_start_idx is None:
                    halt_start_idx = i
            else:
                # Speed increased = end of halt
                if halt_start_idx is not None:
                    start_ts = history[halt_start_idx][4]
                    halt_duration_min = (ts - start_ts) / 1000 / 60

                    if halt_duration_min >= 2:  # Only record meaningful halts
                        start_lat = history[halt_start_idx][0]
                        start_lng = history[halt_start_idx][1]
                        region = extract_region_from_coordinates(start_lat, start_lng)
                        hour = extract_hour_from_timestamp(start_ts)

                        halts.append({
                            "train_no": train_no,
                            "duration_min": max(2, min(120, halt_duration_min)),  # Clamp 2-120 min
                            "latitude": start_lat,
                            "longitude": start_lng,
                            "region": region,
                            "hour": hour,
                            "month": datetime.fromtimestamp(start_ts / 1000).month,
                        })

                    halt_start_idx = None

    return halts


def create_features(halts_df):
    """Create feature matrix from halt records"""
    df = halts_df.copy()

    # Encode categorical features
    region_encoder = LabelEncoder()
    df["region_encoded"] = region_encoder.fit_transform(df["region"])

    # Create features
    X = df[[
        "region_encoded",
        "hour",
        "month",
        "latitude",
        "longitude",
    ]].copy()

    # Normalize latitude and longitude
    X["latitude"] = (X["latitude"] - X["latitude"].min()) / (X["latitude"].max() - X["latitude"].min()),
    X["longitude"] = (X["longitude"] - X["longitude"].min()) / (X["longitude"].max() - X["longitude"].min()),

    # Target variable
    y = df["duration_min"].values

    return X, y, region_encoder, df[["region", "hour", "month"]]


def train_model():
    """Main training pipeline"""
    print("🚀 RailSense ML Model Training Pipeline\n")

    # Step 1: Load data
    print("📂 Loading snapshots from database...")
    snapshots = load_data_from_db()

    if not snapshots:
        print("\n⚠️  No snapshot data available. ")
        print("   To generate data:")
        print("   1. Run: node -r ts-node/register scripts/snapshotWorker.ts")
        print("   2. Let it collect data for 5-10 minutes")
        print("   3. Then run this script again\n")
        return False

    print(f"✅ Loaded {len(snapshots)} snapshots\n")

    # Step 2: Aggregate halts
    print("⚙️  Aggregating halt events...")
    halts = aggregate_halts(snapshots)
    print(f"✅ Found {len(halts)} halt events\n")

    if len(halts) < 10:
        print("⚠️  Not enough halt data for meaningful model (need 10+)")
        print("   Continuing with demo model...\n")

    # Create DataFrame
    halts_df = pd.DataFrame(halts) if halts else pd.DataFrame({
        "duration_min": [5, 8, 12, 3, 15, 6, 4, 10, 7, 9],
        "region": ["North", "South", "East", "West", "Centre"] * 2,
        "hour": [6, 9, 15, 18, 21, 12, 8, 14, 16, 20],
        "month": [3, 3, 3, 3, 3, 3, 3, 3, 3, 3],
        "latitude": [30 + i * 0.1 for i in range(10)],
        "longitude": [75 + i * 0.1 for i in range(10)],
    })

    print(f"📊 Dataset shape: {halts_df.shape}")
    print(f"   Average halt: {halts_df['duration_min'].mean():.1f} minutes")
    print(f"   Regions: {halts_df['region'].nunique()} unique\n")

    # Step 3: Create features
    print("🔧 Creating features...")
    X, y, region_encoder, feature_context = create_features(halts_df)
    print(f"✅ Features: {X.shape[1]} dimensions")
    print(f"   Columns: {', '.join(X.columns)}\n")

    # Step 4: Split data
    print("📍 Splitting train/test...")
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )
    print(f"   Train: {X_train.shape[0]} samples")
    print(f"   Test: {X_test.shape[0]} samples\n")

    # Step 5: Train XGBoost
    print("🤖 Training XGBoost model...")
    model = xgb.XGBRegressor(
        n_estimators=50,
        max_depth=5,
        learning_rate=0.1,
        subsample=0.8,
        objective="reg:squarederror",
        random_state=42,
        verbose=0,
    )

    model.fit(X_train, y_train, verbose=False)
    print("✅ Training complete\n")

    # Step 6: Evaluate
    print("📈 Model Performance:")
    train_score = model.score(X_train, y_train)
    test_score = model.score(X_test, y_test)

    y_pred = model.predict(X_test)
    mae = np.mean(np.abs(y_pred - y_test))
    rmse = np.sqrt(np.mean((y_pred - y_test) ** 2))

    print(f"   R² Train Score: {train_score:.3f}")
    print(f"   R² Test Score: {test_score:.3f}")
    print(f"   MAE: {mae:.2f} minutes")
    print(f"   RMSE: {rmse:.2f} minutes\n")

    # Step 7: Save model
    print("💾 Saving model...")
    joblib.dump(model, MODEL_PATH)
    print(f"   ✅ Model saved: {MODEL_PATH}\n")

    # Step 8: Save metadata
    metadata = {
        "model_type": "XGBRegressor",
        "n_features": X.shape[1],
        "feature_names": X.columns.tolist(),
        "feature_ranges": {
            "region_encoded": [0, int(halts_df["region"].nunique() - 1)],
            "hour": [0, 23],
            "month": [1, 12],
            "latitude": [float(X["latitude"].min()), float(X["latitude"].max())],
            "longitude": [float(X["longitude"].min()), float(X["longitude"].max())],
        },
        "regions": list(region_encoder.classes_),
        "target_variable": "halt_duration_minutes",
        "training_samples": int(X_train.shape[0]),
        "test_samples": int(X_test.shape[0]),
        "r2_score": float(test_score),
        "mae": float(mae),
        "rmse": float(rmse),
        "trained_at": datetime.now().isoformat(),
        "hyperparameters": {
            "n_estimators": 50,
            "max_depth": 5,
            "learning_rate": 0.1,
            "subsample": 0.8,
        },
    }

    with open(METADATA_PATH, "w") as f:
        json.dump(metadata, f, indent=2)

    print(f"   ✅ Metadata saved: {METADATA_PATH}\n")

    # Step 9: Feature importance
    print("🎯 Top Features by Importance:")
    importance = pd.DataFrame({
        "feature": X.columns,
        "importance": model.feature_importances_,
    }).sort_values("importance", ascending=False)

    for idx, row in importance.iterrows():
        print(f"   {row['feature']:<20} {row['importance']:>6.3f}")

    print("\n✨ Training pipeline complete!\n")
    print("📌 Next steps:")
    print("   1. Run:  node services/mlPredictor.ts")
    print("   2. Call: POST /api/predict with { region, hour, lat, lng }")
    print("   3. Get predicted halt duration\n")

    return True


if __name__ == "__main__":
    success = train_model()
    exit(0 if success else 1)
