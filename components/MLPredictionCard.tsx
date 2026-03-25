'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  TrendingDown,
  TrendingUp,
  Brain,
  Zap,
  BarChart3,
  CheckCircle,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';

interface MLPredictionComparison {
  heuristic: {
    delay: number;
    confidence: number;
  };
  historical: {
    delay: number;
    confidence: number;
  };
  ml: {
    delay: number;
    confidence: number;
  } | null;
  modelConsensus: boolean;
  recommendedModel: 'heuristic' | 'historical' | 'ml';
  forecastDelay: number;
}

interface MLPredictionCardProps {
  trainNumber: string;
  comparison: MLPredictionComparison;
  showDetails?: boolean;
}

/**
 * ML Prediction Card Component
 * Displays ML vs Heuristic vs Historical predictions
 */
export default function MLPredictionCard({
  trainNumber,
  comparison,
  showDetails = true,
}: MLPredictionCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [selectedModel, setSelectedModel] = useState<'ml' | 'heuristic' | 'historical'>('ml');

  const getModelColor = (model: 'ml' | 'heuristic' | 'historical') => {
    switch (model) {
      case 'ml':
        return { bg: '#6366f1', light: 'rgba(99, 102, 241, 0.1)' };
      case 'heuristic':
        return { bg: '#f59e0b', light: 'rgba(245, 158, 11, 0.1)' };
      case 'historical':
        return { bg: '#8b5cf6', light: 'rgba(139, 92, 246, 0.1)' };
    }
  };

  const getRecommendationText = () => {
    if (comparison.modelConsensus) {
      return 'All models agree on prediction';
    } else {
      const modelName =
        comparison.recommendedModel.charAt(0).toUpperCase() +
        comparison.recommendedModel.slice(1);
      return `${modelName} model most confident`;
    }
  };

  const predictions = [
    { model: 'ml', data: comparison.ml, label: 'ML Model', icon: Brain },
    { model: 'heuristic', data: comparison.heuristic, label: 'Heuristic', icon: Zap },
    { model: 'historical', data: comparison.historical, label: 'Historical', icon: BarChart3 },
  ].filter((p) => p.data !== null) as any[];

  const selectedData =
    selectedModel === 'ml' && !comparison.ml
      ? comparison.heuristic
      : selectedModel === 'ml'
        ? comparison.ml
        : selectedModel === 'heuristic'
          ? comparison.heuristic
          : comparison.historical;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-lg border border-dark-border bg-dark-card p-5 space-y-4"
    >
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
            <Brain size={16} className="text-indigo-500" />
            Machine Learning Prediction
          </h3>
          <p className="text-xs text-text-secondary mt-1">
            Train {trainNumber} • Multi-model consensus
          </p>
        </div>

        {comparison.modelConsensus ? (
          <div className="px-2 py-1 rounded bg-green-900/30 border border-green-700">
            <CheckCircle size={14} className="text-green-400" />
          </div>
        ) : (
          <div className="px-2 py-1 rounded bg-yellow-900/30 border border-yellow-700">
            <AlertCircle size={14} className="text-yellow-400" />
          </div>
        )}
      </div>

      {/* Consensus Badge */}
      <div
        className="px-3 py-2 rounded-lg text-xs text-text-secondary"
        style={{ backgroundColor: 'rgba(99, 102, 241, 0.1)' }}
      >
        <p className="flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-indigo-500"></span>
          {getRecommendationText()}
        </p>
      </div>

      {/* Model Tabs */}
      {showDetails && (
        <div className="flex gap-2 p-2 bg-dark-bg rounded-lg">
          {predictions.map(({ model, label, icon: Icon }) => (
            <motion.button
              key={model}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setSelectedModel(model as any)}
              className={`flex-1 px-3 py-2 rounded text-xs font-semibold transition-all flex items-center justify-center gap-1 ${
                selectedModel === model
                  ? 'bg-dark-card border border-accent-blue/50'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              <Icon size={12} />
              {label}
            </motion.button>
          ))}
        </div>
      )}

      {/* Selected Model Details */}
      {selectedData && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="space-y-3"
        >
          {/* Delay Prediction */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs text-text-secondary">Predicted Delay</span>
              <span className="text-lg font-bold text-text-primary">
                {selectedData.delay}
                <span className="text-sm text-text-secondary ml-1">min</span>
              </span>
            </div>

            {/* Delay Visualization */}
            <div className="w-full bg-dark-bg rounded-full h-2 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(100, (selectedData.delay / 180) * 100)}%` }}
                transition={{ duration: 0.5 }}
                className={`h-full ${
                  selectedData.delay > 30
                    ? 'bg-red-500'
                    : selectedData.delay > 15
                      ? 'bg-orange-500'
                      : 'bg-green-500'
                }`}
              />
            </div>
          </div>

          {/* Confidence Score */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs text-text-secondary">Confidence</span>
              <span className={`text-sm font-semibold ${selectedData.confidence > 75 ? 'text-green-400' : selectedData.confidence > 50 ? 'text-yellow-400' : 'text-orange-400'}`}>
                {selectedData.confidence}%
              </span>
            </div>

            <div className="w-full bg-dark-bg rounded-full h-2 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${selectedData.confidence}%` }}
                transition={{ duration: 0.5 }}
                className="h-full bg-indigo-500"
              />
            </div>
          </div>

          {/* Risk Level */}
          <div className="flex items-center justify-between px-3 py-2 bg-dark-bg rounded-lg">
            <span className="text-xs text-text-secondary">Risk Level</span>
            <span
              className={`text-xs font-semibold px-2 py-1 rounded ${
                selectedData.delay > 30
                  ? 'bg-red-900/30 border border-red-700 text-red-200'
                  : selectedData.delay > 15
                    ? 'bg-yellow-900/30 border border-yellow-700 text-yellow-200'
                    : 'bg-green-900/30 border border-green-700 text-green-200'
              }`}
            >
              {selectedData.delay > 30
                ? 'HIGH'
                : selectedData.delay > 15
                  ? 'MEDIUM'
                  : 'LOW'}
            </span>
          </div>
        </motion.div>
      )}

      {/* Comparison Grid (if expanded) */}
      {showDetails && (
        <motion.div
          initial={expanded ? { opacity: 0, height: 0 } : {}}
          animate={expanded ? { opacity: 1, height: 'auto' } : {}}
          exit={{ opacity: 0, height: 0 }}
          className="space-y-2"
        >
          {expanded && (
            <div className="pt-3 space-y-2 border-t border-dark-border">
              {predictions.map(({ model, data, label }) => (
                <div
                  key={model}
                  className="p-3 rounded-lg bg-dark-bg space-y-1"
                  style={{
                    borderLeft: `3px solid ${getModelColor(model).bg}`,
                  }}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-text-primary">
                      {label}
                    </span>
                    <span className="text-sm font-bold text-text-primary">
                      {data.delay}m
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-text-secondary">Confidence</span>
                    <span className="text-xs text-text-secondary">{data.confidence}%</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      )}

      {/* Toggle Details */}
      {showDetails && (
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setExpanded(!expanded)}
          className="w-full py-2 px-3 text-xs font-semibold text-text-secondary hover:text-text-primary rounded border border-dark-border hover:border-accent-blue/50 transition-all"
        >
          {expanded ? 'Hide Details' : 'Compare Models'}
        </motion.button>
      )}

      {/* Info Tooltip */}
      {!comparison.ml && (
        <div className="px-3 py-2 bg-yellow-900/20 border border-yellow-700/30 rounded text-xs text-yellow-200 flex items-start gap-2">
          <HelpCircle size={14} className="mt-0.5 shrink-0" />
          <span>ML model not available. Using heuristic & historical predictions.</span>
        </div>
      )}
    </motion.div>
  );
}
