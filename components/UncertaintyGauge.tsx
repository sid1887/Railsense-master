'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { UncertaintyIndex } from '@/types/train';
import { AlertCircle } from 'lucide-react';

interface UncertaintyGaugeProps {
  uncertainty: UncertaintyIndex;
}

/**
 * UncertaintyGauge Component
 * Circular gauge showing uncertainty score (0-100)
 * Color-coded based on risk level
 * Displays warning emoji based on level
 */
export default function UncertaintyGauge({ uncertainty }: UncertaintyGaugeProps) {
  const { score, level, factors } = uncertainty;

  // Color mapping for different levels
  const colorMap = {
    LOW: {
      bg: 'from-green-500 to-green-400',
      text: 'text-green-400',
      emoji: '😊',
      description: 'Situation is clear and predictable',
    },
    MEDIUM: {
      bg: 'from-yellow-500 to-yellow-400',
      text: 'text-yellow-400',
      emoji: '😐',
      description: 'Some uncertainty in wait time',
    },
    HIGH: {
      bg: 'from-orange-500 to-orange-400',
      text: 'text-orange-400',
      emoji: '😟',
      description: 'Significant uncertainty ahead',
    },
    CRITICAL: {
      bg: 'from-red-500 to-red-400',
      text: 'text-red-400',
      emoji: '😰',
      description: 'Situation highly unpredictable',
    },
  };

  const config = colorMap[level];
  const circumference = 2 * Math.PI * 45; // radius = 45
  const offset = circumference - (score / 100) * circumference;

  const containerVariants = {
    hidden: { opacity: 0, scale: 0.8 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: { duration: 0.5 },
    },
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="card p-6 rounded-lg border border-accent-blue/30 flex flex-col items-center"
    >
      <h3 className="font-semibold text-accent-blue mb-4">Uncertainty Index</h3>

      {/* Circular Gauge */}
      <div className="relative mb-6">
        <svg width="120" height="120" className="transform -rotate-90">
          {/* Background circle */}
          <circle
            cx="60"
            cy="60"
            r="45"
            stroke="#1a1f3a"
            strokeWidth="8"
            fill="none"
          />

          {/* Progress circle */}
          <motion.circle
            cx="60"
            cy="60"
            r="45"
            stroke="url(#gaugeGradient)"
            strokeWidth="8"
            fill="none"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1, ease: 'easeOut' }}
            strokeLinecap="round"
          />

          {/* Gradient definition */}
          <defs>
            <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop
                offset="0%"
                stopColor={
                  level === 'LOW'
                    ? '#22c55e'
                    : level === 'MEDIUM'
                      ? '#eab308'
                      : level === 'HIGH'
                        ? '#f97316'
                        : '#ef4444'
                }
              />
              <stop
                offset="100%"
                stopColor={
                  level === 'LOW'
                    ? '#16a34a'
                    : level === 'MEDIUM'
                      ? '#ca8a04'
                      : level === 'HIGH'
                        ? '#ea580c'
                        : '#dc2626'
                }
              />
            </linearGradient>
          </defs>
        </svg>

        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.div
            className="text-3xl"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.3, duration: 0.4 }}
          >
            {config.emoji}
          </motion.div>
          <motion.div
            className="text-2xl font-bold text-text-primary mt-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.3 }}
          >
            {score}
          </motion.div>
        </div>
      </div>

      {/* Level Badge */}
      <motion.div
        className={`px-4 py-2 rounded-full mb-4 text-sm font-semibold ${config.text} bg-gradient-to-r ${config.bg} bg-opacity-20 border`}
        style={{
          borderColor:
            level === 'LOW'
              ? '#16a34a'
              : level === 'MEDIUM'
                ? '#ca8a04'
                : level === 'HIGH'
                  ? '#ea580c'
                  : '#dc2626',
        }}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        {level}
      </motion.div>

      {/* Description */}
      <p className="text-xs text-text-secondary text-center mb-4">{config.description}</p>

      {/* Factor breakdown */}
      <div className="w-full space-y-2 text-xs">
        <div className="flex justify-between">
          <span className="text-text-secondary">Halt Impact</span>
          <span className="text-accent-blue font-semibold">{factors.haltDuration.toFixed(0)}%</span>
        </div>
        <div className="w-full h-1 bg-dark-bg rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-orange-500"
            initial={{ width: 0 }}
            animate={{ width: `${factors.haltDuration}%` }}
            transition={{ duration: 0.8, delay: 0.2 }}
          />
        </div>

        <div className="flex justify-between pt-2">
          <span className="text-text-secondary">Traffic Impact</span>
          <span className="text-accent-blue font-semibold">{factors.trafficDensity.toFixed(0)}%</span>
        </div>
        <div className="w-full h-1 bg-dark-bg rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-red-500"
            initial={{ width: 0 }}
            animate={{ width: `${factors.trafficDensity}%` }}
            transition={{ duration: 0.8, delay: 0.3 }}
          />
        </div>

        <div className="flex justify-between pt-2">
          <span className="text-text-secondary">Weather Risk</span>
          <span className="text-accent-blue font-semibold">{factors.weatherRisk.toFixed(0)}%</span>
        </div>
        <div className="w-full h-1 bg-dark-bg rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-blue-500"
            initial={{ width: 0 }}
            animate={{ width: `${factors.weatherRisk}%` }}
            transition={{ duration: 0.8, delay: 0.4 }}
          />
        </div>
      </div>
    </motion.div>
  );
}
