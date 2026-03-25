'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { RailwayFlowBackground } from '@/components/RailwayFlowBackground';
import { EnhancedSearchComponent } from '@/components/EnhancedSearchComponent';
import { LiveStatsTicker } from '@/components/LiveStatsTicker';
import { Footer } from '@/components/Footer';

const featureCards = [
  {
    title: 'Live Position Intelligence',
    text: 'Unified live location, station mapping, and route progress from a single backend contract.',
    href: '/search',
    accent: 'from-cyan-400 to-blue-500',
  },
  {
    title: 'Prediction Engine V2',
    text: 'ETA forecasts powered by delay propagation, dwell behavior, congestion, and crossing risk.',
    href: '/intelligence',
    accent: 'from-emerald-400 to-teal-500',
  },
  {
    title: 'Network-Aware Monitoring',
    text: 'Nearby train interactions and congestion score analysis across the railway corridor.',
    href: '/intelligence-hub',
    accent: 'from-amber-400 to-orange-500',
  },
];

const intelligenceTiles = [
  { name: 'Network Intelligence', href: '/test-network-intelligence' },
  { name: 'Halt Analysis', href: '/test-halt-analysis' },
  { name: 'Passenger Safety', href: '/test-passenger-safety' },
  { name: 'Cascade Detection', href: '/test-cascade-analysis' },
  { name: 'Explainability Engine', href: '/test-explainability' },
  { name: 'Data Quality', href: '/data-quality' },
];

export default function Home() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top,#132245_0%,#0b1229_42%,#090d1f_100%)] text-white">
      <RailwayFlowBackground />

      <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-col gap-16 px-4 pb-20 pt-16 md:px-8">
        <section className="grid grid-cols-1 items-center gap-10 lg:grid-cols-[1.15fr_0.85fr]">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, ease: 'easeOut' }}
            className="space-y-7"
          >
            <span className="inline-flex items-center rounded-full border border-cyan-300/40 bg-cyan-300/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-200">
              Real-Time Railway Intelligence
            </span>

            <h1 className="text-4xl font-black leading-tight md:text-6xl">
              RailSense
              <span className="block bg-gradient-to-r from-cyan-300 via-emerald-300 to-amber-300 bg-clip-text text-transparent">
                The New Control Surface For Train Prediction
              </span>
            </h1>

            <p className="max-w-2xl text-base text-slate-300 md:text-lg">
              Unified API. Live monitoring. Explainable predictions. Built for fast decision-making with a clean,
              modern interface that stays transparent about data quality.
            </p>

            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/search"
                className="rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 px-6 py-3 text-sm font-bold text-slate-950 shadow-lg shadow-cyan-500/30 transition hover:scale-[1.02]"
              >
                Start Tracking
              </Link>
              <Link
                href="/intelligence-hub"
                className="rounded-xl border border-cyan-300/45 bg-slate-900/50 px-6 py-3 text-sm font-semibold text-cyan-100 transition hover:bg-slate-900/80"
              >
                Open Intelligence Hub
              </Link>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, ease: 'easeOut', delay: 0.1 }}
            className="surface-glass rounded-3xl p-5 md:p-6"
          >
            <p className="mb-4 text-xs font-semibold uppercase tracking-[0.16em] text-slate-300">
              Search Any Train Number
            </p>
            <EnhancedSearchComponent />
            <div className="mt-5 grid grid-cols-3 gap-3">
              <div className="rounded-lg bg-cyan-400/10 p-3 text-center">
                <p className="text-xl font-bold text-cyan-200">30s</p>
                <p className="text-[11px] text-slate-300">Data Refresh</p>
              </div>
              <div className="rounded-lg bg-emerald-400/10 p-3 text-center">
                <p className="text-xl font-bold text-emerald-200">6</p>
                <p className="text-[11px] text-slate-300">AI Modules</p>
              </div>
              <div className="rounded-lg bg-amber-400/10 p-3 text-center">
                <p className="text-xl font-bold text-amber-200">1</p>
                <p className="text-[11px] text-slate-300">Unified API</p>
              </div>
            </div>
          </motion.div>
        </section>

        <section className="space-y-5">
          <h2 className="text-2xl font-bold md:text-3xl">Live Network Snapshot</h2>
          <LiveStatsTicker />
        </section>

        <section className="space-y-6">
          <h2 className="text-2xl font-bold md:text-3xl">Core Capabilities</h2>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
            {featureCards.map((card, index) => (
              <motion.div
                key={card.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.35 }}
                transition={{ delay: index * 0.08, duration: 0.55 }}
                className="surface-glass group rounded-2xl p-6"
              >
                <div className={`mb-5 h-1 w-14 rounded-full bg-gradient-to-r ${card.accent}`} />
                <h3 className="mb-2 text-xl font-bold text-slate-100">{card.title}</h3>
                <p className="mb-6 text-sm leading-relaxed text-slate-300">{card.text}</p>
                <Link href={card.href} className="text-sm font-semibold text-cyan-200 transition group-hover:text-cyan-100">
                  Explore Module →
                </Link>
              </motion.div>
            ))}
          </div>
        </section>

        <section className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h2 className="text-2xl font-bold md:text-3xl">Intelligence Subsystems</h2>
            <Link
              href="/intelligence"
              className="rounded-lg border border-cyan-300/35 px-4 py-2 text-sm font-semibold text-cyan-200 transition hover:bg-cyan-500/10"
            >
              View Unified Dashboard
            </Link>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {intelligenceTiles.map((tile, index) => (
              <motion.div
                key={tile.name}
                initial={{ opacity: 0, x: -14 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ delay: index * 0.05, duration: 0.45 }}
              >
                <Link
                  href={tile.href}
                  className="group flex items-center justify-between rounded-xl border border-slate-700/80 bg-slate-900/45 px-4 py-4 text-sm font-semibold text-slate-200 transition hover:-translate-y-0.5 hover:border-cyan-300/45 hover:bg-slate-900/70"
                >
                  <span>{tile.name}</span>
                  <span className="text-cyan-300 transition group-hover:translate-x-0.5">→</span>
                </Link>
              </motion.div>
            ))}
          </div>
        </section>
      </div>

      <Footer />
    </div>
  );
}
