'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Trash2, AlertTriangle, Check, Clock } from 'lucide-react';

interface DataRetentionBadgeProps {
  dataType: string;
  createdAt: number; // Unix timestamp
  daysRemaining: number;
  showDetails?: boolean;
}

/**
 * Data Retention Badge Component
 * Shows data age and when it will be deleted
 */
export default function DataRetentionBadge({
  dataType,
  createdAt,
  daysRemaining,
  showDetails = false,
}: DataRetentionBadgeProps) {
  const createdDate = new Date(createdAt);
  const deletionDate = new Date(createdAt + daysRemaining * 24 * 60 * 60 * 1000);
  const daysOld = Math.floor((Date.now() - createdAt) / (24 * 60 * 60 * 1000));

  const isExpiring = daysRemaining < 7;
  const isExpired = daysRemaining === 0;

  const getColor = () => {
    if (isExpired) return { icon: 'text-red-500', bg: 'bg-red-900/20', border: 'border-red-700' };
    if (isExpiring) return { icon: 'text-orange-500', bg: 'bg-orange-900/20', border: 'border-orange-700' };
    if (daysRemaining < 30) return { icon: 'text-yellow-500', bg: 'bg-yellow-900/20', border: 'border-yellow-700' };
    return { icon: 'text-green-500', bg: 'bg-green-900/20', border: 'border-green-700' };
  };

  const colors = getColor();

  const getIcon = () => {
    if (isExpired) return Trash2;
    if (isExpiring) return AlertTriangle;
    if (daysRemaining < 30) return Clock;
    return Check;
  };

  const Icon = getIcon();

  const getStatusText = () => {
    if (isExpired) return 'EXPIRED';
    if (isExpiring) return `${daysRemaining}d left`;
    if (daysRemaining < 30) return `${daysRemaining}d remaining`;
    return `${daysRemaining}d retention`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-semibold ${colors.bg} ${colors.border}`}
    >
      <Icon size={14} className={colors.icon} />
      <span className="text-text-primary">{getStatusText()}</span>

      {/* Detailed Tooltip */}
      {showDetails && (
        <div className="absolute top-full left-0 mt-2 p-3 bg-dark-card border border-dark-border rounded-lg shadow-lg text-xs whitespace-nowrap z-50">
          <div className="text-text-secondary mb-2">
            <p>Created: {createdDate.toLocaleDateString()}</p>
            <p>Age: {daysOld} days</p>
            <p>Deletion: {deletionDate.toLocaleDateString()}</p>
          </div>
          <div className="text-text-secondary text-xs">
            <p>Type: {dataType}</p>
          </div>
        </div>
      )}
    </motion.div>
  );
}
