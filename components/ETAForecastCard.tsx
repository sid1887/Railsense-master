'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, TrendingUp, AlertTriangle, CheckCircle2, Zap } from 'lucide-react';
import PredictionConfidenceIndicator from './PredictionConfidenceIndicator';
import RailLoader from '@/components/RailLoader';

interface ETAForecastCardProps {
  trainNumber: string;
  scheduledArrival?: string;
  currentDelay?: number;
  destination?: string;
}

interface PredictionData {
  train: {
    trainNumber: string;
    trainName: string;
  };
  currentStatus: {
    speed: number;
    currentDelay: number;
    distanceToDestination: number;
    stationsRemaining: number;
  };
  prediction: {
    forecastDelay: number;
    confidence: number;
    eta: string;
    method: 'heuristic' | 'historical' | 'ml';
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
  };
  analysis: {
    factors: Array<{
      name: string;
      impact: number;
      direction: 'positive' | 'negative' | 'neutral';
    }>;
    alertLevel: string;
  };
  recommendations: string[];
}

/**
 * ETAForecastCard Component
 * Displays AI-powered ETA predictions with confidence and recommendations
 * Integrates with /api/predict endpoint
 */
export default function ETAForecastCard({
  trainNumber,
  scheduledArrival,
  currentDelay = 0,
  destination,
}: ETAForecastCardProps) {
  const [prediction, setPrediction] = useState<PredictionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const fetchPrediction = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`/api/predict?train=${trainNumber}`);
        if (!response.ok) {
          throw new Error(`Prediction API error: ${response.status}`);
        }

        const data = await response.json();
        setPrediction(data);
      } catch (err) {
        console.error('Failed to fetch prediction:', err);
        setError(err instanceof Error ? err.message : 'Failed to load prediction');
        setPrediction(null);
      } finally {
        setLoading(false);
      }
    };

    if (trainNumber) {
      fetchPrediction();
      const interval = setInterval(fetchPrediction, 60000); // Refresh every 60s
      return () => clearInterval(interval);
    }
  }, [trainNumber]);

  if (loading && !prediction) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-lg border border-accent-blue/20 bg-accent-blue/5 p-6"
      >
        <div className="flex items-center gap-3">
          <RailLoader size="xs" />
          <p className="text-sm text-text-secondary">Loading prediction...</p>
        </div>
      </motion.div>
    );
  }

  if (error || !prediction) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-lg border border-alert-orange/30 bg-alert-orange/10 p-6"
      >
        <div className="flex items-start gap-3">
          <AlertTriangle size={20} className="text-alert-orange mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-alert-orange">Prediction Unavailable</p>
            <p className="text-xs text-text-secondary mt-1">{error || 'Unable to generate ETA forecast'}</p>
          </div>
        </div>
      </motion.div>
    );
  }

  const { prediction: pred, currentStatus, recommendations, analysis } = prediction;
  const scheduledTime = scheduledArrival ? new Date(scheduledArrival) : null;
  const predictedTime = new Date(pred.eta);
  const timeDiff = scheduledTime ? Math.round((predictedTime.getTime() - scheduledTime.getTime()) / 60000) : null;
  const speedPercent = Math.min(100, Math.max(0, Math.round((currentStatus.speed / 130) * 100)));
  const distancePercent = Math.min(100, Math.max(0, 100 - Math.round((currentStatus.distanceToDestination / 1200) * 100)));
  const stationPercent = Math.min(100, Math.max(0, 100 - Math.round((currentStatus.stationsRemaining / 40) * 100)));

  const getETAColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'critical':
        return { bg: 'rgba(230, 57, 70, 0.1)', border: 'rgba(230, 57, 70, 0.3)', text: '#e63946' };
      case 'high':
        return { bg: 'rgba(252, 163, 17, 0.1)', border: 'rgba(252, 163, 17, 0.3)', text: '#fca311' };
      case 'medium':
        return { bg: 'rgba(88, 199, 250, 0.1)', border: 'rgba(88, 199, 250, 0.3)', text: '#58c7fa' };
      default:
        return { bg: 'rgba(29, 209, 176, 0.1)', border: 'rgba(29, 209, 176, 0.3)', text: '#1dd1b0' };
    }
  };

  const colors = getETAColor(pred.riskLevel);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="rounded-lg border p-6 cursor-pointer hover:glow-blue transition-all"
      style={{ backgroundColor: colors.bg, borderColor: colors.border }}
      onClick={() => setExpanded(!expanded)}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Clock size={24} style={{ color: colors.text }} />
          <div>
            <h3 className="font-bold text-text-primary">ETA Forecast</h3>
            <p className="text-xs text-text-secondary">AI-powered arrival prediction</p>
          </div>
        </div>
        <motion.div animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: 0.3 }}>
          <Zap size={20} style={{ color: colors.text }} />
        </motion.div>
      </div>

      {/* Main ETA Display */}
      <div className="grid grid-cols-2 gap-6 mb-6">
        {/* Predicted Arrival */}
        <motion.div
          whileHover={{ scale: 1.02 }}
          className="p-4 rounded-lg bg-dark-card/50 border border-dark-border"
        >
          <p className="text-xs text-text-secondary font-semibold mb-2">Predicted Arrival</p>
          <p className="text-2xl font-bold text-text-primary">
            {predictedTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>
          <p className="text-xs text-text-secondary mt-1">
            +{pred.forecastDelay} min from now
          </p>
        </motion.div>

        {/* Scheduled vs Predicted */}
        {scheduledTime && (
          <motion.div
            whileHover={{ scale: 1.02 }}
            className="p-4 rounded-lg bg-dark-card/50 border border-dark-border"
          >
            <p className="text-xs text-text-secondary font-semibold mb-2">Schedule vs Prediction</p>
            <p
              className="text-2xl font-bold"
              style={{
                color: !timeDiff
                  ? '#1dd1b0'
                  : timeDiff < 0
                    ? '#58c7fa'
                    : timeDiff < 10
                      ? '#fca311'
                      : '#e63946',
              }}
            >
              {timeDiff ? `${timeDiff > 0 ? '+' : ''}${timeDiff}m` : 'On Time'}
            </p>
            <p className="text-xs text-text-secondary mt-1">
              {scheduledTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} scheduled
            </p>
          </motion.div>
        )}
      </div>

      {/* Confidence Indicator */}
      <div className="mb-6">
        <PredictionConfidenceIndicator
          confidence={pred.confidence}
          riskLevel={pred.riskLevel}
          method={pred.method}
          factors={analysis.factors}
          compact={!expanded}
        />
      </div>

      {/* Recommendations */}
      <AnimatePresence>
        {expanded && recommendations.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="pt-6 border-t border-dark-border space-y-3"
          >
            <label className="text-sm font-semibold text-text-primary block">Recommendations</label>
            {recommendations.map((rec, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="flex items-start gap-3 p-4 rounded-lg bg-dark-card/60 border border-dark-border/50"
              >
                {pred.riskLevel === 'low' ? (
                  <CheckCircle2 size={18} className="text-green-400 mt-0.5 shrink-0" />
                ) : (
                  <AlertTriangle size={18} className="text-accent-yellow mt-0.5 shrink-0" />
                )}
                <p className="text-sm text-text-secondary">{rec}</p>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Status Indicators */}
      {expanded && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="mt-6 pt-6 border-t border-dark-border"
        >
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="text-center p-3 rounded-lg bg-dark-card/60 border border-dark-border/60">
              <p className="text-xs text-text-secondary">Current Speed</p>
              <p className="font-bold text-text-primary">{currentStatus.speed} km/h</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-dark-card/60 border border-dark-border/60">
              <p className="text-xs text-text-secondary">Distance</p>
              <p className="font-bold text-text-primary">{currentStatus.distanceToDestination} km</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-dark-card/60 border border-dark-border/60">
              <p className="text-xs text-text-secondary">Stations</p>
              <p className="font-bold text-text-primary">{currentStatus.stationsRemaining}</p>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between text-xs text-text-secondary mb-1">
                <span>Speed utilization</span>
                <span>{speedPercent}%</span>
              </div>
              <div className="h-2 rounded-full bg-dark-card border border-dark-border overflow-hidden">
                <div className="h-full bg-accent-blue" style={{ width: `${speedPercent}%` }} />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between text-xs text-text-secondary mb-1">
                <span>Journey progress</span>
                <span>{distancePercent}%</span>
              </div>
              <div className="h-2 rounded-full bg-dark-card border border-dark-border overflow-hidden">
                <div className="h-full" style={{ width: `${distancePercent}%`, backgroundColor: '#f59e0b' }} />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between text-xs text-text-secondary mb-1">
                <span>Station completion</span>
                <span>{stationPercent}%</span>
              </div>
              <div className="h-2 rounded-full bg-dark-card border border-dark-border overflow-hidden">
                <div className="h-full" style={{ width: `${stationPercent}%`, backgroundColor: '#22c55e' }} />
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Expand Indicator */}
      <p className="text-xs text-text-secondary text-center mt-4 cursor-pointer hover:text-text-primary transition-colors">
        {expanded ? 'Click to collapse ▲' : 'Click to expand ▼'}
      </p>
    </motion.div>
  );
}
