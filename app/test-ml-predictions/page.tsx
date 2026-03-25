'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Brain, TrendingUp, Zap, BarChart3, RefreshCw } from 'lucide-react';
import RailLoader from '@/components/RailLoader';

interface MLPredictionResponse {
  train: string;
  trainName: string;
  timestamp: string;
  forecastDelay: number;
  eta: string;
  riskLevel: string;
  confidence: number;
  models: {
    heuristic: { predictedDelay: number; confidence: number };
    historical: { predictedDelay: number; confidence: number };
    ml: {
      predictedDelay: number;
      confidence: number;
      executionTime: number;
      factors: Array<{ name: string; impact: number; weight: number }>;
    } | null;
  };
  ensemble: {
    modelConsensus: boolean;
    recommendedModel: string;
    modelAgreement: string;
  };
  analysis: {
    primaryFactors: string[];
    riskFactors: string[];
  };
  system: {
    mlModelAvailable: boolean;
    mlModelVersion: string;
    mlModelMetadata: any;
  };
}

/**
 * ML Model Testing & Demonstration Page
 */
export default function MLPredictionTestPage() {
  const [selectedTrain, setSelectedTrain] = useState('12001');
  const [prediction, setPrediction] = useState<MLPredictionResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const testTrains = ['12001', '16016', '12345', '15001'];

  const fetchPrediction = async (trainNumber: string) => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/predict-ml?train=${trainNumber}`);

      if (!res.ok) {
        throw new Error(`API error: ${res.status}`);
      }

      const data = await res.json();
      setPrediction(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch prediction');
      setPrediction(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPrediction(selectedTrain);
  }, [selectedTrain]);

  return (
    <div className="min-h-screen bg-dark-bg p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-4xl font-bold text-text-primary mb-2 flex items-center gap-3">
            <Brain size={40} className="text-indigo-500" />
            ML Prediction Ensemble
          </h1>
          <p className="text-text-secondary">
            Multi-model consensus: Heuristic + Historical + Machine Learning
          </p>
        </motion.div>

        {/* Train Selector */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-4 gap-3 mb-8"
        >
          {testTrains.map((train) => (
            <motion.button
              key={train}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setSelectedTrain(train)}
              className={`px-4 py-3 rounded-lg border transition-all font-semibold ${
                selectedTrain === train
                  ? 'border-accent-blue bg-accent-blue/10 text-accent-blue'
                  : 'border-dark-border hover:border-accent-blue/50 text-text-secondary hover:text-text-primary'
              }`}
            >
              Train {train}
            </motion.button>
          ))}
        </motion.div>

        {/* Loading State */}
        {loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center justify-center py-12 gap-3 text-text-secondary"
          >
            <RailLoader size="sm" />
            Loading ML predictions...
          </motion.div>
        )}

        {/* Error State */}
        {error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-red-900/20 border border-red-700 rounded-lg p-4 text-red-200 mb-8"
          >
            {error}
          </motion.div>
        )}

        {/* Prediction Results */}
        {prediction && !loading && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-6"
          >
            {/* Main Prediction Card */}
            <div className="bg-dark-card border border-dark-border rounded-lg p-6">
              <h2 className="text-xl font-semibold text-text-primary mb-4">
                {prediction.trainName}
              </h2>

              <div className="grid grid-cols-4 gap-4 mb-6">
                {/* Forecast Delay */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3 }}
                  className="bg-dark-bg rounded-lg p-4 border border-dark-border"
                >
                  <p className="text-xs text-text-secondary mb-2">Forecast Delay</p>
                  <p className="text-3xl font-bold text-accent-blue">{prediction.forecastDelay}m</p>
                </motion.div>

                {/* ETA */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.35 }}
                  className="bg-dark-bg rounded-lg p-4 border border-dark-border"
                >
                  <p className="text-xs text-text-secondary mb-2">Estimated Arrival</p>
                  <p className="text-sm font-semibold text-text-primary">
                    {new Date(prediction.eta).toLocaleTimeString()}
                  </p>
                </motion.div>

                {/* Confidence */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.4 }}
                  className="bg-dark-bg rounded-lg p-4 border border-dark-border"
                >
                  <p className="text-xs text-text-secondary mb-2">Confidence</p>
                  <p className="text-3xl font-bold text-green-400">{prediction.confidence}%</p>
                </motion.div>

                {/* Risk Level */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.45 }}
                  className="bg-dark-bg rounded-lg p-4 border border-dark-border"
                >
                  <p className="text-xs text-text-secondary mb-2">Risk Level</p>
                  <p
                    className={`text-lg font-bold ${
                      prediction.riskLevel === 'high'
                        ? 'text-red-400'
                        : prediction.riskLevel === 'medium'
                          ? 'text-orange-400'
                          : 'text-green-400'
                    }`}
                  >
                    {prediction.riskLevel.toUpperCase()}
                  </p>
                </motion.div>
              </div>

              {/* Consensus Message */}
              <div className="p-3 bg-indigo-900/20 border border-indigo-700/50 rounded-lg">
                <p className="text-sm text-indigo-300 flex items-center gap-2">
                  <Brain size={16} />
                  {prediction.ensemble.modelAgreement}
                </p>
              </div>
            </div>

            {/* Model Predictions Comparison */}
            <div className="grid grid-cols-3 gap-4">
              {/* Heuristic */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="bg-dark-card border border-orange-700/30 rounded-lg p-4 space-y-3"
              >
                <div className="flex items-center gap-2 text-orange-400">
                  <Zap size={18} />
                  <h3 className="font-semibold">Heuristic Model</h3>
                </div>
                <div>
                  <p className="text-xs text-text-secondary">Predicted Delay</p>
                  <p className="text-2xl font-bold text-text-primary">
                    {prediction.models.heuristic.predictedDelay}m
                  </p>
                </div>
                <div>
                  <p className="text-xs text-text-secondary">Confidence</p>
                  <p className="text-lg font-semibold text-orange-400">
                    {prediction.models.heuristic.confidence}%
                  </p>
                </div>
              </motion.div>

              {/* Historical */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.55 }}
                className="bg-dark-card border border-purple-700/30 rounded-lg p-4 space-y-3"
              >
                <div className="flex items-center gap-2 text-purple-400">
                  <BarChart3 size={18} />
                  <h3 className="font-semibold">Historical</h3>
                </div>
                <div>
                  <p className="text-xs text-text-secondary">Predicted Delay</p>
                  <p className="text-2xl font-bold text-text-primary">
                    {prediction.models.historical.predictedDelay}m
                  </p>
                </div>
                <div>
                  <p className="text-xs text-text-secondary">Confidence</p>
                  <p className="text-lg font-semibold text-purple-400">
                    {prediction.models.historical.confidence}%
                  </p>
                </div>
              </motion.div>

              {/* ML Model */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className={`bg-dark-card border rounded-lg p-4 space-y-3 ${
                  prediction.models.ml
                    ? 'border-indigo-700/30'
                    : 'border-gray-700/30 opacity-60'
                }`}
              >
                <div className="flex items-center gap-2 text-indigo-400">
                  <Brain size={18} />
                  <h3 className="font-semibold">ML Model</h3>
                </div>
                {prediction.models.ml ? (
                  <>
                    <div>
                      <p className="text-xs text-text-secondary">Predicted Delay</p>
                      <p className="text-2xl font-bold text-text-primary">
                        {prediction.models.ml.predictedDelay}m
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-text-secondary">Confidence</p>
                      <p className="text-lg font-semibold text-indigo-400">
                        {prediction.models.ml.confidence}%
                      </p>
                    </div>
                    <div className="text-xs text-text-secondary">
                      Execution: {prediction.models.ml.executionTime}ms
                    </div>
                  </>
                ) : (
                  <p className="text-xs text-text-secondary">Model not available</p>
                )}
              </motion.div>
            </div>

            {/* ML Factors (if available) */}
            {prediction.models.ml && prediction.models.ml.factors.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.65 }}
                className="bg-dark-card border border-dark-border rounded-lg p-4"
              >
                <h3 className="font-semibold text-text-primary mb-3 flex items-center gap-2">
                  <TrendingUp size={18} className="text-indigo-500" />
                  Top ML Factors
                </h3>
                <div className="space-y-2">
                  {prediction.models.ml.factors.map((factor, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 bg-dark-bg rounded">
                      <span className="text-sm text-text-secondary">{factor.name}</span>
                      <div className="flex items-center gap-3">
                        <div className="w-32 bg-dark-border rounded h-2">
                          <div
                            className="h-full rounded bg-indigo-500"
                            style={{
                              width: `${Math.min(100, Math.abs(factor.weight * 100))}%`,
                            }}
                          />
                        </div>
                        <span
                          className={`text-sm font-semibold ${
                            factor.impact >= 0 ? 'text-red-400' : 'text-green-400'
                          }`}
                        >
                          {factor.impact > 0 ? '+' : ''}{factor.impact}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* System Info */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
              className="bg-dark-card border border-dark-border rounded-lg p-4 text-xs text-text-secondary space-y-1"
            >
              <p>
                <strong>ML Model:</strong>{' '}
                {prediction.system.mlModelAvailable
                  ? `v${prediction.system.mlModelVersion}`
                  : 'Not Available'}
              </p>
              <p>
                <strong>Prediction Method:</strong> Multi-Model Ensemble
              </p>
              <p>
                <strong>Timestamp:</strong> {new Date(prediction.timestamp).toLocaleTimeString()}
              </p>
            </motion.div>
          </motion.div>
        )}

        {/* Info Section */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="mt-12 bg-indigo-900/20 border border-indigo-700/30 rounded-lg p-6 space-y-3"
        >
          <h3 className="text-lg font-semibold text-indigo-300 mb-3">ML Ensemble Architecture</h3>
          <ul className="text-text-secondary text-sm space-y-2 list-disc list-inside">
            <li>
              <strong>Heuristic Model:</strong> Rules-based prediction using traffic, weather, and
              distance
            </li>
            <li>
              <strong>Historical Model:</strong> Pattern-based using day/time/season statistics
            </li>
            <li>
              <strong>ML Model:</strong> Linear regression with feature interactions and normalization
            </li>
            <li>
              <strong>Consensus:</strong> Weighted average of all models, with model agreement
              detection
            </li>
            <li>
              <strong>Fallback:</strong> If ML unavailable, uses heuristic + historical
            </li>
          </ul>
        </motion.div>
      </div>
    </div>
  );
}
