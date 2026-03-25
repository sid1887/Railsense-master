'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, AlertTriangle, CheckCircle2, AlertCircle } from 'lucide-react';

interface PredictionConfidenceIndicatorProps {
  confidence: number; // 0-1 or 0-100
  riskLevel?: 'low' | 'medium' | 'high' | 'critical';
  method?: 'heuristic' | 'historical' | 'ml';
  factors?: Array<{
    name: string;
    impact: number; // in minutes
    direction: 'positive' | 'negative' | 'neutral';
  }>;
  compact?: boolean;
}

/**
 * PredictionConfidenceIndicator Component
 * Displays prediction confidence level with visual indicators
 * Shows which prediction method was used and key factors
 */
export default function PredictionConfidenceIndicator({
  confidence,
  riskLevel = 'low',
  method = 'heuristic',
  factors = [],
  compact = false,
}: PredictionConfidenceIndicatorProps) {
  // Normalize confidence to 0-100
  const confidencePercent = confidence <= 1 ? Math.round(confidence * 100) : Math.round(confidence);

  // Determine color based on confidence
  const getConfidenceColor = (conf: number) => {
    if (conf >= 85) return { color: '#1dd1b0', label: 'Very High', hex: '#1dd1b0' };
    if (conf >= 70) return { color: '#58c7fa', label: 'High', hex: '#58c7fa' };
    if (conf >= 50) return { color: '#fca311', label: 'Medium', hex: '#fca311' };
    return { color: '#e63946', label: 'Low', hex: '#e63946' };
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
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

  const methodLabel = {
    heuristic: '📊 Rule-based',
    historical: '📚 Historical',
    ml: '🤖 ML Model',
  }[method];

  const confidenceInfo = getConfidenceColor(confidencePercent);
  const riskInfo = getRiskColor(riskLevel);
  const RiskIcon =
    riskLevel === 'critical'
      ? AlertTriangle
      : riskLevel === 'high'
        ? AlertCircle
        : CheckCircle2;

  if (compact) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex items-center gap-2 text-xs"
      >
        <div className="flex-1">
          <div className="h-1.5 rounded-full bg-dark-card border border-dark-border overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${confidencePercent}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              style={{ backgroundColor: confidenceInfo.hex }}
              className="h-full"
            />
          </div>
        </div>
        <span className="font-semibold text-text-primary white-space-nowrap">
          {confidencePercent}%
        </span>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="rounded-lg border p-4"
      style={{
        backgroundColor: riskInfo.bg,
        borderColor: riskInfo.border,
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <motion.div
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <RiskIcon size={20} style={{ color: riskInfo.text }} />
          </motion.div>
          <div>
            <label className="text-xs text-text-secondary font-semibold block">
              Prediction Risk
            </label>
            <span className="text-sm font-bold" style={{ color: riskInfo.text }}>
              {riskLevel.charAt(0).toUpperCase()}
              {riskLevel.slice(1)}
            </span>
          </div>
        </div>
      </div>

      {/* Confidence Meter */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs text-text-secondary font-semibold">Prediction Confidence</label>
          <span className="text-sm font-bold" style={{ color: confidenceInfo.hex }}>
            {confidencePercent}%
          </span>
        </div>
        <div className="h-2 rounded-full bg-dark-card border border-dark-border overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${confidencePercent}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            style={{ backgroundColor: confidenceInfo.hex }}
            className="h-full"
          />
        </div>
        <p className="text-xs text-text-secondary mt-1">{confidenceInfo.label} confidence</p>
      </div>

      {/* Method */}
      <div className="mb-4 p-2 rounded bg-dark-card border border-dark-border">
        <p className="text-xs text-text-secondary flex items-center gap-2">
          <TrendingUp size={14} />
          <span>Method:</span>
          <span className="font-semibold text-text-primary">{methodLabel}</span>
        </p>
      </div>

      {/* Factors */}
      {factors.length > 0 && (
        <div className="space-y-2">
          <label className="text-xs text-text-secondary font-semibold">Key Factors</label>
          {factors.map((factor, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="text-xs p-2 rounded bg-dark-card/50 border border-dark-border/50"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-text-secondary">{factor.name}</span>
                <span
                  className="font-semibold"
                  style={{
                    color:
                      factor.direction === 'negative'
                        ? '#e63946'
                        : factor.direction === 'positive'
                          ? '#22c55e'
                          : '#f59e0b',
                  }}
                >
                  {factor.direction === 'negative' ? '+' : factor.direction === 'positive' ? '-' : ''}
                  {Math.abs(factor.impact)}m
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-1.5 flex-1 rounded bg-dark-card border border-dark-border overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(100, Math.max(8, Math.round((Math.abs(factor.impact) / 20) * 100)))}%` }}
                    transition={{ duration: 0.6, delay: idx * 0.1 }}
                    className="h-full"
                    style={{
                      backgroundColor:
                        factor.direction === 'negative'
                          ? '#e63946'
                          : factor.direction === 'positive'
                            ? '#22c55e'
                            : '#f59e0b',
                    }}
                  />
                </div>
                <span className="text-[11px] text-text-secondary font-semibold min-w-[34px] text-right">
                  {Math.min(100, Math.max(8, Math.round((Math.abs(factor.impact) / 20) * 100)))}%
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Risk Assessment */}
      {riskLevel !== 'low' && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          transition={{ delay: 0.2 }}
          className="mt-4 pt-4 border-t border-dark-border"
        >
          <p className="text-xs flex items-start gap-2">
            <AlertTriangle size={14} className="mt-0.5 shrink-0" style={{ color: riskInfo.text }} />
            <span>
              {riskLevel === 'critical'
                ? 'Train is at critical risk of further delays. Monitor closely and consider alerting passengers.'
                : riskLevel === 'high'
                  ? 'Train has elevated risk of delays. Keep passengers informed of potential changes.'
                  : 'Train may experience slight delays. Standard monitoring recommended.'}
            </span>
          </p>
        </motion.div>
      )}
    </motion.div>
  );
}
