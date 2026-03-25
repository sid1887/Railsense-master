'use client';

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  AlertCircle,
  CheckCircle,
  Database,
  Zap,
  MapPin,
  TrendingUp
} from 'lucide-react';

interface DataQualityCardProps {
  source?: string;
  quality?: number; // 0-100
  isSynthetic?: boolean;
  snappingDistance?: number; // km
  trackSegmentName?: string;
  confidence?: number; // 0-1 or 0-100
  lastUpdated?: number;
  showDetailed?: boolean;
}

/**
 * DataQualityCard Component
 * Displays comprehensive data quality metrics with visual indicators
 * Shows source, quality score, snapping info, and confidence levels
 */
export default function DataQualityCard({
  source = 'unknown',
  quality = 50,
  isSynthetic = false,
  snappingDistance,
  trackSegmentName,
  confidence,
  lastUpdated,
  showDetailed = true,
}: DataQualityCardProps) {
  const qualityStatus = useMemo(() => {
    if (isSynthetic) {
      return {
        level: 'Low (Synthetic)',
        color: '#fc7f5e',
        bgColor: 'rgba(252, 163, 17, 0.1)',
        borderColor: 'rgba(252, 163, 17, 0.3)',
        icon: AlertCircle,
      };
    }

    if (quality >= 85) {
      return {
        level: 'Excellent',
        color: '#1dd1b0',
        bgColor: 'rgba(29, 209, 176, 0.1)',
        borderColor: 'rgba(29, 209, 176, 0.3)',
        icon: CheckCircle,
      };
    } else if (quality >= 70) {
      return {
        level: 'Good',
        color: '#58c7fa',
        bgColor: 'rgba(88, 199, 250, 0.1)',
        borderColor: 'rgba(88, 199, 250, 0.3)',
        icon: CheckCircle,
      };
    } else if (quality >= 50) {
      return {
        level: 'Fair',
        color: '#fca311',
        bgColor: 'rgba(252, 163, 17, 0.1)',
        borderColor: 'rgba(252, 163, 17, 0.3)',
        icon: AlertCircle,
      };
    } else {
      return {
        level: 'Poor',
        color: '#e63946',
        bgColor: 'rgba(230, 57, 70, 0.1)',
        borderColor: 'rgba(230, 57, 70, 0.3)',
        icon: AlertCircle,
      };
    }
  }, [quality, isSynthetic]);

  const Icon = qualityStatus.icon;
  const normalizedConfidence = typeof confidence === 'number' && confidence <= 1
    ? Math.round(confidence * 100)
    : confidence || 0;

  const sourceIcon = useMemo(() => {
    switch (source?.toLowerCase()) {
      case 'ntes':
        return '🚂';
      case 'railyatri':
        return '📍';
      case 'merged':
        return '⚡';
      case 'schedule':
        return '📋';
      case 'synthetic':
        return '✨';
      default:
        return '📡';
    }
  }, [source]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="rounded-lg border p-4"
      style={{
        backgroundColor: qualityStatus.bgColor,
        borderColor: qualityStatus.borderColor,
      }}
    >
      {/* Header Row */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1">
          <motion.div animate={{ scale: [1, 1.05, 1] }} transition={{ duration: 2, repeat: Infinity }}>
            <Icon size={20} style={{ color: qualityStatus.color }} />
          </motion.div>
          <div className="flex-1 min-w-0">
            <label className="text-xs text-text-secondary font-semibold block mb-1">
              Data Quality
            </label>
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className="text-sm font-bold"
                style={{ color: qualityStatus.color }}
              >
                {qualityStatus.level}
              </span>
              <span className="text-sm text-text-secondary">
                {quality.toFixed(0)}%
              </span>
            </div>
          </div>
        </div>

        {/* Score Bar */}
        <div className="w-20 h-2 rounded-full bg-dark-card border border-dark-border overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${quality}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            style={{ backgroundColor: qualityStatus.color }}
            className="h-full"
          />
        </div>
      </div>

      {/* Detailed Information */}
      {showDetailed && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          transition={{ delay: 0.2 }}
          className="mt-4 space-y-3 pt-4 border-t border-dark-border"
        >
          {/* Source */}
          <div className="flex items-center gap-2 text-xs">
            <Database size={14} className="text-text-secondary shrink-0" />
            <span className="text-text-secondary">Source:</span>
            <span className="font-semibold text-text-primary">
              {sourceIcon} {source?.charAt(0).toUpperCase()}
              {source?.slice(1).toLowerCase() || 'Unknown'}
            </span>
          </div>

          {/* Confidence Score */}
          {normalizedConfidence > 0 && (
            <div className="flex items-center gap-2 text-xs">
              <TrendingUp size={14} className="text-accent-blue shrink-0" />
              <span className="text-text-secondary">Confidence:</span>
              <span className="font-semibold text-accent-blue">
                {normalizedConfidence}%
              </span>
            </div>
          )}

          {/* Snapping Info */}
          {trackSegmentName && (
            <div className="flex items-center gap-2 text-xs">
              <MapPin size={14} className="text-accent-green shrink-0" />
              <span className="text-text-secondary">Track:</span>
              <span className="font-semibold text-text-primary">
                {trackSegmentName}
                {snappingDistance !== undefined && (
                  <span className="text-text-secondary ml-1">
                    (±{snappingDistance.toFixed(2)} km)
                  </span>
                )}
              </span>
            </div>
          )}

          {/* Synthetic Warning */}
          {isSynthetic && (
            <div className="flex items-center gap-2 text-xs p-2 rounded bg-alert-orange/20 border border-alert-orange/30">
              <AlertCircle size={14} className="text-alert-orange shrink-0" />
              <span className="text-alert-orange">
                Using synthetic schedule data (live sources unavailable)
              </span>
            </div>
          )}

          {/* Last Updated */}
          {lastUpdated && (
            <div className="text-xs text-text-secondary flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              Updated {formatTimeAgo(lastUpdated)}
            </div>
          )}
        </motion.div>
      )}
    </motion.div>
  );
}

/**
 * Format time difference to human-readable string
 */
function formatTimeAgo(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (seconds < 60) return 'just now';
  if (minutes === 1) return '1 minute ago';
  if (minutes < 60) return `${minutes} minutes ago`;
  if (hours === 1) return '1 hour ago';
  if (hours < 24) return `${hours} hours ago`;

  const days = Math.floor(hours / 24);
  if (days === 1) return 'yesterday';
  return `${days} days ago`;
}
