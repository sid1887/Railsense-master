'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Trash2, Calendar, BarChart3, RefreshCw, AlertTriangle, Check } from 'lucide-react';
import RailLoader from '@/components/RailLoader';

interface RetentionPolicy {
  dataType: string;
  retentionDays: number;
  description: string;
  autoCleanup: boolean;
}

interface CleanupSchedule {
  dataType: string;
  lastCleanup: string | null;
  nextCleanup: string;
}

interface StorageImpact {
  dataType: string;
  currentSizeMB: number;
  daysUntilDeletion: number;
  willFree: boolean;
}

/**
 * Data Retention Management Page
 */
export default function DataRetentionPage() {
  const [policies, setPolicies] = useState<RetentionPolicy[]>([]);
  const [schedule, setSchedule] = useState<CleanupSchedule[]>([]);
  const [storageImpact, setStorageImpact] = useState<StorageImpact[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRetentionData();
  }, []);

  const fetchRetentionData = async () => {
    setLoading(true);
    try {
      // Fetch policies
      const policiesRes = await fetch('/api/data-retention?action=policies');
      const policiesData = await policiesRes.json();
      setPolicies(policiesData.policies);

      // Fetch schedule
      const scheduleRes = await fetch('/api/data-retention?action=schedule');
      const scheduleData = await scheduleRes.json();
      setSchedule(scheduleData.schedule);

      // Fetch impact
      const impactRes = await fetch('/api/data-retention?action=impact');
      const impactData = await impactRes.json();
      setStorageImpact(impactData.impact.breakdownByType);
    } catch (error) {
      console.error('Failed to fetch retention data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCleanup = async (dataType: string) => {
    try {
      const res = await fetch('/api/data-retention', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cleanup', dataType }),
      });

      if (res.ok) {
        const data = await res.json();
        alert(`Cleanup executed: ${data.recordsDeleted} records deleted`);
        fetchRetentionData();
      }
    } catch (error) {
      console.error('Cleanup failed:', error);
    }
  };

  const totalSize = storageImpact?.reduce((sum, item) => sum + item.currentSizeMB, 0) || 0;
  const willFreeSize =
    storageImpact?.reduce((sum, item) => (item.willFree ? sum + item.currentSizeMB : sum), 0) || 0;

  return (
    <div className="min-h-screen bg-dark-bg p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-4xl font-bold text-text-primary mb-2 flex items-center gap-3">
            <Trash2 size={40} className="text-orange-500" />
            Data Retention Management
          </h1>
          <p className="text-text-secondary">
            Configure automatic cleanup policies and manage data lifecycle
          </p>
        </motion.div>

        {/* Policies Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8"
        >
          <h2 className="text-2xl font-bold text-text-primary mb-4">Retention Policies</h2>

          {loading ? (
            <div className="flex items-center justify-center py-12 gap-3 text-text-secondary">
              <RailLoader size="sm" />
              Loading policies...
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {policies.map((policy, idx) => (
                <motion.div
                  key={policy.dataType}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + idx * 0.05 }}
                  className="bg-dark-card border border-dark-border rounded-lg p-4 space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-text-primary">{policy.dataType}</h3>
                      <p className="text-xs text-text-secondary mt-1">{policy.description}</p>
                    </div>
                    {policy.autoCleanup && (
                      <span className="px-2 py-1 rounded bg-green-900/30 border border-green-700 text-xs font-semibold text-green-300">
                        Auto
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between px-3 py-2 bg-dark-bg rounded">
                    <span className="text-xs text-text-secondary">Retention Period</span>
                    <span className="font-bold text-accent-blue">{policy.retentionDays} days</span>
                  </div>

                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleCleanup(policy.dataType)}
                    className="w-full px-3 py-2 rounded text-xs font-semibold bg-orange-600 hover:bg-orange-700 text-white transition-all"
                  >
                    Run Cleanup Now
                  </motion.button>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Cleanup Schedule */}
        {schedule.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mb-8"
          >
            <h2 className="text-2xl font-bold text-text-primary mb-4 flex items-center gap-2">
              <Calendar size={24} />
              Cleanup Schedule
            </h2>

            <div className="bg-dark-card border border-dark-border rounded-lg p-4">
              <div className="space-y-2">
                {schedule.map((item, idx) => (
                  <motion.div
                    key={item.dataType}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 + idx * 0.05 }}
                    className="flex items-center justify-between p-3 bg-dark-bg rounded border border-dark-border/50"
                  >
                    <div className="flex-1">
                      <p className="font-semibold text-text-primary text-sm">{item.dataType}</p>
                      <p className="text-xs text-text-secondary mt-1">
                        Last cleanup: {item.lastCleanup ? new Date(item.lastCleanup).toLocaleDateString() : 'Never'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-accent-blue">
                        {new Date(item.nextCleanup).toLocaleDateString()}
                      </p>
                      <p className="text-xs text-text-secondary">Next cleanup</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* Storage Impact Analysis */}
        {storageImpact && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <h2 className="text-2xl font-bold text-text-primary mb-4 flex items-center gap-2">
              <BarChart3 size={24} />
              Storage Impact Analysis
            </h2>

            {/* Summary Cards */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.35 }}
                className="bg-dark-card border border-dark-border rounded-lg p-4"
              >
                <p className="text-xs text-text-secondary mb-1">Total Storage</p>
                <p className="text-3xl font-bold text-text-primary">{totalSize.toFixed(0)} MB</p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.4 }}
                className="bg-dark-card border border-dark-border rounded-lg p-4"
              >
                <p className="text-xs text-text-secondary mb-1">To Be Freed</p>
                <p className="text-3xl font-bold text-orange-400">{willFreeSize.toFixed(0)} MB</p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.45 }}
                className="bg-dark-card border border-dark-border rounded-lg p-4"
              >
                <p className="text-xs text-text-secondary mb-1">Free Percentage</p>
                <p className="text-3xl font-bold text-green-400">
                  {totalSize > 0 ? ((willFreeSize / totalSize) * 100).toFixed(1) : 0}%
                </p>
              </motion.div>
            </div>

            {/* Breakdown */}
            <div className="bg-dark-card border border-dark-border rounded-lg p-4">
              <div className="space-y-3">
                {storageImpact.map((item, idx) => (
                  <motion.div
                    key={item.dataType}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.35 + idx * 0.05 }}
                    className="space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-text-primary text-sm">{item.dataType}</p>
                          {item.willFree ? (
                            <AlertTriangle size={14} className="text-orange-500" />
                          ) : (
                            <Check size={14} className="text-green-500" />
                          )}
                        </div>
                        <p className="text-xs text-text-secondary">
                          Deletes in {item.daysUntilDeletion} days
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-text-primary">{item.currentSizeMB}MB</p>
                        <p className="text-xs text-text-secondary">
                          {((item.currentSizeMB / totalSize) * 100).toFixed(1)}% of total
                        </p>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-dark-bg rounded-full h-2">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${(item.currentSizeMB / totalSize) * 100}%` }}
                        transition={{ duration: 0.5 }}
                        className={`h-full rounded-full ${item.willFree ? 'bg-orange-500' : 'bg-green-500'}`}
                      />
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* Info Section */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-12 bg-accent-blue/10 border border-accent-blue/30 rounded-lg p-6 space-y-3"
        >
          <h3 className="text-lg font-semibold text-accent-blue mb-3">Retention Policy Details</h3>
          <ul className="text-text-secondary text-sm space-y-1 list-disc list-inside">
            <li>
              <strong>Train Snapshots:</strong> 90 days (operational value for live tracking)
            </li>
            <li>
              <strong>Halt Events:</strong> 180 days (analytics and pattern analysis)
            </li>
            <li>
              <strong>Congestion Metrics:</strong> 365 days (long-term traffic analysis)
            </li>
            <li>
              <strong>Data Quality Logs:</strong> 30 days (recent system performance)
            </li>
            <li>
              <strong>User Sessions:</strong> 7 days (privacy protection)
            </li>
            <li>
              <strong>API Audit Logs:</strong> 90 days (manual review recommended)
            </li>
          </ul>
        </motion.div>
      </div>
    </div>
  );
}
