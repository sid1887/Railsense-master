'use client';

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, CheckCircle2, Clock, Zap, Activity } from 'lucide-react';

interface TrainStatusStripProps {
  status?: string;
  delay: number;
  speed: number;
  lastUpdated?: number;
  source?: string;
  dataQuality?: number;
  isSynthetic?: boolean;
}

/**
 * TrainStatusStrip Component
 * Displays NTES real-time status with color coding and live updates
 * Shows delay, speed, and official status from NTES
 */
export default function TrainStatusStrip({
  status = 'Running',
  delay,
  speed,
  lastUpdated,
  source,
  dataQuality,
  isSynthetic,
}: TrainStatusStripProps) {
  const statusInfo = useMemo(() => {
    const lowerStatus = (status || 'Running').toLowerCase();

    if (lowerStatus.includes('delayed')) {
      return {
        color: 'from-alert-red to-alert-orange',
        bgColor: 'bg-alert-red/10',
        borderColor: 'border-alert-red/50',
        icon: AlertTriangle,
        label: 'Delayed',
        textColor: 'text-alert-red',
      };
    } else if (lowerStatus.includes('on time')) {
      return {
        color: 'from-green-500 to-green-600',
        bgColor: 'bg-green-500/10',
        borderColor: 'border-green-500/50',
        icon: CheckCircle2,
        label: 'On Time',
        textColor: 'text-green-500',
      };
    } else {
      return {
        color: 'from-accent-blue to-accent-blue-dark',
        bgColor: 'bg-accent-blue/10',
        borderColor: 'border-accent-blue/50',
        icon: Activity,
        label: 'Running',
        textColor: 'text-accent-blue',
      };
    }
  }, [status]);

  const StatusIcon = statusInfo.icon;
  const lastUpdateTime = useMemo(() => {
    if (!lastUpdated) return 'Just now';
    const diff = Date.now() - lastUpdated;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    if (minutes === 0) return 'Just now';
    if (minutes === 1) return '1 minute ago';
    if (minutes < 60) return `${minutes} minutes ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  }, [lastUpdated]);

  const qualityLabel = isSynthetic
    ? 'Synthetic'
    : dataQuality !== undefined
      ? dataQuality >= 80
        ? 'High'
        : dataQuality >= 60
          ? 'Medium'
          : 'Low'
      : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-lg border ${statusInfo.borderColor} ${statusInfo.bgColor} p-4 mb-6`}
    >
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Status */}
        <motion.div
          whileHover={{ scale: 1.02 }}
          className="flex items-center gap-3 p-3 rounded bg-dark-card/50 border border-dark-border"
        >
          <motion.div
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <StatusIcon className={`${statusInfo.textColor} shrink-0`} size={24} />
          </motion.div>
          <div className="min-w-0">
            <p className="text-xs text-text-secondary">Official Status</p>
            <p className={`font-bold text-sm ${statusInfo.textColor}`}>{statusInfo.label}</p>
          </div>
        </motion.div>

        {/* Delay */}
        <motion.div
          whileHover={{ scale: 1.02 }}
          className="flex items-center gap-3 p-3 rounded bg-dark-card/50 border border-dark-border"
        >
          <Clock className={`${delay > 0 ? 'text-alert-orange' : 'text-green-500'} shrink-0`} size={24} />
          <div className="min-w-0">
            <p className="text-xs text-text-secondary">Delay</p>
            <p className={`font-bold text-sm ${delay > 0 ? 'text-alert-orange' : 'text-green-500'}`}>
              {delay > 0 ? `+${Math.round(delay)}m` : 'On time'}
            </p>
          </div>
        </motion.div>

        {/* Speed */}
        <motion.div
          whileHover={{ scale: 1.02 }}
          className="flex items-center gap-3 p-3 rounded bg-dark-card/50 border border-dark-border"
        >
          <Zap className={`${speed > 50 ? 'text-accent-blue' : speed > 20 ? 'text-alert-orange' : 'text-gray-500'} shrink-0`} size={24} />
          <div className="min-w-0">
            <p className="text-xs text-text-secondary">Speed</p>
            <p className="font-bold text-sm text-text-primary">{Math.round(speed)} km/h</p>
          </div>
        </motion.div>

        {/* Last Updated */}
        <motion.div
          whileHover={{ scale: 1.02 }}
          className="flex items-center gap-3 p-3 rounded bg-dark-card/50 border border-dark-border"
        >
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <div className="min-w-0">
            <p className="text-xs text-text-secondary">Updated</p>
            <p className="font-bold text-sm text-text-primary">{lastUpdateTime}</p>
          </div>
        </motion.div>
      </div>

      {qualityLabel && (
        <div className="mt-3 space-y-2">
          <div className="flex items-center gap-2 flex-wrap text-xs">
            <span className="font-semibold text-text-primary">Data Quality:</span>
            <span className="px-2 py-1 rounded-full bg-dark-card border border-dark-border font-semibold">
              {qualityLabel} ({dataQuality}%)
            </span>
            {source && (
              <span className="px-2 py-1 rounded-full bg-dark-card border border-dark-border text-text-secondary">
                Source: {source}
              </span>
            )}
          </div>
          {isSynthetic && (
            <p className="text-xs text-alert-orange flex items-center gap-2">
              ⚠ Using synthetic schedule data (live data unavailable)
            </p>
          )}
        </div>
      )}

      {/* Delay Warning */}
      {delay > 0 && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mt-3 pt-3 border-t border-dark-border"
        >
          <p className="text-xs text-alert-orange flex items-center gap-2">
            <AlertTriangle size={16} />
            Train is experiencing a delay. Updates from Indian Railways (NTES).
          </p>
        </motion.div>
      )}
    </motion.div>
  );
}
