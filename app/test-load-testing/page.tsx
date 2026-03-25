'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Activity, TrendingUp, AlertCircle } from 'lucide-react';
import LoadTestPanel from '@/components/LoadTestPanel';
import PerformanceMetrics from '@/components/PerformanceMetrics';

/**
 * Load Testing Page
 * Interactive interface for running and viewing load test results
 */
export default function LoadTestingPage() {
  const [testResults, setTestResults] = useState<any[]>([]);
  const [selectedResult, setSelectedResult] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleTestStart = () => {
    setIsLoading(true);
  };

  const handleTestComplete = (result: any) => {
    setTestResults([result, ...testResults]);
    setSelectedResult(result);
    setIsLoading(false);
  };

  const passStatus = (result: any) => {
    const throughputPass = result.metrics.throughput >= 1000;
    const latencyPass = result.metrics.p95ResponseTime <= 500;
    const errorPass = result.metrics.errorRate <= 1;

    if (throughputPass && latencyPass && errorPass) return 'PASS';
    if (errorPass && (throughputPass || latencyPass)) return 'WARN';
    return 'FAIL';
  };

  return (
    <div className="min-h-screen bg-dark-bg p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-2"
        >
          <div className="flex items-center gap-3">
            <Activity size={32} className="text-cyan-400" />
            <h1 className="text-3xl font-bold text-text-primary">Load Testing</h1>
          </div>
          <p className="text-text-secondary">
            Simulate high-load scenarios and analyze system performance under stress
          </p>
        </motion.div>

        <div className="grid grid-cols-3 gap-8">
          {/* Left Column: Test Panel */}
          <div className="col-span-2 space-y-6">
            <LoadTestPanel onTestStart={handleTestStart} onTestComplete={handleTestComplete} />

            {/* Results History */}
            {testResults.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-dark-card border border-dark-border rounded-lg p-6 space-y-4"
              >
                <h3 className="text-lg font-semibold text-text-primary flex items-center gap-2">
                  <TrendingUp size={20} />
                  Test History
                </h3>

                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {testResults.slice(0, 10).map((result, idx) => {
                    const status = passStatus(result);
                    const statusColor = {
                      PASS: 'text-green-400 bg-green-900/20 border-green-700',
                      WARN: 'text-yellow-400 bg-yellow-900/20 border-yellow-700',
                      FAIL: 'text-red-400 bg-red-900/20 border-red-700',
                    }[status];

                    return (
                      <motion.button
                        key={idx}
                        whileHover={{ x: 4 }}
                        onClick={() => setSelectedResult(result)}
                        className={`w-full p-3 rounded border text-left transition ${
                          selectedResult === result
                            ? 'bg-dark-bg border-blue-500'
                            : 'bg-dark-bg/50 border-dark-border hover:border-dark-border'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <p className="font-semibold text-text-primary text-sm">
                            {result.configuration.name}
                          </p>
                          <span className={`text-xs font-semibold px-2 py-1 rounded border ${statusColor}`}>
                            {status}
                          </span>
                        </div>
                        <p className="text-xs text-text-secondary">
                          {Math.round(result.metrics.throughput)} RPS • Avg:{' '}
                          {Math.round(result.metrics.avgResponseTime)}ms • P95:{' '}
                          {Math.round(result.metrics.p95ResponseTime)}ms
                        </p>
                      </motion.button>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </div>

          {/* Right Column: Results Display */}
          <div className="space-y-6">
            {selectedResult ? (
              <>
                {/* Test Summary */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-dark-card border border-dark-border rounded-lg p-6 space-y-4"
                >
                  <div>
                    <h3 className="text-sm font-semibold text-text-secondary mb-2">Test Name</h3>
                    <p className="text-text-primary font-semibold text-sm truncate">
                      {selectedResult.configuration.name}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <p className="text-text-secondary mb-1">Duration</p>
                      <p className="font-semibold text-text-primary">
                        {(selectedResult.configuration.duration / 1000).toFixed(1)}s
                      </p>
                    </div>
                    <div>
                      <p className="text-text-secondary mb-1">RPS</p>
                      <p className="font-semibold text-text-primary">
                        {selectedResult.configuration.requestsPerSecond}
                      </p>
                    </div>
                    <div>
                      <p className="text-text-secondary mb-1">Total Requests</p>
                      <p className="font-semibold text-text-primary">
                        {selectedResult.totalRequests.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-text-secondary mb-1">Concurrent Users</p>
                      <p className="font-semibold text-text-primary">
                        {selectedResult.configuration.concurrentUsers}
                      </p>
                    </div>
                  </div>
                </motion.div>

                {/* Overall Pass/Fail */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className={`rounded-lg p-6 border text-center ${
                    passStatus(selectedResult) === 'PASS'
                      ? 'bg-green-900/20 border-green-700'
                      : passStatus(selectedResult) === 'WARN'
                        ? 'bg-yellow-900/20 border-yellow-700'
                        : 'bg-red-900/20 border-red-700'
                  }`}
                >
                  <p className="text-lg font-bold mb-1">
                    {passStatus(selectedResult) === 'PASS' ? (
                      <span className="text-green-400">✓ PASSED</span>
                    ) : passStatus(selectedResult) === 'WARN' ? (
                      <span className="text-yellow-400">⚠ WARNING</span>
                    ) : (
                      <span className="text-red-400">✗ FAILED</span>
                    )}
                  </p>
                  <p className="text-xs text-text-secondary">
                    {passStatus(selectedResult) === 'PASS'
                      ? 'All performance targets met'
                      : 'Some targets need improvement'}
                  </p>
                </motion.div>

                {/* Detailed Metrics */}
                <PerformanceMetrics metrics={selectedResult.metrics} />
              </>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-dark-card border border-dark-border rounded-lg p-6 text-center py-12"
              >
                <AlertCircle size={32} className="mx-auto text-text-secondary mb-3" />
                <p className="text-text-secondary">Run a load test to see results here</p>
              </motion.div>
            )}
          </div>
        </div>

        {/* Performance Guidelines */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-dark-card border border-dark-border rounded-lg p-6"
        >
          <h3 className="text-lg font-semibold text-text-primary mb-4">Performance Guidelines</h3>

          <div className="grid grid-cols-3 gap-6">
            <div>
              <h4 className="font-semibold text-text-primary mb-2 flex items-center gap-2">
                <TrendingUp size={18} className="text-cyan-400" />
                Throughput
              </h4>
              <ul className="text-sm text-text-secondary space-y-1">
                <li>
                  <strong>Target:</strong> &gt;1000 RPS
                </li>
                <li>
                  <strong>Good:</strong> 500-1000 RPS
                </li>
                <li>
                  <strong>Fair:</strong> 100-500 RPS
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-text-primary mb-2 flex items-center gap-2">
                <Activity size={18} className="text-blue-400" />
                Latency (P95)
              </h4>
              <ul className="text-sm text-text-secondary space-y-1">
                <li>
                  <strong>Target:</strong> &lt;500ms
                </li>
                <li>
                  <strong>Good:</strong> 200-500ms
                </li>
                <li>
                  <strong>Fair:</strong> 500-1000ms
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-text-primary mb-2 flex items-center gap-2">
                <AlertCircle size={18} className="text-orange-400" />
                Error Rate
              </h4>
              <ul className="text-sm text-text-secondary space-y-1">
                <li>
                  <strong>Target:</strong> &lt;1%
                </li>
                <li>
                  <strong>Good:</strong> 0-0.5%
                </li>
                <li>
                  <strong>Fair:</strong> 0.5-2%
                </li>
              </ul>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
