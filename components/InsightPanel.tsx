'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { PassengerInsight } from '@/types/train';
import { CheckCircle, AlertCircle, Info, Lightbulb } from 'lucide-react';

interface InsightPanelProps {
  insight: PassengerInsight;
}

/**
 * InsightPanel Component
 * Displays human-readable passenger insights
 * Shows headline, details, wait estimate, and recommendations
 */
export default function InsightPanel({ insight }: InsightPanelProps) {
  const { headline, details, estimatedWait, uncertainty, recommendations } = insight;

  // Color mapping based on uncertainty level
  const uncertaintyColors = {
    LOW: {
      bg: 'from-green-900/20 to-dark-card',
      border: 'border-green-700',
      icon: CheckCircle,
      color: 'text-green-400',
    },
    MEDIUM: {
      bg: 'from-yellow-900/20 to-dark-card',
      border: 'border-yellow-700',
      icon: AlertCircle,
      color: 'text-yellow-400',
    },
    HIGH: {
      bg: 'from-orange-900/20 to-dark-card',
      border: 'border-orange-700',
      icon: AlertCircle,
      color: 'text-orange-400',
    },
    CRITICAL: {
      bg: 'from-red-900/20 to-dark-card',
      border: 'border-red-700',
      icon: AlertCircle,
      color: 'text-red-400',
    },
  };

  const config = uncertaintyColors[uncertainty];
  const IconComponent = config.icon;

  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -15 },
    visible: (i: number) => ({
      opacity: 1,
      x: 0,
      transition: { delay: 0.2 + i * 0.1, duration: 0.3 },
    }),
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className={`card p-6 rounded-lg border bg-gradient-to-br ${config.bg} ${config.border}`}
    >
      {/* Header with icon */}
      <div className="flex items-start gap-4 mb-4">
        <motion.div
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
          className={`flex-shrink-0 ${config.color}`}
        >
          <IconComponent size={28} />
        </motion.div>

        <div className="flex-1">
          <motion.h2
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15 }}
            className="text-xl font-bold text-text-primary mb-2"
          >
            {headline}
          </motion.h2>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-sm text-text-secondary leading-relaxed"
          >
            {details}
          </motion.p>
        </div>
      </div>

      {/* Wait time estimate */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.25, duration: 0.3 }}
        className="my-4 p-4 bg-dark-bg/50 rounded-lg border border-accent-blue/30"
      >
        <p className="text-xs text-text-secondary mb-1">Expected Movement Window</p>
        <p className="text-2xl font-bold text-accent-blue">{estimatedWait}</p>
      </motion.div>

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          transition={{ delay: 0.3, duration: 0.4 }}
          className="mt-4 pt-4 border-t border-text-secondary/20"
        >
          <div className="flex items-center gap-2 mb-3">
            <Lightbulb size={16} className="text-accent-blue" />
            <p className="text-xs font-semibold text-accent-blue">Recommendations</p>
          </div>

          <ul className="space-y-2">
            {recommendations.map((rec, i) => (
              <motion.li
                key={i}
                custom={i}
                variants={itemVariants}
                initial="hidden"
                animate="visible"
                className="flex items-start gap-2 text-sm text-text-secondary"
              >
                <span className="text-accent-blue font-bold mt-0.5">•</span>
                <span>{rec}</span>
              </motion.li>
            ))}
          </ul>
        </motion.div>
      )}

      {/* Uncertainty level indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="mt-4 pt-4 border-t border-text-secondary/20 flex items-center justify-between"
      >
        <span className="text-xs text-text-secondary">Uncertainty Level</span>
        <motion.div
          className={`px-3 py-1 rounded-full text-xs font-semibold ${config.color} bg-dark-bg border ${config.border}`}
          whileHover={{ scale: 1.05 }}
        >
          {uncertainty}
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
