/**
 * ML Predictor Service
 * Loads trained XGBoost model and serves predictions
 *
 * Usage:
 *   await predictHaltDuration({ region: 'North', hour: 15, lat: 30.5, lng: 75.2 })
 *
 * Note: Requires Python environment with: pip install xgboost joblib
 * Model must be trained first: python scripts/train_model.py
 */

import * as fs from 'fs';
import * as path from 'path';
import { spawn } from 'child_process';
import { logger } from './logger';

interface PredictionInput {
  region: string;
  hour: number;
  latitude: number;
  longitude: number;
  month?: number;
}

interface PredictionResult {
  predicted_duration_min: number;
  confidence: number;
  method: 'ml' | 'fallback';
  model_info?: {
    r2_score: number;
    mae: number;
  };
}

const MODELS_DIR = path.join(process.cwd(), 'models');
const MODEL_PATH = path.join(MODELS_DIR, 'xgb_model.bin');
const METADATA_PATH = path.join(MODELS_DIR, 'model_metadata.json');

let modelMetadata: any = null;
let modelAvailable = false;

/**
 * Initialize ML service and load metadata
 */
export async function initializeMLP(): Promise<boolean> {
  try {
    if (fs.existsSync(METADATA_PATH)) {
      const metadataJson = fs.readFileSync(METADATA_PATH, 'utf-8');
      modelMetadata = JSON.parse(metadataJson);
      modelAvailable = true;
      logger.success('ML model loaded', {
        trained_at: modelMetadata.trained_at,
        r2_score: modelMetadata.r2_score,
      });
      return true;
    } else {
      logger.warn('ML model not found. Run: python scripts/train_model.py');
      modelAvailable = false;
      return false;
    }
  } catch (err) {
    logger.error('Failed to load ML model metadata:', err);
    modelAvailable = false;
    return false;
  }
}

/**
 * Call Python subprocess to make prediction
 * (Alternative to direct ML library loading in Node.js)
 */
function predictViaPython(input: PredictionInput): Promise<number | null> {
  return new Promise((resolve) => {
    const pythonScript = path.join(process.cwd(), 'scripts', 'ml_predictor.py');

    if (!fs.existsSync(pythonScript)) {
      logger.warn('[ML] Python predictor script not found');
      resolve(null);
      return;
    }

    const pythonProcess = spawn('python', [pythonScript], {
      timeout: 5000,
    });

    let output = '';
    let error = '';

    pythonProcess.stdout.on('data', (data) => {
      output += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
      error += data.toString();
    });

    pythonProcess.on('close', (code) => {
      if (code === 0 && output) {
        try {
          const result = JSON.parse(output);
          resolve(result.prediction || null);
        } catch (err) {
          logger.debug('[ML] Failed to parse Python output:', err);
          resolve(null);
        }
      } else {
        if (error) logger.debug('[ML] Python error:', error);
        resolve(null);
      }
    });

    pythonProcess.on('error', (err) => {
      logger.debug('[ML] Python subprocess error:', err);
      resolve(null);
    });

    // Send input via stdin
    pythonProcess.stdin.write(JSON.stringify(input));
    pythonProcess.stdin.end();
  });
}

/**
 * Heuristic fallback prediction
 * Used when model not available
 */
function predictViaHeuristic(input: PredictionInput): number {
  let baseDuration = 5; // minutes

  // Regional factors
  const regionFactors: Record<string, number> = {
    North: 1.2,
    South: 0.9,
    East: 1.1,
    West: 0.8,
    Centre: 1.0,
  };

  const regionFactor = regionFactors[input.region] || 1.0;
  baseDuration *= regionFactor;

  // Hour of day factors (peak hours tend to have longer halts)
  const hourFactors: Record<number, number> = {
    6: 1.3,  // morning peak
    8: 1.5,
    9: 1.4,
    18: 1.4, // evening peak
    20: 1.2,
  };

  const hourFactor = hourFactors[input.hour] || 1.0;
  baseDuration *= hourFactor;

  // Add some randomness for realism
  const randomVariance = 0.8 + Math.random() * 0.4; // 0.8-1.2
  baseDuration *= randomVariance;

  return Math.round(Math.max(2, Math.min(60, baseDuration))); // Clamp 2-60 min
}

/**
 * Main prediction function
 */
export async function predictHaltDuration(
  input: PredictionInput
): Promise<PredictionResult> {
  const month = input.month || new Date().getMonth() + 1;

  // Validate input
  if (!input.region || input.hour < 0 || input.hour > 23) {
    logger.warn('[ML] Invalid prediction input:', input);
    return {
      predicted_duration_min: predictViaHeuristic(input),
      confidence: 0.3,
      method: 'fallback',
    };
  }

  // Try ML model first
  if (modelAvailable) {
    try {
      logger.debug('[ML] Using trained model for prediction:', {
        region: input.region,
        hour: input.hour,
      });

      // Attempt Python subprocess call
      const mlPrediction = await predictViaPython(input);

      if (mlPrediction !== null) {
        return {
          predicted_duration_min: Math.round(mlPrediction),
          confidence: Math.min(0.95, 0.7 + (modelMetadata.r2_score || 0) / 2),
          method: 'ml',
          model_info: {
            r2_score: modelMetadata.r2_score,
            mae: modelMetadata.mae,
          },
        };
      }
    } catch (err) {
      logger.debug('[ML] Model prediction failed, falling back to heuristic:', err);
    }
  }

  // Fallback to heuristic
  return {
    predicted_duration_min: predictViaHeuristic(input),
    confidence: 0.5,
    method: 'fallback',
  };
}

/**
 * Batch predictions for multiple trains
 */
export async function predictMultipleHalts(
  inputs: PredictionInput[]
): Promise<PredictionResult[]> {
  return Promise.all(inputs.map((input) => predictHaltDuration(input)));
}

/**
 * Get model status
 */
export function getModelStatus(): {
  available: boolean;
  metadata?: any;
} {
  if (!modelAvailable) {
    return {
      available: false,
    };
  }

  return {
    available: true,
    metadata: {
      trained_at: modelMetadata.trained_at,
      r2_score: modelMetadata.r2_score,
      training_samples: modelMetadata.training_samples,
      regions: modelMetadata.regions,
    },
  };
}

/**
 * Initialize on import
 */
initializeMLP().catch((err) => {
  logger.warn('[ML] Failed to initialize ML service:', err);
});
