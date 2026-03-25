'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { Activity, Brain, Clock3, Database, MapPin, ShieldAlert, Sparkles, TrendingDown, Users } from 'lucide-react';
import { RailwayFlowBackground } from '@/components/RailwayFlowBackground';

const modules = [
  {
    name: 'Network Intelligence',
    href: '/test-network-intelligence',
    description: 'Nearby train interactions, route overlap, and congestion scoring.',
    icon: MapPin,
    tone: 'from-cyan-500/20 to-blue-500/20 border-cyan-300/35',
  },
  {
    name: 'Halt Analysis',
    href: '/test-halt-analysis',
    description: 'Station halt diagnosis with probable causes and impact guidance.',
    icon: Clock3,
    tone: 'from-amber-500/20 to-orange-500/20 border-amber-300/35',
  },
  {
    name: 'Passenger Safety',
    href: '/test-passenger-safety',
    description: 'Connection risk, dwell anomalies, and safety confidence outputs.',
    icon: Users,
    tone: 'from-emerald-500/20 to-teal-500/20 border-emerald-300/35',
  },
  {
    name: 'Cascade Detection',
    href: '/test-cascade-analysis',
    description: 'Delay ripple effects across linked trains and sections.',
    icon: TrendingDown,
    tone: 'from-rose-500/20 to-red-500/20 border-rose-300/35',
  },
  {
    name: 'Explainability',
    href: '/test-explainability',
    description: 'Reasoning chains and confidence factors behind each forecast.',
    icon: Brain,
    tone: 'from-violet-500/20 to-indigo-500/20 border-violet-300/35',
  },
  {
    name: 'Data Quality',
    href: '/data-quality',
    description: 'Live source transparency and prediction strength visibility.',
    icon: Database,
    tone: 'from-slate-500/20 to-slate-400/20 border-slate-300/35',
  },
];

export default function IntelligenceDashboardPage() {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_12%_0%,#1a2d59_0%,#0b132a_40%,#090d1f_100%)] px-4 pb-16 pt-8 md:px-8">
      <RailwayFlowBackground tone="intelligence" opacity={0.26} />
      <div className="relative z-10 mx-auto max-w-7xl space-y-6">
        <motion.header
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          className="surface-glass rounded-3xl p-6"
        >
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-cyan-300">Unified AI Control Board</p>
              <h1 className="text-3xl font-black text-white md:text-4xl">Intelligence Dashboard</h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-300">
                A single command layer for monitoring the complete prediction pipeline and intelligence modules.
              </p>
            </div>
            <Link
              href="/intelligence-hub"
              className="inline-flex items-center gap-2 rounded-xl border border-cyan-300/35 bg-cyan-500/10 px-4 py-2 text-sm font-semibold text-cyan-200 transition hover:bg-cyan-500/20"
            >
              <Sparkles className="h-4 w-4" />
              Open Operations Hub
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <SignalTile label="Modules" value="6 Active" icon={<Brain className="h-4 w-4" />} />
            <SignalTile label="Endpoint" value="Unified" icon={<Activity className="h-4 w-4" />} />
            <SignalTile label="Prediction" value="Live" icon={<ShieldAlert className="h-4 w-4" />} />
            <SignalTile label="Refresh" value="30 sec" icon={<Clock3 className="h-4 w-4" />} />
          </div>
        </motion.header>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {modules.map((module, index) => {
            const Icon = module.icon;
            return (
              <motion.div
                key={module.name}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.06 }}
              >
                <Link
                  href={module.href}
                  className={`group block rounded-2xl border bg-gradient-to-br p-5 backdrop-blur-sm transition hover:-translate-y-0.5 ${module.tone}`}
                >
                  <div className="mb-3 flex items-center justify-between">
                    <span className="rounded-lg bg-slate-950/40 p-2 text-cyan-200">
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-300">Live</span>
                  </div>
                  <h2 className="mb-2 text-lg font-bold text-white">{module.name}</h2>
                  <p className="text-sm text-slate-200/90">{module.description}</p>
                  <span className="mt-4 inline-block text-sm font-semibold text-cyan-200 transition group-hover:text-cyan-100">
                    Explore Module →
                  </span>
                </Link>
              </motion.div>
            );
          })}
        </section>
      </div>
    </div>
  );
}

function SignalTile({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
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
