'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wifi, WifiOff, AlertCircle, CheckCircle } from 'lucide-react';
import { useTrainStreamUpdates } from '@/hooks/useTrainStream';

interface LiveStatusBadgeProps {
  trainNumber: string;
  onDataUpdate?: (data: any) => void;
}

/**
 * LiveStatusBadge Component
 * Displays real-time train status with connection indicator
 * Shows live updates from SSE stream with fallback to polling
 */
export default function LiveStatusBadge({ trainNumber, onDataUpdate }: LiveStatusBadgeProps) {
  const { data, status, error, isStreaming } = useTrainStreamUpdates(trainNumber);
  const [prevDelay, setPrevDelay] = useState<number | null>(null);
  const [delayChanged, setDelayChanged] = useState(false);

  useEffect(() => {
    if (data && onDataUpdate) {
      onDataUpdate(data);
    }

    // Show animation when delay changes
    if (data && prevDelay !== null && prevDelay !== data.delay) {
      setDelayChanged(true);
      const timer = setTimeout(() => setDelayChanged(false), 2000);
      return () => clearTimeout(timer);
    }

    setPrevDelay(data?.delay ?? null);
  }, [data, onDataUpdate, prevDelay]);

  if (!data) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="inline-flex items-center gap-2 px-3 py-2 rounded-full bg-dark-card border border-dark-border"
      >
        <div className="w-2 h-2 rounded-full bg-gray-500 animate-pulse" />
        <span className="text-xs text-text-secondary">Loading...</span>
      </motion.div>
    );
  }

  const isDelayed = data.delay > 0;
  const qualityLabel = data.isSynthetic
    ? 'Synthetic'
    : data.dataQuality >= 80
      ? 'High'
      : data.dataQuality >= 60
        ? 'Medium'
        : 'Low';
  const qualityClass = data.isSynthetic
    ? 'bg-alert-orange/20 text-alert-orange'
    : data.dataQuality >= 80
      ? 'bg-green-500/20 text-green-400'
      : data.dataQuality >= 60
        ? 'bg-yellow-500/20 text-yellow-300'
        : 'bg-red-500/20 text-red-400';

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="inline-flex items-center gap-3 px-4 py-3 rounded-full border"
      style={{
        borderColor: isDelayed ? 'rgba(255, 107, 107, 0.5)' : 'rgba(88, 199, 250, 0.5)',
        backgroundColor: isDelayed ? 'rgba(255, 107, 107, 0.05)' : 'rgba(88, 199, 250, 0.05)'
      }}
    >
      {/* Connection Status */}
      <motion.div
        animate={{ scale: isStreaming ? [1, 1.2, 1] : 1 }}
        transition={{ duration: 2, repeat: isStreaming ? Infinity : 0 }}
        title={isStreaming ? 'Real-time stream active' : 'Using polling (stream unavailable)'}
      >
        {isStreaming ? (
          <Wifi size={16} className="text-green-400" />
        ) : (
          <WifiOff size={16} className="text-text-secondary" />
        )}
      </motion.div>

      {/* Status Indicator */}
      <motion.div
        animate={{
          scale: isDelayed ? [1, 1.05, 1] : 1,
          color: isDelayed ? '#ff6b6b' : '#58c7fa'
        }}
        transition={{ duration: 1.5, repeat: isDelayed ? Infinity : 0 }}
        className="flex items-center gap-2"
      >
        {isDelayed ? (
          <AlertCircle size={16} />
        ) : (
          <CheckCircle size={16} />
        )}
        <span className="text-sm font-semibold">
          {isDelayed ? `+${Math.round(data.delay)}m` : 'On Time'}
        </span>
      </motion.div>

      {/* Delay Changed Indicator */}
      <AnimatePresence>
        {delayChanged && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="text-xs text-accent-blue font-semibold px-2 py-1 rounded bg-accent-blue/20"
          >
            Updated
          </motion.div>
        )}
      </AnimatePresence>

      {/* Speed Indicator */}
      <div className="h-4 w-px bg-dark-border" />
      <div className="text-xs text-text-secondary flex items-center gap-1">
        <span className="text-text-primary font-semibold">{Math.round(data.speed)}</span>
        km/h
      </div>

      {/* Data Quality */}
      <div
        className={`text-xs font-semibold px-2 py-1 rounded-full ${qualityClass}`}
        title={`Source: ${data.source} · Quality: ${data.dataQuality}/100${data.currentLocation?.trackSegmentName ? ` · Snapped to ${data.currentLocation.trackSegmentName}` : ''}`}
      >
        <span>{qualityLabel}</span>
        <span className="ml-1 text-opacity-70">({data.dataQuality}%)</span>
      </div>

      {/* Error State */}
      {error && !isStreaming && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="ml-2 text-xs text-alert-orange"
          title={error.message}
        >
          ⚠ Polling
        </motion.div>
      )}
    </motion.div>
  );
}
