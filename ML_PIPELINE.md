# STAGE 16: RailSense ML Pipeline

## Overview

The ML Pipeline provides intelligent halt duration prediction using XGBoost regression. It learns from historical train snapshots to predict how long a train will stay halted based on external factors.

## Architecture

```
┌─────────────────────┐
│  Training Pipeline  │
│  (Python/XGBoost)   │
└──────────┬──────────┘
           │
           ├─→ Snapshot Collector (snapshotWorker.ts)
           │   └─→ Historical data (database)
           │
           ├─→ Feature Engineering (train_model.py)
           │   └─→ Region, hour, location encoding
           │
           ├─→ Model Training (XGBoost)
           │   └─→ models/xgb_model.bin
           │
           └─→ Metadata Export (model_metadata.json)
                └─→ Features, ranges, performance

┌──────────────────────────┐
│   Serving Pipeline       │
│   (Node.js API)          │
└──────────┬───────────────┘
           │
           ├─→ API Route: /api/predict
           │   └─→ Accepts: region, hour, lat, lng, month
           │
           ├─→ ML Service: mlPredictor.ts
           │   └─→ Loads model & metadata
           │
           └─→ Backend: Python subprocess OR Heuristic fallback
               └─→ Returns: duration, confidence, method
```

## Setup & Prerequisites

### Python Dependencies

```bash
# Install required packages
pip install pandas numpy scikit-learn xgboost joblib

# Verify installation
python -c "import xgboost; print('✓ XGBoost ready')"
```

### Data Collection (Prerequisite)

Before training, collect historical data:

```bash
# Terminal 1: Start dev server
npm run dev

# Terminal 2: Run snapshot worker (5-10 minutes)
node -r ts-node/register scripts/snapshotWorker.ts

# Expected output:
# 🚂 Snapshot Worker Started
# 📸 Snapshot cycle 1...
# ✅ Snapshot logged...
# ✅ Snapshot logged...
```

This populates `data/history.db` with train snapshots.

## Training the Model

### Step 1: Collect Data

Run the snapshot worker for 5-10 minutes to gather training data:

```bash
node -r ts-node/register scripts/snapshotWorker.ts &
sleep 300  # Wait 5 minutes
kill $!   # Stop worker
```

### Step 2: Train Model

```bash
python scripts/train_model.py
```

**Expected output:**
```
🚀 RailSense ML Model Training Pipeline

📂 Loading snapshots from database...
✅ Loaded 150 snapshots

⚙️  Aggregating halt events...
✅ Found 25 halt events

📊 Dataset shape: (25, 5)
   Average halt: 8.5 minutes
   Regions: 5 unique

🔧 Creating features...
✅ Features: 5 dimensions
   Columns: region_encoded, hour, month, latitude, longitude

📍 Splitting train/test...
   Train: 20 samples
   Test: 5 samples

🤖 Training XGBoost model...
✅ Training complete

📈 Model Performance:
   R² Train Score: 0.758
   R² Test Score: 0.682
   MAE: 2.34 minutes
   RMSE: 3.12 minutes

💾 Saving model...
   ✅ Model saved: models/xgb_model.bin
   ✅ Metadata saved: models/model_metadata.json

🎯 Top Features by Importance:
   hour                 0.456
   region_encoded       0.287
   month                0.156
   latitude             0.065
   longitude            0.036

✨ Training pipeline complete!
```

### Step 3: Verify Output

Check that model files were created:

```bash
ls -lh models/
# Should show:
# -rw-r--r--  xgb_model.bin
# -rw-r--r--  model_metadata.json
```

## Using the Model in Production

### Method 1: API Endpoint

Once model is trained and dev server running:

```bash
# Make prediction via API
curl "http://localhost:3000/api/predict?\
region=North&\
hour=15&\
latitude=30.5&\
longitude=75.2&\
month=3"

# Response:
{
  "predicted_duration_min": 12,
  "confidence": 0.85,
  "method": "ml",
  "model_info": {
    "r2_score": 0.682,
    "mae": 2.34
  },
  "model_status": {
    "available": true,
    "metadata": {
      "trained_at": "2026-03-09T10:30:00Z",
      "r2_score": 0.682,
      "training_samples": 20,
      "regions": ["North", "South", "East", "West", "Centre"]
    }
  }
}
```

### Method 2: Programmatic Usage

```typescript
import { predictHaltDuration } from '@/services/mlPredictor';

const result = await predictHaltDuration({
  region: 'North',
  hour: 15,
  latitude: 30.5,
  longitude: 75.2,
});

console.log(`Predicted halt: ${result.predicted_duration_min} minutes`);
console.log(`Confidence: ${(result.confidence * 100).toFixed(0)}%`);
```

## Features & Input Ranges

| Feature | Range | Effect |
|---------|-------|--------|
| `region` | North, South, East, West, Centre | Different regions have different halt patterns |
| `hour` | 0-23 | Peak hours (6-9, 18-20) tend to have longer halts |
| `latitude` | -90 to 90 | Geographic location (used for regional clustering) |
| `longitude` | -180 to 180 | Geographic location |
| `month` | 1-12 | Seasonal variations (monsoon, etc.) |

## Model Performance

After training on sample data, typical metrics:

