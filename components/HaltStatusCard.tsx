'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { HaltDetection } from '@/types/train';
import { AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { formatDuration } from '@/lib/utils';

interface HaltStatusCardProps {
  haltDetection: HaltDetection;
  trainDelay: number;
}

/**
 * HaltStatusCard Component
 * Displays current halt status with color coding
 * Shows duration, reason, and urgency level
 */
export default function HaltStatusCard({ haltDetection, trainDelay }: HaltStatusCardProps) {
  const isHalted = haltDetection.halted;
  const duration = haltDetection.haltDuration || 0;
  const reason = haltDetection.reason || 'Unknown reason';

  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5 },
    },
  };

  const pulseVariants = {
    animate: {
      scale: [1, 1.05, 1],
      transition: { duration: 2, repeat: Infinity },
    },
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className={`card p-6 rounded-lg border ${
        isHalted
          ? 'border-alert-red/50 bg-gradient-to-br from-alert-red/10 to-dark-card'
          : 'border-accent-blue/50 bg-gradient-to-br from-accent-blue/10 to-dark-card'
      }`}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          {isHalted ? (
            <motion.div variants={pulseVariants} animate="animate">
              <AlertCircle className="text-alert-red" size={28} />
            </motion.div>
          ) : (
            <CheckCircle className="text-green-400" size={28} />
          )}
          <div>
            <h3 className="font-semibold text-lg text-text-primary">
              {isHalted ? 'Halt Status' : 'Train Status'}
            </h3>
            <p className="text-xs text-text-secondary mt-1">
              {isHalted ? 'Unexpected stop detected' : 'Train is moving normally'}
            </p>
          </div>
        </div>
      </div>

      {isHalted && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="space-y-4"
        >
          {/* Duration */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-text-secondary flex items-center gap-2">
                <Clock size={16} />
                Duration
              </span>
              <span className="text-2xl font-bold text-alert-red">
                {formatDuration(duration)}
              </span>
            </div>
            <div className="w-full h-2 bg-dark-bg rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-alert-orange to-alert-red"
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(100, (duration / 30) * 100)}%` }}
                transition={{ duration: 1, ease: 'easeOut' }}
              />
            </div>
          </div>

          {/* Reason */}
          <div className="bg-dark-bg/50 rounded p-3 border border-alert-red/20">
            <p className="text-sm text-text-secondary">
              <span className="text-alert-orange font-semibold">Reason: </span>
              {reason}
            </p>
          </div>

          {/* Severity Indicator */}
          <div className="flex items-center justify-between pt-2">
            <span className="text-xs text-text-secondary">Severity</span>
            <div className="flex gap-1">
              {[1, 2, 3].map((i) => (
                <motion.div
                  key={i}
                  className={`w-2 h-2 rounded-full ${
                    i <= (duration > 20 ? 3 : duration > 10 ? 2 : 1)
                      ? 'bg-alert-red'
                      : 'bg-dark-bg'
                  }`}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.1 * i }}
                />
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {!isHalted && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-text-secondary">Current Delay</span>
            <span className="text-lg font-bold text-green-400">
              {trainDelay > 0 ? `+${trainDelay.toFixed(0)}m` : 'On time'}
            </span>
          </div>
          <p className="text-xs text-text-secondary">
            Train is progressing on schedule. Movement is normal.
          </p>
        </div>
      )}
    </motion.div>
  );
}
