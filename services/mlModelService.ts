/**
 * ML Model Service
 * Manages machine learning model loading, prediction, and evaluation
 */

import fs from 'fs';
import path from 'path';

export interface TrainingData {
  trainNumber: string;
  dayOfWeek: number;
  hourOfDay: number;
  seasonality: number; // 0-3 (Q1-Q4)
  routeDistance: number;
  previousDelay: number;
  weatherCondition: number; // 0-5 coded
  trafficDensity: number; // 0-100
  haltCount: number;
  signallingStatus: number; // 0-2
}

export interface MLPrediction {
  predictedDelay: number; // in minutes
  confidence: number; // 0-100
  factors: Array<{
    name: string;
    impact: number; // -100 to +100
    weight: number; // 0-1
  }>;
  modelVersion: string;
  executionTime: number; // ms
}

interface ModelWeights {
  intercept: number;
  dayOfWeek: number;
  hourOfDay: number;
  seasonality: number;
  routeDistance: number;
  previousDelay: number;
  weatherCondition: number;
  trafficDensity: number;
  haltCount: number;
  signallingStatus: number;
  interactions: Record<string, number>; // feature interactions
}

class MLModelService {
  private modelWeights: ModelWeights | null = null;
  private modelVersion = '1.0';
  private scalingParams = {
    dayOfWeek: { mean: 3.5, std: 2 },
    hourOfDay: { mean: 11.5, std: 7 },
    seasonality: { mean: 1.5, std: 1.1 },
    routeDistance: { mean: 450, std: 200 },
    previousDelay: { mean: 8, std: 12 },
    weatherCondition: { mean: 2, std: 1.5 },
    trafficDensity: { mean: 45, std: 25 },
    haltCount: { mean: 4, std: 2 },
    signallingStatus: { mean: 1, std: 0.8 },
  };

  constructor() {
    this.initializeModel();
  }

  /**
   * Initialize the model with pre-trained weights
   */
  private initializeModel(): void {
    try {
      // In a real implementation, this would load from a saved model file or API
      // For now, using reasonable default weights based on domain knowledge
      this.modelWeights = {
        intercept: 5, // Base 5 minute delay
        dayOfWeek: 0.5, // 0.5 min per day (weekend effect)
        hourOfDay: 1.2, // 1.2 min per hour (peak hours)
        seasonality: -0.8, // -0.8 min per season (summer faster)
        routeDistance: 0.008, // 0.008 min per km
        previousDelay: 0.6, // 60% carry-forward effect
        weatherCondition: 3, // 3 min per weather level
        trafficDensity: 0.3, // 0.3 min per density unit
        haltCount: 2, // 2 min per halt
        signallingStatus: 4, // 4 min per signalling issue
        interactions: {
          weatherTraffic: 0.05,
          distanceHalts: 0.002,
          hourPeakTraffic: 0.15,
        },
      };

      console.log('[MLModelService] Model initialized with v' + this.modelVersion);
    } catch (error) {
      console.error('[MLModelService] Failed to initialize model:', error);
      this.modelWeights = null;
    }
  }

  /**
   * Normalize feature value
   */
  private normalize(
    value: number,
    feature: keyof typeof this.scalingParams
  ): number {
    const params = this.scalingParams[feature];
    return (value - params.mean) / params.std;
  }