- **R² Score:** 0.65-0.75 (explains 65-75% of variance)
- **MAE:** 2-4 minutes (average prediction error)
- **RMSE:** 3-5 minutes (accounts for outliers)
- **Confidence:** 50-95% (depends on method)

### Confidence Levels

| Score | Interpretation | Used When |
|-------|---|---|
| 0.3-0.5 | Low | Heuristic fallback (no model) |
| 0.5-0.7 | Medium | Limited training data |
| 0.7-0.9 | High | Well-trained model |
| 0.9+ | Very High | Multiple validations |

## Fallback Behavior

If ML model unavailable, the system falls back to heuristic prediction:

```typescript
// Heuristic factors
const regionFactors = {
  North: 1.2,  // Slower, more halts
  South: 0.9,  // Faster
  East: 1.1,
  West: 0.8,   // Fastest
  Centre: 1.0,
};

const hourFactors = {
  6: 1.3,   // Morning peak
  8: 1.5,   // High
  9: 1.4,
  18: 1.4,  // Evening peak
  20: 1.2,
};

// Additional randomness for realism
duration = baseDuration × regionFactor × hourFactor × randomVariance;
```

## Retraining Strategy

### When to Retrain

- Monthly: Capture seasonal changes
- After major events: Infrastructure changes, strikes
- When accuracy drops: Monitor mae against actual data
- New regions: When expanding to new areas

### Automated Retraining (Optional)

```bash
# Add to cron job
# 0 0 1 * * cd /path/to/railsense && python scripts/train_model.py
```

## Monitoring & Debugging

### Check Model Status

```bash
curl "http://localhost:3000/api/predict?region=North&hour=12&latitude=30&longitude=75" | jq '.model_status'

# Output shows:
# {
#   "available": true,
#   "trained_at": "2026-03-09T10:30:00Z",
#   "r2_score": 0.682
# }
```

### View Feature Importance

After running training, check `models/model_metadata.json`:

```json
{
  "feature_names": ["region_encoded", "hour", "month", "latitude", "longitude"],
  "regions": ["North", "South", "East", "West", "Centre"],
  "trained_at": "2026-03-09T10:30:00Z",
  "r2_score": 0.682
}
```

## Troubleshooting

### Error: "Python not found"

```bash
# Install Python 3.8+
python --version

# Install dependencies
pip install xgboost joblib
```

### Error: "Model file not found"

```bash
# Run training first
python scripts/train_model.py

# Verify files created
ls models/xgb_model.bin models/model_metadata.json
```

### Predictions seem wrong

1. **Check input ranges:** Verify region, hour, lat/lng are valid
2. **Check training data:** Was snapshotWorker collecting data?
3. **Retrain model:** More/better data improves accuracy
4. **Check fallback:** If using heuristic, confidence will be 0.3-0.5

## Advanced: Custom Model

To replace XGBoost with your own model:

1. **Modify `train_model.py`:**
   - Replace `xgb.XGBRegressor()` with your model
   - Save model in same format (joblib)

2. **Update metadata structure** in `model_metadata.json`

3. **Retrain:**
   ```bash
   python scripts/train_model.py
   ```

## ML Pipeline Commands

Add to `package.json`:

```json
{
  "scripts": {
    "worker": "node -r ts-node/register scripts/snapshotWorker.ts",
    "train-model": "python scripts/train_model.py",
    "ml:status": "curl 'http://localhost:3000/api/predict?region=North&hour=12&latitude=30&longitude=75'",
    "ml:test": "npm run train-model && curl 'http://localhost:3000/api/predict?region=North&hour=15&latitude=30.5&longitude=75.2'"
  }
}
```

Usage:

```bash
npm run worker          # Run data collector
npm run train-model    # Train ML model
npm run ml:status     # Check model status
npm run ml:test       # Full test (train + query)
```

## Performance Considerations

### Cold Start

First API call may be slow (loads model from disk):
- Python subprocess spawn: ~500ms
- Feature encoding: ~50ms
- Prediction: ~10ms
- **Total: ~600ms** ⚠️

### Optimization

For production, consider:
1. **Cache predictions:** `/api/predict` already has 10-min cache
2. **Batch predictions:** Train multiple at once
3. **Compiled model:** Use ONNX format for faster inference
4. **Model caching:** Keep model in memory (for 24/7 service)

## Data Privacy

- ✅ All training data local (SQLite)
- ✅ Model file local (not uploaded anywhere)
- ✅ Predictions only from public APIs
- ✅ No user personal data collected

## Future Enhancements

- [ ] Real-time feedback loop: Compare predictions vs actual
- [ ] Feature importance visualization
- [ ] Anomaly detection for extreme halts
- [ ] Transfer learning from other routes
- [ ] ONNX export for edge deployment
- [ ] FastAPI Python server for lower latency

---

## Summary

The ML Pipeline provides:

1. **Data Collection:** `snapshotWorker.ts` gathers historical data
2. **Training:** `train_model.py` trains XGBoost model
3. **Serving:** `mlPredictor.ts` + `/api/predict` exposes predictions
4. **Fallback:** Heuristic prediction if model unavailable
5. **Monitoring:** Status API for model health

Start with the quick setup, collect data, train model, and enjoy intelligent predictions! 🚀
