#!/usr/bin/env python3
"""
ML Predictor Helper
Loads trained model and makes single prediction
Called from Node.js mlPredictor.ts service

Input (stdin): JSON with {region, hour, latitude, longitude, month}
Output (stdout): JSON with {prediction: float}
"""

import sys
import json
from pathlib import Path

try:
    import joblib
    import pandas as pd
    import numpy as np
    from sklearn.preprocessing import LabelEncoder
except ImportError:
    # Missing dependencies
    print(json.dumps({"error": "Missing dependencies"}))
    sys.exit(1)

REPO_ROOT = Path(__file__).parent.parent
MODEL_PATH = REPO_ROOT / "models" / "xgb_model.bin"
METADATA_PATH = REPO_ROOT / "models" / "model_metadata.json"


def load_model_and_metadata():
    """Load trained model and metadata"""
    try:
        model = joblib.load(MODEL_PATH)
        with open(METADATA_PATH) as f:
            metadata = json.load(f)
        return model, metadata
    except Exception as e:
        print(json.dumps({"error": f"Failed to load model: {str(e)}"}))
        sys.exit(1)


def predict(model, metadata, input_data):
    """Make prediction with trained model"""
    try:
        region = input_data["region"]
        hour = int(input_data["hour"])
        latitude = float(input_data["latitude"])
        longitude = float(input_data["longitude"])
        month = int(input_data.get("month", 3))

        # Encode region
        region_classes = metadata["regions"]
        region_encoded = region_classes.index(region) if region in region_classes else 0

        # Prepare features (must match training order)
        features = [
            region_encoded,
            hour,
            month,
            latitude,
            longitude,
        ]

        # Convert to DataFrame
        X = pd.DataFrame([features], columns=metadata["feature_names"])

        # Predict
        prediction = float(model.predict(X)[0])

        # Clamp to reasonable range
        prediction = max(2, min(120, prediction))

        print(json.dumps({"prediction": prediction}))

    except Exception as e:
        print(json.dumps({"error": f"Prediction failed: {str(e)}"}))
        sys.exit(1)


if __name__ == "__main__":
    # Read input from stdin
    try:
        input_line = sys.stdin.read()
        input_data = json.loads(input_line)
    except json.JSONDecodeError:
        print(json.dumps({"error": "Invalid JSON input"}))
        sys.exit(1)

    # Load model and make prediction
    model, metadata = load_model_and_metadata()
    predict(model, metadata, input_data)
