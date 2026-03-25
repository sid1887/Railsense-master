'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart3,
  TrendingUp,
  Clock,
  AlertCircle,
  Zap,
  Users,
  Calendar,
  CheckCircle,
} from 'lucide-react';
import MetricsCard from '@/components/MetricsCard';
import RoutePerformanceChart from '@/components/RoutePerformanceChart';
import InsightsPanel from '@/components/InsightsPanel';

/**
 * Analytics Dashboard Page
 * Comprehensive system analytics and performance monitoring
 */
export default function AnalyticsDashboard() {
  const [timeRange, setTimeRange] = useState<'day' | 'week' | 'month'>('week');

  // Mock metrics data
  const metricsData = [
    {
      title: 'Average Delay',
      value: 12.5,
      unit: 'min',
      trend: -2.3,
      comparison: '↓ 2.3% vs last week',
      icon: <Clock size={20} />,
      color: 'bg-blue-900/30',
    },
    {
      title: 'On-Time %',
      value: 82.4,
      unit: '%',
      trend: 3.1,
      comparison: '↑ 3.1% vs last week',
      icon: <CheckCircle size={20} />,
      color: 'bg-green-900/30',
    },
    {
      title: 'System Health',
      value: 94.2,
      unit: '%',
      trend: 1.2,
      comparison: '↑ 1.2% vs last week',
      icon: <Zap size={20} />,
      color: 'bg-yellow-900/30',
    },
    {
      title: 'Prediction Accuracy',
      value: 87.6,
      unit: '%',
      trend: 2.8,
      comparison: '↑ 2.8% vs last month',
      icon: <TrendingUp size={20} />,
      color: 'bg-purple-900/30',
    },
    {
      title: 'Active Alerts',
      value: 14,
      unit: 'alerts',
      trend: -15.0,
      comparison: '↓ 15% fewer than average',
      icon: <AlertCircle size={20} />,
      color: 'bg-red-900/30',
    },
    {
      title: 'Route Efficiency',
      value: 76.8,
      unit: '%',
      trend: 5.2,
      comparison: '↑ 5.2% vs last week',
      icon: <BarChart3 size={20} />,
      color: 'bg-cyan-900/30',
    },
  ];

  // Mock route performance data
  const routePerformance = [
    {
      routeName: 'Route 1A (Central Express)',
      onTimePercentage: 89.5,
      averageDelay: 8.2,
      totalTrips: 156,
      delayedTrips: 16,
      cancelledTrips: 1,
    },
    {
      routeName: 'Route 2B (North Line)',
      onTimePercentage: 84.3,
      averageDelay: 12.1,
      totalTrips: 143,
      delayedTrips: 23,
      cancelledTrips: 2,
    },
    {
      routeName: 'Route 3C (East Express)',
      onTimePercentage: 92.1,
      averageDelay: 6.5,
      totalTrips: 178,
      delayedTrips: 14,
      cancelledTrips: 0,
    },
    {
      routeName: 'Route 4D (South Metro)',
      onTimePercentage: 71.2,
      averageDelay: 18.9,
      totalTrips: 132,
      delayedTrips: 38,
      cancelledTrips: 3,
    },
    {
      routeName: 'Route 5E (West Line)',
      onTimePercentage: 86.7,
      averageDelay: 11.3,
      totalTrips: 165,
      delayedTrips: 22,
      cancelledTrips: 1,
    },
  ];

  // Mock insights data
  const insights = [
    {
      level: 'success' as const,
      title: 'Excellent System Health',
      description: 'System operating at 94.2% efficiency with minimal issues detected',
    },
    {
      level: 'success' as const,
      title: 'Strong Prediction Accuracy',
      description: 'Model accuracy at 87.6% - highly reliable delay forecasting',
    },
    {
      level: 'warning' as const,
      title: 'Route 4D Under-Performing',
      description: 'South Metro line only 71.2% on-time. Investigate congestion patterns.',
      action: 'Review traffic patterns and resource allocation',
    },
    {
      level: 'info' as const,
      title: 'Peak Hour Approaching',
      description: 'Expect higher delays during evening rush hour (16:00-19:00)',
      action: 'Increase alert sensitivity and staffing',
    },
  ];

  // Mock system stats
  const systemStats = {
    totalTrains: 245,
    activeTrains: 187,
    scheduledTrips: 3421,
    completedTrips: 3187,
    delayedTrips: 389,
    cancelledTrips: 22,
    uptime: 99.87,
  };

  return (
    <div className="min-h-screen bg-dark-bg p-8">
      <div className="max-w-full mx-auto space-y-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <BarChart3 size={32} className="text-indigo-400" />
              <h1 className="text-3xl font-bold text-text-primary">Analytics Dashboard</h1>
            </div>

            {/* Time Range Selector */}
            <div className="flex gap-2">
              {(['day', 'week', 'month'] as const).map((range) => (
                <motion.button
                  key={range}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setTimeRange(range)}
                  className={`px-4 py-2 rounded font-semibold transition ${
                    timeRange === range
                      ? 'bg-blue-600 text-white'
                      : 'bg-dark-card border border-dark-border text-text-primary hover:border-blue-500'
                  }`}
                >
                  {range.charAt(0).toUpperCase() + range.slice(1)}
                </motion.button>
              ))}
            </div>
          </div>

          <p className="text-text-secondary">
            Real-time system performance and operational analytics
          </p>
        </motion.div>

        {/* Key Metrics Grid */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ staggerChildren: 0.05 }}
          className="grid grid-cols-3 gap-4"
        >
          {metricsData.map((metric, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
            >
              <MetricsCard
                title={metric.title}
                value={metric.value}
                unit={metric.unit}
                trend={metric.trend}
                comparison={metric.comparison}
                icon={metric.icon}
                color={metric.color}
              />
            </motion.div>
          ))}
        </motion.div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-3 gap-6">
          {/* Left Column: Route Performance */}
          <div className="col-span-2">
            <RoutePerformanceChart routes={routePerformance} />
          </div>

          {/* Right Column: Insights */}
          <InsightsPanel insights={insights} />
        </div>

        {/* System Statistics */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="grid grid-cols-4 gap-4"
        >
          {[
            { label: 'Active Trains', value: systemStats.activeTrains, total: systemStats.totalTrains },
            { label: 'Completed Trips', value: systemStats.completedTrips, total: systemStats.scheduledTrips },
            { label: 'Delayed Trips', value: systemStats.delayedTrips, percent: 11.4 },
            { label: 'System Uptime', value: systemStats.uptime, unit: '%' },
          ].map((stat, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + idx * 0.05 }}
              className="bg-dark-card border border-dark-border rounded-lg p-4 space-y-2"
            >
              <p className="text-sm text-text-secondary">{stat.label}</p>
              <div className="flex items-baseline gap-2">
                <p className="text-2xl font-bold text-text-primary">{stat.value}</p>
                {stat.unit && <p className="text-xs text-text-secondary">{stat.unit}</p>}
                {stat.total && (
                  <p className="text-xs text-text-secondary">/ {stat.total}</p>
                )}
                {stat.percent && (
                  <p className="text-xs text-orange-400">{stat.percent}%</p>
                )}
              </div>

              {stat.total && (
                <div className="w-full h-2 bg-dark-bg rounded overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-cyan-400"
                    style={{ width: `${(stat.value / stat.total) * 100}%` }}
                  />
                </div>
              )}
            </motion.div>
          ))}
        </motion.div>

        {/* Performance Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="grid grid-cols-3 gap-6"
        >
          {/* Delay Distribution */}
          <div className="bg-dark-card border border-dark-border rounded-lg p-6 space-y-4">
            <h3 className="text-lg font-semibold text-text-primary">Delay Distribution</h3>
            <div className="space-y-2 text-sm">
              {[
                { range: '0-5 min', percent: 45, color: 'bg-green-500' },
                { range: '5-15 min', percent: 30, color: 'bg-yellow-500' },
                { range: '15-30 min', percent: 18, color: 'bg-orange-500' },
                { range: '30+ min', percent: 7, color: 'bg-red-500' },
              ].map((item, idx) => (
                <div key={idx}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-text-secondary">{item.range}</span>
                    <span className="font-semibold text-text-primary">{item.percent}%</span>
                  </div>
                  <div className="w-full h-2 bg-dark-bg rounded overflow-hidden">
                    <div className={`h-full ${item.color}`} style={{ width: `${item.percent}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Peak Hours Analysis */}
          <div className="bg-dark-card border border-dark-border rounded-lg p-6 space-y-4">
            <h3 className="text-lg font-semibold text-text-primary flex items-center gap-2">
              <Calendar size={20} className="text-cyan-400" />
              Peak Hours
            </h3>
            <div className="space-y-2 text-sm">
              {[
                { time: '07:00-10:00', severity: 'high', impact: '45% higher delays' },
                { time: '12:00-14:00', severity: 'medium', impact: '25% higher delays' },
                { time: '16:00-20:00', severity: 'high', impact: '50% higher delays' },
              ].map((peak, idx) => (
                <div
                  key={idx}
                  className={`p-2 rounded border ${
                    peak.severity === 'high'
                      ? 'bg-red-900/20 border-red-700'
                      : 'bg-yellow-900/20 border-yellow-700'
                  }`}
                >
                  <p className="font-semibold text-text-primary">{peak.time}</p>
                  <p className="text-xs text-text-secondary">{peak.impact}</p>
                </div>
              ))}
            </div>
          </div>

          {/* System Health Indicators */}
          <div className="bg-dark-card border border-dark-border rounded-lg p-6 space-y-4">
            <h3 className="text-lg font-semibold text-text-primary flex items-center gap-2">
              <Zap size={20} className="text-yellow-400" />
              Health Indicators
            </h3>
            <div className="space-y-3 text-sm">
              {[
                { label: 'Network Stability', value: 96, color: 'text-green-400' },
                { label: 'API Response Time', value: 89, color: 'text-green-400' },
                { label: 'Database Performance', value: 94, color: 'text-green-400' },
                { label: 'Prediction Engine', value: 87, color: 'text-yellow-400' },
              ].map((indicator, idx) => (
                <div key={idx}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-text-secondary">{indicator.label}</span>
                    <span className={`font-semibold ${indicator.color}`}>{indicator.value}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-dark-bg rounded overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-green-500 to-green-400"
                      style={{ width: `${indicator.value}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
