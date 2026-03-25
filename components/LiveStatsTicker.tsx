/**
 * Live Statistics Ticker
 * Displays real-time train statistics with animated counters
 */
import React, { useState, useEffect } from 'react';

interface StatItem {
  label: string;
  value: number;
  icon: string;
  color: string;
}

interface TrackedTrainSnapshot {
  number: string;
  name: string;
  status: 'moving' | 'halted' | 'delayed';
  delayMinutes: number;
  currentStation: string;
  nextStation: string;
  speedKmph: number;
}

const POLL_INTERVAL_MS = 20000;

const INITIAL_STATS: StatItem[] = [
  { label: 'Trains Tracked', value: 0, icon: '🚂', color: 'from-blue-500 to-cyan-500' },
  { label: 'Currently Delayed', value: 0, icon: '⏱️', color: 'from-amber-500 to-orange-500' },
  { label: 'Halted', value: 0, icon: '⛔', color: 'from-rose-500 to-pink-500' },
  { label: 'On Time', value: 0, icon: '✓', color: 'from-emerald-500 to-green-500' },
];

function formatTickerMessage(train: TrackedTrainSnapshot): string {
  const speed = Math.max(0, Math.round(Number(train.speedKmph || 0)));
  const delay = Math.max(0, Math.round(Number(train.delayMinutes || 0)));

  if (train.status === 'halted' || speed <= 2) {
    return `⛔ ${train.name} halted near ${train.currentStation}`;
  }

  if (train.status === 'delayed' || delay > 0) {
    return `⏱️ ${train.name} delayed by ${delay} minutes`;
  }

  return `🚂 ${train.name} moving at ${speed} km/h`;
}

export const LiveStatsTicker: React.FC = () => {
  const [stats, setStats] = useState<StatItem[]>(INITIAL_STATS);
  const [displayedValues, setDisplayedValues] = useState<number[]>(() => INITIAL_STATS.map(() => 0));
  const [tickerItems, setTickerItems] = useState<string[]>(['Loading live network snapshot...']);
  const [snapshotTimestamp, setSnapshotTimestamp] = useState<string | null>(null);
  const [nowTick, setNowTick] = useState<number>(Date.now());

  useEffect(() => {
    const tickId = setInterval(() => {
      setNowTick(Date.now());
    }, 1000);

    return () => clearInterval(tickId);
  }, []);

  // Poll live snapshot data and rebuild counters/ticker feed.
  useEffect(() => {
    let cancelled = false;

    const loadSnapshot = async () => {
      try {
        const response = await fetch('/api/train/tracked?limit=8', {
          method: 'GET',
          cache: 'no-store',
        });

        if (!response.ok) {
          throw new Error(`Snapshot request failed: ${response.status}`);
        }

        const payload = await response.json();
        const trains: TrackedTrainSnapshot[] = Array.isArray(payload?.trains)
          ? payload.trains
          : [];
        const payloadTimestamp = typeof payload?.timestamp === 'string' ? payload.timestamp : null;

        if (cancelled) return;

        setSnapshotTimestamp(payloadTimestamp);

        const total = trains.length;
        const delayed = trains.filter((train) => train.status === 'delayed').length;
        const halted = trains.filter((train) => train.status === 'halted').length;
        const onTime = trains.filter(
          (train) => train.status === 'moving' && Math.max(0, Number(train.delayMinutes || 0)) <= 5
        ).length;

        setStats([
          { label: 'Trains Tracked', value: total, icon: '🚂', color: 'from-blue-500 to-cyan-500' },
          { label: 'Currently Delayed', value: delayed, icon: '⏱️', color: 'from-amber-500 to-orange-500' },
          { label: 'Halted', value: halted, icon: '⛔', color: 'from-rose-500 to-pink-500' },
          { label: 'On Time', value: onTime, icon: '✓', color: 'from-emerald-500 to-green-500' },
        ]);

        if (trains.length > 0) {
          setTickerItems(trains.slice(0, 8).map(formatTickerMessage));
        } else {
          setTickerItems(['No active trains in the live snapshot right now']);
        }
      } catch {
        if (cancelled) return;
        setTickerItems((prev) =>
          prev.length > 0
            ? prev
            : ['Live snapshot temporarily unavailable. Retrying automatically...']
        );
      }
    };

    void loadSnapshot();
    const pollId = setInterval(() => {
      void loadSnapshot();
    }, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(pollId);
    };
  }, []);

  // Animate counter values
  useEffect(() => {
    const interval = setInterval(() => {
      setDisplayedValues((prev) => {
        const base = stats.map((_, index) => prev[index] || 0);
        let changed = false;

        const updated = base.map((current, index) => {
          const target = stats[index]?.value || 0;
          if (current === target) {
            return current;
          }

          changed = true;
          const delta = target - current;
          const step = Math.max(1, Math.ceil(Math.abs(delta) / 5));
          return current + Math.sign(delta) * Math.min(Math.abs(delta), step);
        });

        return changed ? updated : base;
      });
    }, 45);

    return () => clearInterval(interval);
  }, [stats]);

  const marqueeItems = tickerItems.length > 0 ? [...tickerItems, ...tickerItems] : ['Loading live network snapshot...'];
  const secondsAgo = snapshotTimestamp
    ? Math.max(0, Math.floor((nowTick - new Date(snapshotTimestamp).getTime()) / 1000))
    : null;
  const lastUpdatedLabel = snapshotTimestamp
    ? `Last updated ${new Date(snapshotTimestamp).toLocaleTimeString()}${secondsAgo !== null ? ` (${secondsAgo}s ago)` : ''}`
    : 'Last updated: waiting for live data';

  return (
    <div className="relative w-full bg-gradient-to-r from-dark-card via-dark-bg to-dark-card border border-accent-blue border-opacity-20 rounded-lg p-6 overflow-hidden">
      {/* Animated gradient background */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-accent-blue from-0% via-transparent via-50% to-accent-cyan to-100% opacity-5 animate-pulse" />

      <div className="relative z-10 mb-3 flex justify-end">
        <span className="rounded-md border border-slate-600/70 bg-slate-900/45 px-2 py-1 text-[11px] text-slate-300">
          {lastUpdatedLabel}
        </span>
      </div>

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
          {marqueeItems.map((item, index) => (
            <span key={`${item}-${index}`}>{item} · </span>
          ))}
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
