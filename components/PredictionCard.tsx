'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { PredictionResult } from '@/types/train';
import { TrendingDown, TrendingUp, Check } from 'lucide-react';

interface PredictionCardProps {
  prediction: PredictionResult;
}

/**
 * PredictionCard Component
 * Displays wait time prediction with confidence
 * Shows min/max wait time range
 */
export default function PredictionCard({ prediction }: PredictionCardProps) {
  const { minWait, maxWait, confidence, baseWait, trafficFactor, weatherFactor } = prediction;

  const confidenceLevel =
    confidence >= 80 ? 'High' : confidence >= 60 ? 'Medium' : 'Low';

  const confidenceColor =
    confidence >= 80
      ? 'text-green-400'
      : confidence >= 60
        ? 'text-yellow-400'
        : 'text-alert-orange';

  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5 },
    },
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="card p-6 rounded-lg border border-accent-blue/30 bg-gradient-to-br from-accent-blue/10 to-dark-card"
    >
      <h3 className="font-semibold text-accent-blue mb-4">Expected Wait Time</h3>

      {/* Main prediction display */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1, duration: 0.4 }}
        className="flex items-baseline gap-2 mb-6"
      >
        <span className="text-4xl font-bold text-accent-blue">{minWait.toFixed(0)}</span>
        <span className="text-2xl text-text-secondary">–</span>
        <span className="text-4xl font-bold text-accent-blue">{maxWait.toFixed(0)}</span>
        <span className="text-lg text-text-secondary">minutes</span>
      </motion.div>

      {/* Confidence indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="mb-4"
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-text-secondary">Prediction Confidence</span>
          <span className={`text-sm font-semibold ${confidenceColor}`}>{confidence}%</span>
        </div>
        <div className="w-full h-2 bg-dark-bg rounded-full overflow-hidden border border-text-secondary/20">
          <motion.div
            className={`h-full ${
              confidence >= 80
                ? 'bg-gradient-to-r from-green-500 to-green-400'
                : confidence >= 60
                  ? 'bg-gradient-to-r from-yellow-500 to-yellow-400'
                  : 'bg-gradient-to-r from-orange-500 to-orange-400'
            }`}
            initial={{ width: 0 }}
            animate={{ width: `${confidence}%` }}
            transition={{ duration: 1, ease: 'easeOut', delay: 0.3 }}
          />
        </div>
      </motion.div>

      {/* Confidence level badge */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.25 }}
        className={`inline-block px-3 py-1 rounded-full text-xs font-semibold mb-4 ${confidenceColor} bg-dark-bg border`}
        style={{
          borderColor:
            confidence >= 80
              ? '#16a34a'
              : confidence >= 60
                ? '#ca8a04'
                : '#ea580c',
        }}
      >
        {confidenceLevel} Confidence
      </motion.div>

      {/* Factor breakdown */}
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: 'auto' }}
        transition={{ delay: 0.3, duration: 0.4 }}
        className="border-t border-text-secondary/20 pt-4 space-y-3"
      >
        <p className="text-xs font-semibold text-text-secondary mb-3">Calculation Breakdown:</p>

        {/* Base wait */}
        <div className="space-y-1">
          <div className="flex justify-between items-center">
            <span className="text-xs text-text-secondary">Base Wait (Section)</span>
            <span className="text-sm font-semibold text-accent-blue">{baseWait.toFixed(1)}m</span>
          </div>
          <div className="w-full h-1.5 bg-dark-bg rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-accent-blue"
              initial={{ width: 0 }}
              animate={{ width: '100%' }}
              transition={{ duration: 0.6, delay: 0.4 }}
            />
          </div>
        </div>

        {/* Traffic impact */}
        <div className="space-y-1">
          <div className="flex justify-between items-center">
            <span className="text-xs text-text-secondary">Traffic Factor</span>
            <div className="flex items-center gap-1">
              <span className="text-sm font-semibold text-orange-400">
                {trafficFactor.toFixed(2)}x
              </span>
              {trafficFactor > 1 && (
                <TrendingUp size={14} className="text-alert-orange" />
              )}
            </div>
          </div>
          <div className="w-full h-1.5 bg-dark-bg rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-orange-500"
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(100, trafficFactor * 50)}%` }}
              transition={{ duration: 0.6, delay: 0.45 }}
            />
          </div>
        </div>

        {/* Weather impact */}
        <div className="space-y-1">
          <div className="flex justify-between items-center">
            <span className="text-xs text-text-secondary">Weather Factor</span>
            <div className="flex items-center gap-1">
              <span className="text-sm font-semibold text-blue-400">
                {weatherFactor.toFixed(2)}x
              </span>
              {weatherFactor > 1 && (
                <TrendingUp size={14} className="text-blue-400" />
              )}
            </div>
          </div>
          <div className="w-full h-1.5 bg-dark-bg rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-blue-500"
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(100, weatherFactor * 20)}%` }}
              transition={{ duration: 0.6, delay: 0.5 }}
            />
          </div>
        </div>
      </motion.div>

      {/* Prediction note */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="text-xs text-text-secondary mt-4 italic border-t border-text-secondary/20 pt-3"
      >
        ℹ️ Estimates account for traffic congestion, weather conditions, and current delays.
        Actual wait may vary.
      </motion.p>
    </motion.div>
  );
}
