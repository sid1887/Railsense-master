/**
 * ML Model Training Service
 * Handles model training, evaluation, and persistence
 */

export interface TrainingDataPoint {
  trainNumber: string;
  dayOfWeek: number;
  hourOfDay: number;
  seasonality: number;
  routeDistance: number;
  previousDelay: number;
  weatherCondition: number;
  trafficDensity: number;
  haltCount: number;
  signallingStatus: number;
  actualDelay: number; // The ground truth we're training on
  timestamp: number;
}

export interface TrainingMetrics {
  modelId: string;
  version: number;
  timestamp: number;
  accuracy: number; // R² score
  mse: number; // Mean Squared Error
  mae: number; // Mean Absolute Error
  rmse: number; // Root Mean Squared Error
  trainingSize: number;
  testSize: number;
  crossValidationScore: number;
  featureImportance: Record<string, number>;
  generalizedWell: boolean; // Test accuracy within 5% of train accuracy
}

export interface TrainedModel {
  id: string;
  version: number;
  timestamp: number;
  metrics: TrainingMetrics;
  weights: Record<string, number>;
  isActive: boolean;
  createdAt: number;
  status: 'training' | 'evaluating' | 'ready' | 'archived';
  trainingDuration: number; // ms
}

export interface TrainingJob {
  jobId: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  startedAt: number;
  completedAt: number | null;
  progress: number; // 0-100
  error: string | null;
  model: TrainedModel | null;
}

/**
 * ML Model Training Service
 * Singleton service for model training and management
 */
class MLModelTrainingService {
  private models: Map<string, TrainedModel> = new Map();
  private trainingJobs: Map<string, TrainingJob> = new Map();
  private trainingData: TrainingDataPoint[] = [];
  private activeModel: TrainedModel | null = null;
  private retrainingSchedule = {
    enabled: true,
    intervalDays: 7,
    lastRetraining: Date.now(),
    nextRetraining: Date.now() + 7 * 24 * 60 * 60 * 1000,
  };

  /**
   * Add training data point
   */
  addTrainingData(data: TrainingDataPoint) {
    this.trainingData.push(data);

    // Keep only recent data (max 10000 points)
    if (this.trainingData.length > 10000) {
      this.trainingData = this.trainingData.slice(-10000);
    }
  }

  /**
   * Add multiple training points
   */
  addBatchTrainingData(dataPoints: TrainingDataPoint[]) {
    dataPoints.forEach((point) => this.addTrainingData(point));
  }

  /**
   * Get available training data
   */
  getTrainingDataSize(): number {
    return this.trainingData.length;
  }

  /**
   * Complex linear regression training with regularization
   */
  trainModel(jobId: string): TrainedModel {
    const job = this.trainingJobs.get(jobId);
    if (!job) {
      throw new Error(`Training job ${jobId} not found`);
    }

    if (this.trainingData.length < 100) {
      throw new Error(
        `Insufficient training data: ${this.trainingData.length} points (need 100+)`
      );
    }

    const startTime = Date.now();
    const modelId = `model-${Date.now()}`;
    const version = this.models.size + 1;

    // Split data: 80% train, 20% test
    const shuffled = [...this.trainingData].sort(() => Math.random() - 0.5);
    const trainSize = Math.floor(shuffled.length * 0.8);
    const trainSet = shuffled.slice(0, trainSize);
    const testSet = shuffled.slice(trainSize);

    job.progress = 20;

    // Extract features and labels
    const features = trainSet.map((d) => this.extractFeatures(d));
    const labels = trainSet.map((d) => d.actualDelay);

    // Normalize features
    const { normalized: normalizedTrain, stats: normStats } =
      this.normalizeFeatures(features);

    // Initialize weights using normal distribution
    const featureCount = normalizedTrain[0].length;
    const weights: number[] = Array(featureCount)
      .fill(0)
      .map(() => Math.random() * 0.01);
    let intercept = 0;

    job.progress = 40;

    // Gradient descent training
    const learningRate = 0.01;
    const iterations = 100;
    const regularization = 0.01;

    for (let iter = 0; iter < iterations; iter++) {
      let totalError = 0;

      for (let i = 0; i < normalizedTrain.length; i++) {
        const prediction =
          intercept +
          normalizedTrain[i].reduce((sum, f, idx) => sum + f * weights[idx], 0);
        const error = prediction - labels[i];

        totalError += error * error;

        // Update weights with regularization
        for (let j = 0; j < weights.length; j++) {
          weights[j] -=
            learningRate * (error * normalizedTrain[i][j] + regularization * weights[j]);
        }

        intercept -= learningRate * error;
      }

      job.progress = 40 + (iter / iterations) * 40;
    }

    job.progress = 80;

    // Evaluate on test set
    const testMetrics = this.evaluateModel(
      testSet,
      weights,
      intercept,
      normStats
    );

    // Evaluate on train set
    const trainMetrics = this.evaluateModel(
      trainSet,
      weights,
      intercept,
      normStats
    );

    const generalizedWell =
      Math.abs(trainMetrics.mae - testMetrics.mae) / trainMetrics.mae < 0.05;

    // Feature importance (based on weight magnitude)
    const featureNames = [
      'dayOfWeek',
      'hourOfDay',
      'seasonality',
      'routeDistance',
      'previousDelay',
      'weatherCondition',
      'trafficDensity',
      'haltCount',
      'signallingStatus',
      'weather_traffic',
      'distance_halts',
      'hour_traffic',
    ];

    const featureImportance: Record<string, number> = {};
    weights.forEach((w, idx) => {
      featureImportance[featureNames[idx] || `feature_${idx}`] = Math.abs(w);
    });

    const model: TrainedModel = {
      id: modelId,
      version,
      timestamp: startTime,
      metrics: {
        modelId,
        version,
        timestamp: startTime,
        accuracy: testMetrics.r2,
        mse: testMetrics.mse,
        mae: testMetrics.mae,
        rmse: testMetrics.rmse,
        trainingSize: trainSize,
        testSize: testSet.length,
        crossValidationScore: trainMetrics.r2, // Use train R² as cross-validation proxy
        featureImportance,
        generalizedWell,
      },
      weights: featureNames.reduce(
        (acc: Record<string, number>, name, idx) => {
          acc[name] = weights[idx] || 0;
          return acc;
        },
        { intercept }
      ),
      isActive: false,
      createdAt: startTime,
      status: 'ready',
      trainingDuration: Date.now() - startTime,
    };

    job.progress = 100;
    job.status = 'completed';
    job.completedAt = Date.now();
    job.model = model;

    // Store model
    this.models.set(modelId, model);
    return model;
  }

