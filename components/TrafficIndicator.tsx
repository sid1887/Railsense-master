'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { TrafficAnalysis } from '@/types/train';
import { AlertTriangle, TrendingDown, TrendingUp } from 'lucide-react';

interface TrafficIndicatorProps {
  traffic: TrafficAnalysis;
  trend?: 'improving' | 'stable' | 'worsening';
}

/**
 * TrafficIndicator Component
 * Shows nearby train congestion level
 * Displays nearby trains and trend
 * Color-coded based on congestion level
 */
export default function TrafficIndicator({ traffic, trend = 'stable' }: TrafficIndicatorProps) {
  const { congestionLevel, nearbyTrainsCount, nearbyTrains, radiusKm } = traffic;

  // Color and emoji mapping
  const congestionConfig = {
    LOW: {
      color: 'text-green-400',
      bg: 'from-green-900/20 to-dark-card',
      border: 'border-green-700',
      emoji: '🟢',
      label: 'Light Traffic',
      description: 'Clear track ahead',
    },
    MEDIUM: {
      color: 'text-yellow-400',
      bg: 'from-yellow-900/20 to-dark-card',
      border: 'border-yellow-700',
      emoji: '🟡',
      label: 'Moderate Traffic',
      description: 'Some trains nearby',
    },
    HIGH: {
      color: 'text-orange-400',
      bg: 'from-orange-900/20 to-dark-card',
      border: 'border-orange-700',
      emoji: '🔴',
      label: 'Heavy Congestion',
      description: 'Multiple trains detected',
    },
  };

  const config = congestionConfig[congestionLevel];

  const trendIcon = {
    improving: <TrendingDown className="text-green-400" size={16} />,
    stable: <div className="w-4 h-0.5 bg-text-secondary" />,
    worsening: <TrendingUp className="text-alert-orange" size={16} />,
  };

  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5 },
    },
  };

  const trainItemVariants = {
    hidden: { opacity: 0, x: -10 },
    visible: (i: number) => ({
      opacity: 1,
      x: 0,
      transition: { delay: 0.1 + i * 0.05, duration: 0.3 },
    }),
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className={`card p-6 rounded-lg border bg-gradient-to-br ${config.bg} ${config.border}`}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="text-3xl">{config.emoji}</span>
          <div>
            <h3 className="font-semibold text-text-primary">{config.label}</h3>
            <p className="text-xs text-text-secondary">{config.description}</p>
          </div>
        </div>

        {/* Trend indicator */}
        <div className="flex items-center gap-2">
          {trendIcon[trend]}
          <span className="text-xs text-text-secondary capitalize">{trend}</span>
        </div>
      </div>

      {/* Train count */}
      <div className="mb-4">
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold text-accent-blue">{nearbyTrainsCount}</span>
          <span className="text-sm text-text-secondary">
            train{nearbyTrainsCount !== 1 ? 's' : ''} within {radiusKm}km
          </span>
        </div>
      </div>

      {/* Nearby trains list */}
      {nearbyTrains.length > 0 && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="space-y-2 pt-3 border-t border-text-secondary/20"
        >
          <p className="text-xs text-text-secondary font-semibold">Nearby Trains:</p>
          {nearbyTrains.map((train, i) => (
            <motion.div
              key={train.trainNumber}
              custom={i}
              variants={trainItemVariants}
              initial="hidden"
              animate="visible"
              className="flex items-center justify-between bg-dark-bg/50 p-2 rounded border border-text-secondary/10"
            >
              <div>
                <p className="text-xs font-semibold text-text-primary">{train.trainNumber}</p>
                <p className="text-xs text-text-secondary">{train.trainName}</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-semibold text-accent-blue">{train.distance.toFixed(2)}km</p>
                {train.distance < 1 && (
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 1, repeat: Infinity }}
                    className="text-xs text-alert-orange"
                  >
                    ⚠️ Close
                  </motion.div>
                )}
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}

      {nearbyTrainsCount === 0 && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-xs text-text-secondary pt-3 border-t border-text-secondary/20"
        >
          ✅ No trains detected in the area. Track is clear.
        </motion.p>
      )}

      {/* Alert for high congestion */}
      {congestionLevel === 'HIGH' && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 p-3 bg-alert-orange/20 border border-alert-orange rounded-lg flex gap-2"
        >
          <AlertTriangle size={16} className="text-alert-orange flex-shrink-0 mt-0.5" />
          <p className="text-xs text-alert-orange">
            Heavy congestion detected. Expect delays.
          </p>
        </motion.div>
      )}
    </motion.div>
  );
}
