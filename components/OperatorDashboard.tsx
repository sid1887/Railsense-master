'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Activity, TrendingDown, Clock, Zap, MapPin, Radio } from 'lucide-react';
import RailLoader from '@/components/RailLoader';

interface TrafficMetrics {
  timestamp: string;
  overallStatus: 'good' | 'caution' | 'warning' | 'critical';
  bottleneckCount: number;
  criticalSections: Array<{
    sectionCode: string;
    sectionName: string;
    congestionLevel: string;
    affectedTrains: number;
    estimatedDuration: number;
  }>;
  mostProblematicSections: Array<{
    sectionCode: string;
    sectionName: string;
    haltCount: number;
    avgDelay: number;
  }>;
}

/**
 * OperatorDashboard Component
 * Real-time traffic management dashboard for station operators/staff
 * Shows bottlenecks, critical sections, and recommended actions
 */
export default function OperatorDashboard() {
  const [metrics, setMetrics] = useState<TrafficMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/traffic-analysis?type=summary');
        if (!response.ok) throw new Error('Failed to fetch metrics');
        const data = await response.json();
        setMetrics(data.result || data);
        setError(null);
      } catch (err) {
        console.error('Dashboard error:', err);
        setError(err instanceof Error ? err.message : 'Failed to load metrics');
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();

    if (autoRefresh) {
      const interval = setInterval(fetchMetrics, 30000); // Refresh every 30s
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  if (loading && !metrics) {
    return (
      <div className="min-h-screen bg-dark-bg p-6 flex items-center justify-center">
        <div className="text-center">
          <RailLoader size="lg" className="mx-auto mb-4" />
          <p className="text-text-secondary">Loading operator dashboard...</p>
        </div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="min-h-screen bg-dark-bg p-6">
        <div className="rounded-lg border border-alert-orange/30 bg-alert-orange/10 p-8 text-center">
          <AlertTriangle size={32} className="text-alert-orange mx-auto mb-4" />
          <p className="text-alert-orange font-semibold">{error || 'Unable to load dashboard'}</p>
        </div>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'critical':
        return { bg: 'rgba(230, 57, 70, 0.15)', border: '#e63946', text: '#e63946', label: 'CRITICAL' };
      case 'warning':
        return { bg: 'rgba(252, 163, 17, 0.15)', border: '#fca311', text: '#fca311', label: 'WARNING' };
      case 'caution':
        return { bg: 'rgba(88, 199, 250, 0.15)', border: '#58c7fa', text: '#58c7fa', label: 'CAUTION' };
      default:
        return { bg: 'rgba(29, 209, 176, 0.15)', border: '#1dd1b0', text: '#1dd1b0', label: 'GOOD' };
    }
  };

  const statusInfo = getStatusColor(metrics.overallStatus);

  return (
    <div className="min-h-screen bg-dark-bg">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="sticky top-0 z-50 bg-dark-card border-b border-dark-border p-6 backdrop-blur-md"
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-lg" style={{ backgroundColor: statusInfo.bg }}>
              <Radio size={24} style={{ color: statusInfo.text }} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-text-primary">Traffic Control</h1>
              <p className="text-xs text-text-secondary">Real-time Network Management</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Auto-Refresh Toggle */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
                autoRefresh
                  ? 'bg-accent-blue/20 text-accent-blue border border-accent-blue/50'
                  : 'bg-dark-bg border border-dark-border text-text-secondary'
              }`}
            >
              {autoRefresh ? '🔄 Auto' : 'Paused'}
            </motion.button>

            {/* Overall Status Badge */}
            <motion.div
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="px-4 py-2 rounded-lg font-bold text-sm border-2"
              style={{
                backgroundColor: statusInfo.bg,
                borderColor: statusInfo.border,
                color: statusInfo.text,
              }}
            >
              {statusInfo.label}
            </motion.div>
          </div>
        </div>
      </motion.div>

      {/* Main Content */}
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Key Metrics Row */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ staggerChildren: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-4 gap-4"
        >
          {/* Bottleneck Count */}
          <motion.div
            whileHover={{ scale: 1.02 }}
            className="p-6 rounded-lg border border-dark-border bg-dark-card hover:glow-red transition-all"
          >
            <div className="flex items-center justify-between mb-3">
              <AlertTriangle size={20} className="text-alert-orange" />
              <span className="text-4xl font-bold text-alert-orange">{metrics.bottleneckCount}</span>
            </div>
            <p className="text-sm text-text-secondary">Active Bottlenecks</p>
            <p className="text-xs text-text-secondary mt-1">Requiring attention</p>
          </motion.div>

          {/* Network Status */}
          <motion.div
            whileHover={{ scale: 1.02 }}
            className="p-6 rounded-lg border border-dark-border bg-dark-card hover:glow-blue transition-all"
          >
            <div className="flex items-center justify-between mb-3">
              <Activity size={20} style={{ color: statusInfo.text }} />
              <span className="text-2xl font-bold" style={{ color: statusInfo.text }}>
                {metrics.criticalSections.length}
              </span>
            </div>
            <p className="text-sm text-text-secondary">Critical Sections</p>
            <p className="text-xs text-text-secondary mt-1">High congestion</p>
          </motion.div>

          {/* Avg Train Delay */}
          <motion.div
            whileHover={{ scale: 1.02 }}
            className="p-6 rounded-lg border border-dark-border bg-dark-card hover:glow-yellow transition-all"
          >
            <div className="flex items-center justify-between mb-3">
              <Clock size={20} className="text-accent-yellow" />
              <span className="text-4xl font-bold text-accent-yellow">
                {metrics.mostProblematicSections[0]?.avgDelay || 0}
              </span>
            </div>
            <p className="text-sm text-text-secondary">Max Avg Delay</p>
            <p className="text-xs text-text-secondary mt-1">Minutes</p>
          </motion.div>

          {/* Last Update */}
          <motion.div
            whileHover={{ scale: 1.02 }}
            className="p-6 rounded-lg border border-dark-border bg-dark-card hover:glow-green transition-all"
          >
            <div className="flex items-center justify-between mb-3">
              <Zap size={20} className="text-accent-green" />
              <span className="w-2 h-2 rounded-full bg-accent-green animate-pulse" />
            </div>
            <p className="text-sm text-text-secondary">System Status</p>
            <p className="text-xs color-accent-green mt-1">Live & Monitoring</p>
          </motion.div>
        </motion.div>

        {/* Critical Sections */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="rounded-lg border border-dark-border bg-dark-card p-6"
        >
          <h2 className="font-bold text-text-primary mb-4 flex items-center gap-2">
            <AlertTriangle size={20} className="text-alert-orange" />
            Critical Sections Requiring Immediate Action
          </h2>

          <AnimatePresence mode="wait">
            {metrics.criticalSections.length > 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-3"
              >
                {metrics.criticalSections.map((section, idx) => (
                  <motion.div
                    key={section.sectionCode}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    whileHover={{ scale: 1.01 }}
                    onClick={() => setSelectedSection(section.sectionCode)}
                    className="p-4 rounded-lg border border-alert-orange/30 bg-alert-orange/10 cursor-pointer hover:bg-alert-orange/20 transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-text-primary flex items-center gap-2">
                          <MapPin size={16} className="text-alert-orange" />
                          {section.sectionName}
                        </h3>
                        <div className="grid grid-cols-3 gap-4 mt-2 text-xs">
                          <div>
                            <p className="text-text-secondary">Congestion</p>
                            <p className="font-bold text-alert-orange">{section.congestionLevel}</p>
                          </div>
                          <div>
                            <p className="text-text-secondary">Trains</p>
                            <p className="font-bold text-text-primary">{section.affectedTrains}</p>
                          </div>
                          <div>
                            <p className="text-text-secondary">Est. Duration</p>
                            <p className="font-bold text-text-primary">{section.estimatedDuration}m</p>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          className="px-4 py-2 rounded-lg bg-accent-blue/20 text-accent-blue font-semibold text-sm hover:bg-accent-blue/30 transition-all"
                        >
                          Manage
                        </motion.button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            ) : (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-text-secondary text-center py-8"
              >
                ✓ All sections operating normally
              </motion.p>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Problematic Sections */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="rounded-lg border border-dark-border bg-dark-card p-6"
        >
          <h2 className="font-bold text-text-primary mb-4 flex items-center gap-2">
            <TrendingDown size={20} className="text-accent-yellow" />
            Sections with Frequent Halts
          </h2>

          <div className="space-y-2">
            {metrics.mostProblematicSections.map((section, idx) => (
              <motion.div
                key={section.sectionCode}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="flex items-center justify-between p-3 rounded-lg bg-dark-bg hover:bg-dark-bg/80 border border-dark-border/50 transition-all"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-text-primary truncate">{section.sectionName}</p>
                  <p className="text-xs text-text-secondary">{section.haltCount} halts recorded</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-alert-orange">+{section.avgDelay}m</p>
                  <p className="text-xs text-text-secondary">avg delay</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