  /**
   * Extract features from data point
   */
  private extractFeatures(data: TrainingDataPoint): number[] {
    return [
      data.dayOfWeek,
      data.hourOfDay,
      data.seasonality,
      data.routeDistance,
      data.previousDelay,
      data.weatherCondition,
      data.trafficDensity,
      data.haltCount,
      data.signallingStatus,
      // Interaction terms
      data.weatherCondition * data.trafficDensity,
      data.routeDistance * data.haltCount,
      data.hourOfDay * data.trafficDensity,
    ];
  }

  /**
   * Normalize features to zero mean, unit variance
   */
  private normalizeFeatures(
    features: number[][]
  ): {
    normalized: number[][];
    stats: Array<{ mean: number; std: number }>;
  } {
    const stats: Array<{ mean: number; std: number }> = [];
    const normalized: number[][] = [];

    for (let col = 0; col < features[0].length; col++) {
      const column = features.map((row) => row[col]);
      const mean = column.reduce((a, b) => a + b) / column.length;
      const variance =
        column.reduce((a, b) => a + (b - mean) ** 2, 0) / column.length;
      const std = Math.sqrt(variance || 1);

      stats.push({ mean, std });
    }

    for (let i = 0; i < features.length; i++) {
      const normalizedRow: number[] = [];
      for (let j = 0; j < features[i].length; j++) {
        const stat = stats[j];
        normalizedRow.push((features[i][j] - stat.mean) / stat.std);
      }
      normalized.push(normalizedRow);
    }

    return { normalized, stats };
  }

  /**
   * Evaluate model performance
   */
  private evaluateModel(
    data: TrainingDataPoint[],
    weights: number[],
    intercept: number,
    normStats: Array<{ mean: number; std: number }>
  ): {
    mse: number;
    mae: number;
    rmse: number;
    r2: number;
  } {
    let mse = 0;
    let mae = 0;
    const meanLabel = data.reduce((sum, d) => sum + d.actualDelay, 0) / data.length;
    let ssTotal = 0;
    let ssRes = 0;

    for (const dataPoint of data) {
      const features = this.extractFeatures(dataPoint);

      // Normalize
      let prediction = intercept;
      for (let i = 0; i < features.length; i++) {
        const normalized = (features[i] - normStats[i].mean) / normStats[i].std;
        prediction += normalized * weights[i];
      }

      const error = prediction - dataPoint.actualDelay;
      mse += error * error;
      mae += Math.abs(error);
      ssRes += error * error;
      ssTotal += (dataPoint.actualDelay - meanLabel) ** 2;
    }

    mse /= data.length;
    mae /= data.length;
    const rmse = Math.sqrt(mse);
    const r2 = 1 - ssRes / (ssTotal || 1);

    return { mse, mae, rmse, r2 };
  }