  /**
   * Make prediction using linear regression model
   */
  predict(data: TrainingData): MLPrediction {
    const startTime = Date.now();

    if (!this.modelWeights) {
      return {
        predictedDelay: 0,
        confidence: 0,
        factors: [],
        modelVersion: this.modelVersion,
        executionTime: 0,
      };
    }

    const weights = this.modelWeights;

    // Normalize features
    const normDOW = this.normalize(data.dayOfWeek, 'dayOfWeek');
    const normHOD = this.normalize(data.hourOfDay, 'hourOfDay');
    const normSeason = this.normalize(data.seasonality, 'seasonality');
    const normDistance = this.normalize(data.routeDistance, 'routeDistance');
    const normPrevDelay = this.normalize(data.previousDelay, 'previousDelay');
    const normWeather = this.normalize(data.weatherCondition, 'weatherCondition');
    const normTraffic = this.normalize(data.trafficDensity, 'trafficDensity');
    const normHalts = this.normalize(data.haltCount, 'haltCount');
    const normSignal = this.normalize(data.signallingStatus, 'signallingStatus');

    // Linear combination of features
    let prediction =
      weights.intercept +
      weights.dayOfWeek * normDOW +
      weights.hourOfDay * normHOD +
      weights.seasonality * normSeason +
      weights.routeDistance * normDistance +
      weights.previousDelay * normPrevDelay +
      weights.weatherCondition * normWeather +
      weights.trafficDensity * normTraffic +
      weights.haltCount * normHalts +
      weights.signallingStatus * normSignal;

    // Add interactions
    prediction += weights.interactions.weatherTraffic * normWeather * normTraffic;
    prediction += weights.interactions.distanceHalts * normDistance * normHalts;
    prediction += weights.interactions.hourPeakTraffic * normHOD * normTraffic;

    // Ensure prediction is positive and reasonable (0-180 minutes)
    const finalPrediction = Math.max(0, Math.min(180, prediction));

    // Calculate confidence based on model uncertainty
    const confidence = this.calculateConfidence(data, finalPrediction);

    // Extract feature impacts
    const factors = this.extractFactors(data, weights);

    const executionTime = Date.now() - startTime;

    return {
      predictedDelay: Math.round(finalPrediction * 10) / 10,
      confidence: Math.round(confidence),
      factors,
      modelVersion: this.modelVersion,
      executionTime,
    };
  }

  /**
   * Calculate confidence score (0-100)
   */
  private calculateConfidence(data: TrainingData, prediction: number): number {
    // Confidence decreases with extreme values
    let confidence = 85; // Base confidence

    // Reduce confidence for unusual conditions
    if (data.weatherCondition > 3) confidence -= 10;
    if (data.trafficDensity > 80) confidence -= 5;
    if (data.haltCount > 8) confidence -= 5;

    // Increase confidence for typical conditions
    if (data.trafficDensity < 30) confidence += 5;
    if (data.signallingStatus === 2) confidence += 3;

    return Math.max(30, Math.min(95, confidence));
  }

  /**
   * Extract and rank most important factors
   */
  private extractFactors(
    data: TrainingData,
    weights: ModelWeights
  ): MLPrediction['factors'] {
    const impacts = [
      {
        name: 'Previous Delay',
        impact: weights.previousDelay * data.previousDelay * 100,
        weight: Math.abs(weights.previousDelay),
      },
      {
        name: 'Hour of Day',
        impact: weights.hourOfDay * (data.hourOfDay - 11.5) * 5,
        weight: Math.abs(weights.hourOfDay),
      },
      {
        name: 'Traffic Density',
        impact: weights.trafficDensity * (data.trafficDensity - 45),
        weight: Math.abs(weights.trafficDensity),
      },
      {
        name: 'Signalling Status',
        impact: weights.signallingStatus * data.signallingStatus * 3,
        weight: Math.abs(weights.signallingStatus),
      },
      {
        name: 'Weather Condition',
        impact: weights.weatherCondition * data.weatherCondition * 2,
        weight: Math.abs(weights.weatherCondition),
      },
      {
        name: 'Halt Count',
        impact: weights.haltCount * data.haltCount,
        weight: Math.abs(weights.haltCount),
      },
    ];

    // Sort by weight and return top 3
    return impacts
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 3)
      .map((factor) => ({
        name: factor.name,
        impact: Math.round(factor.impact),
        weight: Math.round(factor.weight * 100) / 100,
      }));
  }

  /**
   * Get model version
   */
  getVersion(): string {
    return this.modelVersion;
  }

  /**
   * Check if model is available
   */
  isAvailable(): boolean {
    return this.modelWeights !== null;
  }

  /**
   * Get model metadata
   */
  getMetadata() {
    return {
      version: this.modelVersion,
      type: 'Linear Regression',
      features: 9,
      interactions: 3,
      isAvailable: this.isAvailable(),
      scalingParams: this.scalingParams,
    };
  }
}

// Export singleton
export const mlModelService = new MLModelService();
