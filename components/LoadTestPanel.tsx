'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Play, Triangle, Zap, Users, Clock, Database } from 'lucide-react';
import { loadTestService } from '@/services/loadTestService';

interface LoadTestPanelProps {
  onTestComplete?: (result: any) => void;
  onTestStart?: () => void;
}

/**
 * Load Test Configuration Panel
 * Allows users to configure and run load tests with custom parameters
 */
export default function LoadTestPanel({ onTestComplete, onTestStart }: LoadTestPanelProps) {
  const [config, setConfig] = useState({
    name: `Load Test ${new Date().toLocaleTimeString()}`,
    duration: 10000, // 10 seconds for demo
    requestsPerSecond: 100,
    concurrentUsers: 10,
    targetEndpoint: '/api/predict',
    dataSize: 'medium' as 'small' | 'medium' | 'large',
  });

  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [progress, setProgress] = useState(0);

  const presetConfigs = [
    {
      name: 'Light Load',
      duration: 10000,
      rps: 50,
      users: 5,
    },
    {
      name: 'Medium Load',
      duration: 30000,
      rps: 100,
      users: 10,
    },
    {
      name: 'Heavy Load',
      duration: 60000,
      rps: 500,
      users: 50,
    },
    {
      name: 'Stress Test',
      duration: 120000,
      rps: 1000,
      users: 100,
    },
  ];

  const handleStartTest = async () => {
    setIsRunning(true);
    setProgress(0);
    onTestStart?.();

    // Simulate progress updates
    const progressInterval = setInterval(() => {
      setProgress((prev) => Math.min(prev + 10, 90));
    }, 500);

    try {
      const testResult = await loadTestService.runLoadTest({
        ...config,
        name: `${config.name} - ${new Date().toLocaleTimeString()}`,
      });

      clearInterval(progressInterval);
      setProgress(100);
      setResult(testResult);
      onTestComplete?.(testResult);

      // Auto-reset progress after 2 seconds
      setTimeout(() => setProgress(0), 2000);
    } catch (error) {
      console.error('Test failed:', error);
      clearInterval(progressInterval);
      setProgress(0);
    } finally {
      setIsRunning(false);
    }
  };

  const handlePreset = (preset: (typeof presetConfigs)[0]) => {
    setConfig({
      ...config,
      name: preset.name,
      duration: preset.duration,
      requestsPerSecond: preset.rps,
      concurrentUsers: preset.users,
    });
  };

  const dataSizeValues = {
    small: 100,
    medium: 500,
    large: 1000,
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-dark-card border border-dark-border rounded-lg p-6 space-y-6"
    >
      {/* Test Configuration Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-text-primary flex items-center gap-2">
          <Zap size={20} className="text-yellow-400" />
          Test Configuration
        </h3>

        <div className="grid grid-cols-2 gap-4">
          {/* Duration */}
          <div>
            <label className="text-sm font-semibold text-text-primary mb-1 block">
              <Clock size={16} className="inline mr-1" />
              Duration (ms)
            </label>
            <input
              type="number"
              min="1000"
              step="1000"
              value={config.duration}
              onChange={(e) =>
                setConfig({ ...config, duration: parseInt(e.target.value) })
              }
              disabled={isRunning}
              className="w-full px-3 py-2 bg-dark-bg border border-dark-border rounded text-text-primary focus:outline-none focus:border-blue-500 disabled:opacity-50"
            />
            <p className="text-xs text-text-secondary mt-1">
              {(config.duration / 1000).toFixed(1)} seconds
            </p>
          </div>

          {/* RPS */}
          <div>
            <label className="text-sm font-semibold text-text-primary mb-1 block">
              <Triangle size={16} className="inline mr-1" />
              Requests/sec
            </label>
            <input
              type="number"
              min="1"
              max="10000"
              step="10"
              value={config.requestsPerSecond}
              onChange={(e) =>
                setConfig({ ...config, requestsPerSecond: parseInt(e.target.value) })
              }
              disabled={isRunning}
              className="w-full px-3 py-2 bg-dark-bg border border-dark-border rounded text-text-primary focus:outline-none focus:border-blue-500 disabled:opacity-50"
            />
            <p className="text-xs text-text-secondary mt-1">
              {Math.round((config.duration / 1000) * config.requestsPerSecond)} total requests
            </p>
          </div>

          {/* Concurrent Users */}
          <div>
            <label className="text-sm font-semibold text-text-primary mb-1 block">
              <Users size={16} className="inline mr-1" />
              Concurrent Users
            </label>
            <input
              type="number"
              min="1"
              max="1000"
              step="5"
              value={config.concurrentUsers}
              onChange={(e) =>
                setConfig({ ...config, concurrentUsers: parseInt(e.target.value) })
              }
              disabled={isRunning}
              className="w-full px-3 py-2 bg-dark-bg border border-dark-border rounded text-text-primary focus:outline-none focus:border-blue-500 disabled:opacity-50"
            />
          </div>

          {/* Data Size */}
          <div>
            <label className="text-sm font-semibold text-text-primary mb-1 block">
              <Database size={16} className="inline mr-1" />
              Data Size
            </label>
            <select
              value={config.dataSize}
              onChange={(e) =>
                setConfig ({
                  ...config,
                  dataSize: e.target.value as 'small' | 'medium' | 'large',
                })
              }
              disabled={isRunning}
              className="w-full px-3 py-2 bg-dark-bg border border-dark-border rounded text-text-primary focus:outline-none focus:border-blue-500 disabled:opacity-50"
            >
              <option value="small">Small (100 bytes)</option>
              <option value="medium">Medium (500 bytes)</option>
              <option value="large">Large (1000 bytes)</option>
            </select>
          </div>
        </div>

        {/* Test Name */}
        <div>
          <label className="text-sm font-semibold text-text-primary mb-1 block">
            Test Name
          </label>
          <input
            type="text"
            value={config.name}
            onChange={(e) => setConfig({ ...config, name: e.target.value })}
            disabled={isRunning}
            className="w-full px-3 py-2 bg-dark-bg border border-dark-border rounded text-text-primary focus:outline-none focus:border-blue-500 disabled:opacity-50"
          />
        </div>
      </div>

      {/* Preset Configurations */}
      <div className="space-y-3">
        <p className="text-sm font-semibold text-text-primary">Quick Presets</p>
        <div className="grid grid-cols-2 gap-2">
          {presetConfigs.map((preset, idx) => (
            <motion.button
              key={idx}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handlePreset(preset)}
              disabled={isRunning}
              className="px-3 py-2 bg-dark-bg border border-dark-border hover:border-blue-500 rounded text-sm font-semibold text-text-primary disabled:opacity-50 transition"
            >
              {preset.name}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Progress Bar */}
      {isRunning && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-2"
        >
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-text-primary">Test Progress</p>
            <p className="text-sm text-text-secondary">{progress}%</p>
          </div>
          <div className="w-full h-2 bg-dark-bg rounded overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              className="h-full bg-gradient-to-r from-blue-500 to-cyan-400"
            />
          </div>
        </motion.div>
      )}

      {/* Action Button */}
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={handleStartTest}
        disabled={isRunning}
        className="w-full px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 disabled:from-blue-800 disabled:to-blue-800 disabled:opacity-50 rounded-lg font-semibold text-white flex items-center justify-center gap-2 transition"
      >
        <Play size={18} />
        {isRunning ? `Running... ${progress}%` : 'Start Load Test'}
      </motion.button>

      {/* Results Summary */}
      {result && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-2 pt-4 border-t border-dark-border"
        >
          <p className="text-sm font-semibold text-text-primary">Last Test Result</p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-dark-bg p-2 rounded">
              <p className="text-text-secondary">Throughput</p>
              <p className="font-semibold text-green-400">
                {Math.round(result.metrics.throughput)} RPS
              </p>
            </div>
            <div className="bg-dark-bg p-2 rounded">
              <p className="text-text-secondary">Avg Latency</p>
              <p className="font-semibold text-blue-400">
                {Math.round(result.metrics.avgResponseTime)}ms
              </p>
            </div>
            <div className="bg-dark-bg p-2 rounded">
              <p className="text-text-secondary">Errors</p>
              <p className="font-semibold text-orange-400">
                {result.metrics.errorRate.toFixed(2)}%
              </p>
            </div>
            <div className="bg-dark-bg p-2 rounded">
              <p className="text-text-secondary">P95 Latency</p>
              <p className="font-semibold text-cyan-400">
                {Math.round(result.metrics.p95ResponseTime)}ms
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
