/**
 * Live Statistics Ticker
 * Displays real-time train statistics with animated counters
 */
import React, { useState, useEffect } from 'react';
import { useTrainInsight } from '@/hooks/useTrainInsight';

interface StatItem {
  label: string;
  value: number;
  icon: string;
  color: string;
}

export const LiveStatsTicker: React.FC = () => {
  const [stats, setStats] = useState<StatItem[]>([
    { label: 'Trains Tracked', value: 5, icon: '🚂', color: 'from-blue-500 to-cyan-500' },
    { label: 'Currently Delayed', value: 2, icon: '⏱️', color: 'from-amber-500 to-orange-500' },
    { label: 'Halted', value: 1, icon: '⛔', color: 'from-rose-500 to-pink-500' },
    { label: 'On Time', value: 2, icon: '✓', color: 'from-emerald-500 to-green-500' },
  ]);

  const [displayedValues, setDisplayedValues] = useState<number[]>([0, 0, 0, 0]);

  // Animate counter values
  useEffect(() => {
    const intervals = stats.map((stat, idx) => {
      const interval = setInterval(() => {
        setDisplayedValues((prev) => {
          const updated = [...prev];
          if (updated[idx] < stat.value) {
            updated[idx] = Math.min(updated[idx] + 1, stat.value);
          }
          return updated;
        });
      }, 50);
      return interval;
    });

    return () => intervals.forEach(clearInterval);
  }, [stats]);

  return (
    <div className="relative w-full bg-gradient-to-r from-dark-card via-dark-bg to-dark-card border border-accent-blue border-opacity-20 rounded-lg p-6 overflow-hidden">
      {/* Animated gradient background */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-accent-blue from-0% via-transparent via-50% to-accent-cyan to-100% opacity-5 animate-pulse" />

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 relative z-10">
        {stats.map((stat, idx) => (
          <div key={idx} className="text-center">
            <div className="text-2xl mb-2">{stat.icon}</div>
            <div className={`text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r ${stat.color} mb-1`}>
              {displayedValues[idx] || 0}
            </div>
            <div className="text-xs text-text-secondary">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Scrolling ticker text (optional) */}
      <div className="mt-4 overflow-hidden">
        <div className="animate-scroll whitespace-nowrap text-sm text-text-secondary">
          <span>🚂 Godavari Express moving at 57 km/h · </span>
          <span>⏱️ Somnath Express delayed by 12 minutes · </span>
          <span>🚂 Visakha Express near Hyderabad · </span>
          <span>✓ Coromandel Express on schedule · </span>
          <span>🚂 Godavari Express moving at 57 km/h · </span>
        </div>
      </div>

      <style jsx>{`
        @keyframes scroll {
          from {
            transform: translateX(0);
          }
          to {
            transform: translateX(-50%);
          }
        }
        .animate-scroll {
          animation: scroll 20s linear infinite;
        }
      `}</style>
    </div>
  );
};