  /**
   * Start a training job
   */
  startTrainingJob(): TrainingJob {
    const jobId = `job-${Date.now()}`;
    const job: TrainingJob = {
      jobId,
      status: 'running',
      startedAt: Date.now(),
      completedAt: null,
      progress: 0,
      error: null,
      model: null,
    };

    this.trainingJobs.set(jobId, job);

    // Simulate async training
    setTimeout(() => {
      try {
        this.trainModel(jobId);
      } catch (error) {
        job.status = 'failed';
        job.error = error instanceof Error ? error.message : 'Unknown error';
        job.completedAt = Date.now();
      }
    }, 100);

    return job;
  }

  /**
   * Get training job status
   */
  getJobStatus(jobId: string): TrainingJob | null {
    return this.trainingJobs.get(jobId) || null;
  }

  /**
   * Get all models
   */
  getAllModels(): TrainedModel[] {
    return Array.from(this.models.values());
  }

  /**
   * Get model by ID
   */
  getModel(modelId: string): TrainedModel | null {
    return this.models.get(modelId) || null;
  }

  /**
   * Activate a model
   */
  activateModel(modelId: string): boolean {
    const model = this.models.get(modelId);
    if (!model) return false;

    // Deactivate previous active model
    if (this.activeModel) {
      this.activeModel.isActive = false;
    }

    model.isActive = true;
    this.activeModel = model;
    return true;
  }

  /**
   * Get active model
   */
  getActiveModel(): TrainedModel | null {
    return this.activeModel;
  }

  /**
   * Delete model
   */
  deleteModel(modelId: string): boolean {
    if (this.activeModel?.id === modelId) {
      this.activeModel = null;
    }
    return this.models.delete(modelId);
  }

  /**
   * Get retraining schedule
   */
  getRetrainingSchedule() {
    return {
      ...this.retrainingSchedule,
      daysUntilNextRetrain: Math.ceil(
        (this.retrainingSchedule.nextRetraining - Date.now()) / (24 * 60 * 60 * 1000)
      ),
      isScheduled: this.retrainingSchedule.enabled,
    };
  }

  /**
   * Update retraining schedule
   */
  updateRetrainingSchedule(config: Partial<typeof this.retrainingSchedule>) {
    this.retrainingSchedule = {
      ...this.retrainingSchedule,
      ...config,
    };
  }

  /**
   * Check if retraining is due
   */
  isRetrainingDue(): boolean {
    if (!this.retrainingSchedule.enabled) return false;
    return Date.now() >= this.retrainingSchedule.nextRetraining;
  }

  /**
   * Get training history
   */
  getTrainingHistory(): TrainingMetrics[] {
    return Array.from(this.models.values()).map((m) => m.metrics);
  }

  /**
   * Clear old training data (keep only recent)
   */
  clearOldTrainingData(daysToKeep: number = 30) {
    const cutoffTime = Date.now() - daysToKeep * 24 * 60 * 60 * 1000;
    this.trainingData = this.trainingData.filter((d) => d.timestamp > cutoffTime);
  }

  /**
   * Export model for persistence
   */
  exportModel(modelId: string): string {
    const model = this.models.get(modelId);
    if (!model) throw new Error(`Model ${modelId} not found`);
    return JSON.stringify(model);
  }

  /**
   * Import model from persistence
   */
  importModel(modelData: string): TrainedModel {
    const model: TrainedModel = JSON.parse(modelData);
    this.models.set(model.id, model);
    return model;
  }

  /**
   * Get model comparison
   */
  compareModels(modelId1: string, modelId2: string) {
    const m1 = this.models.get(modelId1);
    const m2 = this.models.get(modelId2);

    if (!m1 || !m2) return null;

    return {
      model1: { id: m1.id, r2: m1.metrics.accuracy, mae: m1.metrics.mae },
      model2: { id: m2.id, r2: m2.metrics.accuracy, mae: m2.metrics.mae },
      improvement: {
        r2Diff: m2.metrics.accuracy - m1.metrics.accuracy,
        maeDiff: m1.metrics.mae - m2.metrics.mae, // Lower MAE is better
        maeDiffPercent: ((m1.metrics.mae - m2.metrics.mae) / m1.metrics.mae) * 100,
      },
      recommendation:
        m2.metrics.accuracy > m1.metrics.accuracy &&
        m2.metrics.mae < m1.metrics.mae
          ? `Model ${m2.id} is better`
          : `Models are similar`,
    };
  }
}

// Export singleton instance
export const mlModelTrainingService = new MLModelTrainingService();
