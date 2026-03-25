/**
 * AnalyticsDashboard Component
 * Real-time system metrics and monitoring
 */

'use client';

import { useEffect, useState } from 'react';
import { Activity, TrendingUp, Radio, Zap } from 'lucide-react';

interface SystemMetrics {
  activeSubscriptions: number;
  totalUpdatesLastMinute: number;
  averageLatency: number;
  uptime: number;
  peakSubscriptions: number;
}

export default function AnalyticsDashboard() {
  const [metrics, setMetrics] = useState<SystemMetrics>({
    activeSubscriptions: 0,
    totalUpdatesLastMinute: 0,
    averageLatency: 0,
    uptime: 0,
    peakSubscriptions: 0,
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const res = await fetch('/api/analytics');
        if (res.ok) {
          const data = await res.json();
          setMetrics(data);
        }
      } catch (err) {
        console.error('Failed to fetch metrics:', err);
      } finally {
        setLoading(false);
      }
    };

    // Initial fetch
    fetchMetrics();

    // Polling every 5 seconds
    const interval = setInterval(fetchMetrics, 5000);

    return () => clearInterval(interval);
  }, []);

  const formatUptime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-gray-700 rounded-lg h-24 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4">
      {/* Active Subscriptions */}
      <div className="bg-gradient-to-br from-blue-900 to-blue-800 rounded-lg p-6 text-white shadow-lg border border-blue-700">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-blue-200">Active Subscriptions</h3>
          <Radio className="w-5 h-5 text-blue-400" />
        </div>
        <div className="text-3xl font-bold mb-2">{metrics.activeSubscriptions}</div>
        <p className="text-sm text-blue-300">Peak: {metrics.peakSubscriptions}</p>
      </div>

      {/* Updates Last Minute */}
      <div className="bg-gradient-to-br from-green-900 to-green-800 rounded-lg p-6 text-white shadow-lg border border-green-700">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-green-200">Updates (1min)</h3>
          <TrendingUp className="w-5 h-5 text-green-400" />
        </div>
        <div className="text-3xl font-bold mb-2">{metrics.totalUpdatesLastMinute}</div>
        <p className="text-sm text-green-300">Real-time broadcasts</p>
      </div>

      {/* Average Latency */}
      <div className="bg-gradient-to-br from-purple-900 to-purple-800 rounded-lg p-6 text-white shadow-lg border border-purple-700">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-purple-200">Avg Latency</h3>
          <Zap className="w-5 h-5 text-purple-400" />
        </div>
        <div className="text-3xl font-bold mb-2">{metrics.averageLatency.toFixed(0)}ms</div>
        <p className="text-sm text-purple-300">Message delivery time</p>
      </div>

      {/* System Uptime */}
      <div className="bg-gradient-to-br from-orange-900 to-orange-800 rounded-lg p-6 text-white shadow-lg border border-orange-700">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-orange-200">Uptime</h3>
          <Activity className="w-5 h-5 text-orange-400" />
        </div>
        <div className="text-3xl font-bold mb-2">{formatUptime(metrics.uptime)}</div>
        <p className="text-sm text-orange-300">System running stable</p>
      </div>
    </div>
  );
}
