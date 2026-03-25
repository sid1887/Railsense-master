'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, AlertCircle } from 'lucide-react';

interface RoutePerformanceData {
  routeName: string;
  onTimePercentage: number;
  averageDelay: number;
  totalTrips: number;
  delayedTrips: number;
  cancelledTrips: number;
}

interface RoutePerformanceProps {
  routes: RoutePerformanceData[];
}

/**
 * Route Performance Chart Component
 * Displays route-wise performance metrics
 */
export default function RoutePerformanceChart({ routes }: RoutePerformanceProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-dark-card border border-dark-border rounded-lg p-6 space-y-4"
    >
      <h3 className="text-lg font-semibold text-text-primary flex items-center gap-2">
        <TrendingUp size={20} className="text-cyan-400" />
        Route Performance
      </h3>

      <div className="space-y-3 max-h-96 overflow-y-auto">
        {routes.map((route, idx) => {
          const performanceColor =
            route.onTimePercentage >= 85
              ? 'text-green-400'
              : route.onTimePercentage >= 75
                ? 'text-yellow-400'
                : 'text-red-400';

          return (
            <motion.div
              key={idx}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="bg-dark-bg rounded p-4 space-y-2"
            >
              {/* Route name and status */}
              <div className="flex items-center justify-between">
                <p className="font-semibold text-text-primary text-sm">{route.routeName}</p>
                <span className={`text-sm font-bold ${performanceColor}`}>
                  {route.onTimePercentage.toFixed(1)}%
                </span>
              </div>

              {/* Performance bar */}
              <div className="w-full h-2 bg-dark-border rounded overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${route.onTimePercentage}%` }}
                  transition={{ duration: 0.5 }}
                  className={`h-full ${
                    route.onTimePercentage >= 85
                      ? 'bg-green-500'
                      : route.onTimePercentage >= 75
                        ? 'bg-yellow-500'
                        : 'bg-red-500'
                  }`}
                />
              </div>

              {/* Stats */}
              <div className="grid grid-cols-4 gap-2 text-xs">
                <div>
                  <p className="text-text-secondary">Trips</p>
                  <p className="font-semibold text-text-primary">{route.totalTrips}</p>
                </div>
                <div>
                  <p className="text-text-secondary">Delayed</p>
                  <p className="font-semibold text-orange-400">{route.delayedTrips}</p>
                </div>
                <div>
                  <p className="text-text-secondary">Avg Delay</p>
                  <p className="font-semibold text-text-primary">
                    {route.averageDelay.toFixed(1)}m
                  </p>
                </div>
                <div>
                  <p className="text-text-secondary">Cancelled</p>
                  <p className="font-semibold text-red-400">{route.cancelledTrips}</p>
                </div>
              </div>

              {/* Alert if needed */}
              {route.onTimePercentage < 75 && (
                <div className="flex items-center gap-1 text-xs text-orange-400 mt-2">
                  <AlertCircle size={14} />
                  Below target performance
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
