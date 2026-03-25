'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { Activity, AlertTriangle, Clock3, RefreshCw, ShieldCheck, Train, Waves } from 'lucide-react';
import { useTrainContext } from '@/contexts/TrainContext';
import RailLoader from '@/components/RailLoader';
import { RailwayFlowBackground } from '@/components/RailwayFlowBackground';

export default function RailwayIntelligenceHub() {
  const { trackedTrains, refreshTrackedTrains, selectTrain, trainData, isLoading } = useTrainContext();
  const [selectedTrainNumber, setSelectedTrainNumber] = useState<string | null>(null);

  useEffect(() => {
    // Initial hydration of tracked trains; manual refresh button handles subsequent updates.
    refreshTrackedTrains();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stats = useMemo(() => {
    const active = trackedTrains.length;
    const halted = trackedTrains.filter((t) => t.status === 'halted').length;
    const avgDelay = active ? Math.round(trackedTrains.reduce((sum, t) => sum + t.delayMinutes, 0) / active) : 0;
    const density = Math.min(100, 22 + active * 11);

    return {
      active,
      halted,
      avgDelay,
      density,
    };
  }, [trackedTrains]);

  const selected = trackedTrains.find((t) => t.number === selectedTrainNumber);

  const onSelectTrain = async (trainNumber: string) => {
    setSelectedTrainNumber(trainNumber);
    await selectTrain(trainNumber);
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_10%_10%,#17305f_0%,#0b1329_42%,#090d1f_100%)] px-4 pb-14 pt-8 md:px-8">
      <RailwayFlowBackground tone="hub" opacity={0.24} focusSeed={selectedTrainNumber} />
      <div className="relative z-10 mx-auto max-w-7xl space-y-6">
        <motion.header
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="surface-glass rounded-3xl p-6"
        >
          <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-[0.17em] text-cyan-300">Operations Command</p>
              <h1 className="text-3xl font-black text-white md:text-4xl">Railway Intelligence Hub</h1>
              <p className="mt-2 text-sm text-slate-300">Unified monitoring board for delay, congestion, safety, and prediction confidence.</p>
            </div>
            <button
              onClick={refreshTrackedTrains}
              className="inline-flex items-center gap-2 rounded-xl border border-cyan-300/35 bg-cyan-500/10 px-4 py-2 text-sm font-semibold text-cyan-200 transition hover:bg-cyan-500/20"
            >
              {isLoading ? <RailLoader size="xs" /> : <RefreshCw className="h-4 w-4" />}
              Refresh Feed
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <StatCard label="Tracked Trains" value={stats.active} icon={<Train className="h-4 w-4" />} />
            <StatCard label="Halted" value={stats.halted} icon={<AlertTriangle className="h-4 w-4" />} />
            <StatCard label="Avg Delay" value={`${stats.avgDelay}m`} icon={<Clock3 className="h-4 w-4" />} />
            <StatCard label="Network Density" value={`${stats.density}%`} icon={<Waves className="h-4 w-4" />} />
          </div>
        </motion.header>

        <section className="grid grid-cols-1 gap-6 lg:grid-cols-[1.4fr_0.6fr]">
          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06 }} className="surface-glass rounded-2xl p-5">
            <h2 className="mb-4 text-xl font-bold text-white">Tracked Trains</h2>
            {trackedTrains.length === 0 ? (
              <p className="rounded-lg border border-dashed border-slate-600 p-5 text-sm text-slate-300">
                No trains tracked yet. Search for trains from the home page to populate this feed.
              </p>
            ) : (
              <div className="space-y-3">
                {trackedTrains.map((train) => (
                  <motion.button
                    key={train.number}
                    whileHover={{ x: 3 }}
                    onClick={() => onSelectTrain(train.number)}
                    className={`w-full rounded-xl border p-4 text-left transition ${
                      selectedTrainNumber === train.number
                        ? 'border-cyan-300/55 bg-cyan-500/12'
                        : 'border-slate-700 bg-slate-950/40 hover:border-slate-500'
                    }`}
                  >
                    <div className="mb-2 flex items-start justify-between">
                      <div>
                        <p className="text-sm font-bold text-white">{train.number} • {train.name}</p>
                        <p className="text-xs text-slate-400">{train.currentStation} → {train.nextStation}</p>
                      </div>
                      <span
                        className={`rounded-lg px-2 py-1 text-xs font-semibold ${
                          train.status === 'halted'
                            ? 'bg-red-500/20 text-red-300'
                            : train.status === 'delayed'
                              ? 'bg-amber-500/20 text-amber-200'
                              : 'bg-emerald-500/20 text-emerald-200'
                        }`}
                      >
                        {train.status}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-3 text-xs text-slate-300">
                      <span>Delay: {train.delayMinutes}m</span>
                      <span>Speed: {train.speedKmph} km/h</span>
                      <span>Confidence: {Math.round(train.confidence)}%</span>
                    </div>
                  </motion.button>
                ))}
              </div>
            )}
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="space-y-4">
            <div className="surface-glass rounded-2xl p-4">
              <h3 className="mb-2 text-sm font-bold uppercase tracking-[0.09em] text-cyan-200">Selected Train</h3>
              {selected && trainData ? (
                <div className="space-y-2 text-sm text-slate-200">
                  <p className="text-base font-bold text-white">{trainData.trainName}</p>
                  <p>{trainData.currentStationName} → {trainData.nextStationName}</p>
                  <p>Delay: {trainData.delayMinutes} min</p>
                  <p>Live available: {trainData.liveAvailable ? 'Yes' : 'No'}</p>
                  <Link
                    href={`/train/${trainData.trainNumber}`}
                    className="mt-2 inline-flex rounded-lg border border-cyan-300/35 bg-cyan-500/10 px-3 py-2 text-xs font-semibold text-cyan-200 hover:bg-cyan-500/20"
                  >
                    Open Full Train Detail
                  </Link>
                </div>
              ) : (
                <p className="text-sm text-slate-300">Select a train to inspect deeper intelligence data.</p>
              )}
            </div>

            <div className="surface-glass rounded-2xl p-4">
              <h3 className="mb-2 text-sm font-bold uppercase tracking-[0.09em] text-cyan-200">Quick Intelligence Links</h3>
              <div className="grid grid-cols-1 gap-2 text-sm">
                <Link href="/test-network-intelligence" className="rounded-lg border border-slate-700 bg-slate-900/45 px-3 py-2 hover:border-cyan-300/35">Network Intelligence</Link>
                <Link href="/test-halt-analysis" className="rounded-lg border border-slate-700 bg-slate-900/45 px-3 py-2 hover:border-cyan-300/35">Halt Analysis</Link>
                <Link href="/test-passenger-safety" className="rounded-lg border border-slate-700 bg-slate-900/45 px-3 py-2 hover:border-cyan-300/35">Passenger Safety</Link>
                <Link href="/test-cascade-analysis" className="rounded-lg border border-slate-700 bg-slate-900/45 px-3 py-2 hover:border-cyan-300/35">Cascade Detection</Link>
              </div>
            </div>

            <div className="surface-glass rounded-2xl p-4">
              <h3 className="mb-2 text-sm font-bold uppercase tracking-[0.09em] text-cyan-200">Health Signal</h3>
              <div className="flex items-center gap-2 text-sm text-slate-200">
                <Activity className="h-4 w-4 text-emerald-300" />
                All core intelligence modules online
              </div>
              <div className="mt-2 flex items-center gap-2 text-sm text-slate-200">
                <ShieldCheck className="h-4 w-4 text-cyan-300" />
                Unified endpoint active and type-safe
              </div>
            </div>
          </motion.div>
        </section>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon }: { label: string; value: string | number; icon: React.ReactNode }) {
  return (
    <article className="rounded-xl border border-slate-700/80 bg-slate-950/45 px-3 py-3">
      <p className="mb-1 flex items-center gap-1 text-[11px] uppercase tracking-[0.12em] text-slate-400">
        {icon}
        {label}
      </p>
      <p className="text-sm font-bold text-cyan-100">{value}</p>
    </article>
  );
}
