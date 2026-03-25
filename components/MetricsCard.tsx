'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface MetricsCardProps {
  title: string;
  value: number;
  unit: string;
  trend: number;
  comparison: string;
  icon: React.ReactNode;
  color: string;
}

/**
 * Metrics Card Component
 * Displays individual metric with trend indicator
 */
export default function MetricsCard({
  title,
  value,
  unit,
  trend,
  comparison,
  icon,
  color,
}: MetricsCardProps) {
  const isPositive = trend >= 0;
  const trendIcon = isPositive ? <TrendingUp size={16} /> : <TrendingDown size={16} />;
  const trendColor = isPositive ? 'text-green-400' : 'text-red-400';

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className="bg-dark-card border border-dark-border hover:border-blue-500 rounded-lg p-6 space-y-4 transition cursor-pointer"
    >
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-text-primary">{title}</h3>
        <div className={`p-2 rounded-lg ${color}`}>{icon}</div>
      </div>

      <div className="space-y-1">
        <div className="flex items-baseline gap-1">
          <span className="text-3xl font-bold text-text-primary">{value}</span>
          <span className="text-sm text-text-secondary">{unit}</span>
        </div>

        <div className={`flex items-center gap-1 text-sm font-semibold ${trendColor}`}>
          {trendIcon}
          <span>{Math.abs(trend).toFixed(1)}%</span>
        </div>
      </div>

      <p className="text-xs text-text-secondary">{comparison}</p>
    </motion.div>
  );
}
