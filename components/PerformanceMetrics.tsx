'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, BarChart3, AlertCircle, CheckCircle, Activity } from 'lucide-react';

interface LoadTestMetrics {
  avgResponseTime: number;
  p50ResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  maxResponseTime: number;
  minResponseTime: number;
  throughput: number;
  errorRate: number;
}

interface PerformanceMetricsProps {
  metrics: LoadTestMetrics;
  throughputTarget?: number;
  latencyTarget?: number;
  errorRateTarget?: number;
}

/**
 * Performance Metrics Component
 * Displays load test results and performance indicators
 */
export default function PerformanceMetrics({
  metrics,
  throughputTarget = 1000,
  latencyTarget = 500,
  errorRateTarget = 1,
}: PerformanceMetricsProps) {
  const [displayMetrics, setDisplayMetrics] = useState<LoadTestMetrics>(metrics);

  useEffect(() => {
    setDisplayMetrics(metrics);
  }, [metrics]);

  const getMetricStatus = (value: number, target: number, isInverse = false) => {
    const passed = isInverse ? value <= target : value >= target;
    return passed ? 'text-green-400' : 'text-orange-400';
  };

  const metricCards = [
    {
      label: 'Throughput',
      value: Math.round(displayMetrics.throughput),
      unit: 'RPS',
      target: `> ${throughputTarget}`,
      status: getMetricStatus(displayMetrics.throughput, throughputTarget),
      icon: TrendingUp,
    },
    {
      label: 'Avg Response Time',
      value: Math.round(displayMetrics.avgResponseTime),
      unit: 'ms',
      target: `< ${latencyTarget}`,
      status: getMetricStatus(displayMetrics.avgResponseTime, latencyTarget, true),
      icon: BarChart3,
    },
    {
      label: 'P95 Latency',
      value: Math.round(displayMetrics.p95ResponseTime),
      unit: 'ms',
      target: `< ${latencyTarget}`,
      status: getMetricStatus(displayMetrics.p95ResponseTime, latencyTarget, true),
      icon: Activity,
    },
    {
      label: 'Error Rate',
      value: displayMetrics.errorRate.toFixed(2),
      unit: '%',
      target: `< ${errorRateTarget}`,
      status: getMetricStatus(displayMetrics.errorRate, errorRateTarget, true),
      icon: AlertCircle,
    },
  ];

  return (
    <div className="space-y-4">
      {/* Key Metrics Grid */}
      <div className="grid grid-cols-4 gap-3">
        {metricCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <motion.div
              key={idx}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.05 }}
              className="bg-dark-card border border-dark-border rounded-lg p-4 space-y-2"
            >
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold text-text-primary">{card.label}</h4>
                <Icon size={16} className={card.status} />
              </div>

              <div className="flex items-baseline gap-1">
                <span className={`text-2xl font-bold ${card.status}`}>{card.value}</span>
                <span className="text-xs text-text-secondary">{card.unit}</span>
              </div>

              <div className="text-xs text-text-secondary">
                Target: {card.target}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Response Time Distribution */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-dark-card border border-dark-border rounded-lg p-4"
      >
        <h4 className="font-semibold text-text-primary mb-3">Response Time Distribution</h4>

        <div className="space-y-2">
          {[
            { label: 'Min', value: displayMetrics.minResponseTime },
            { label: 'P50', value: displayMetrics.p50ResponseTime },
            { label: 'P95', value: displayMetrics.p95ResponseTime },
            { label: 'P99', value: displayMetrics.p99ResponseTime },
            { label: 'Max', value: displayMetrics.maxResponseTime },
          ].map((item, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 + idx * 0.05 }}
              className="flex items-center gap-3"
            >
              <span className="text-xs font-semibold text-text-secondary w-8">{item.label}</span>
              <div className="flex-1 bg-dark-bg rounded h-6 relative overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(item.value / displayMetrics.maxResponseTime) * 100}%` }}
                  transition={{ duration: 0.5 }}
                  className={`h-full rounded ${
                    item.value > latencyTarget
                      ? 'bg-orange-500'
                      : item.value > latencyTarget * 0.7
                        ? 'bg-yellow-500'
                        : 'bg-green-500'
                  }`}
                />
              </div>
              <span className="text-sm font-semibold text-text-primary w-12 text-right">
                {Math.round(item.value)}ms
              </span>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Pass/Fail Status */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="grid grid-cols-3 gap-3"
      >
        {[
          {
            name: 'Throughput',
            passed: displayMetrics.throughput >= throughputTarget,
            value: `${Math.round(displayMetrics.throughput)} RPS`,
          },
          {
            name: 'Latency',
            passed: displayMetrics.p95ResponseTime <= latencyTarget,
            value: `${Math.round(displayMetrics.p95ResponseTime)}ms (P95)`,
          },
          {
            name: 'Errors',
            passed: displayMetrics.errorRate <= errorRateTarget,
            value: `${displayMetrics.errorRate.toFixed(2)}%`,
          },
        ].map((status, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 + idx * 0.05 }}
            className={`p-3 rounded-lg border flex items-center gap-3 ${
              status.passed
                ? 'bg-green-900/20 border-green-700'
                : 'bg-orange-900/20 border-orange-700'
            }`}
          >
            {status.passed ? (
              <CheckCircle size={20} className="text-green-400 shrink-0" />
            ) : (
              <AlertCircle size={20} className="text-orange-400 shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-text-primary">{status.name}</p>
              <p className="text-xs text-text-secondary truncate">{status.value}</p>
            </div>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}
