'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Activity, AlertTriangle, GitBranch, TrendingDown } from 'lucide-react';
import SubsidiaryServiceNavBar from '@/app/components/SubsidiaryServiceNavBar';
import RailLoader from '@/components/RailLoader';

interface CascadeAnalysisData {
  train: { number: string; name: string };
  currentDelay: number;
  cascadeAnalysis: { delayOrigin: string; estimatedPropagation: Array<{ station: string; estimatedDelay: number; impactedTrains: number }>; totalAffectedTrains: number };
  delayProgression: { trend: string; velocityOfChange: string; projectedDelay: number };
  networkRiskFactors: { upstreamCongestion: boolean; downstreamCongestion: boolean; platformAvailability: boolean; junctionSpacing: string };
  recoveryPotential: { estimatedRecovery: string; recoveryProbability: number };
  recommendations: string[];
}

function CascadeAnalysisContent() {
  const searchParams = useSearchParams();
  const trainNumber = searchParams.get('trainNumber') || '01211';
  const [analysis, setAnalysis] = useState<CascadeAnalysisData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAnalysis = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/system/cascade-analysis?trainNumber=${trainNumber}`);
        if (!response.ok) throw new Error(`API error: ${response.status}`);
        setAnalysis(await response.json());
      } catch (err: any) {
        setError(err?.message || 'Failed to fetch cascade analysis');
        setAnalysis(null);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalysis();
  }, [trainNumber]);

  if (loading) return <div className="flex min-h-screen items-center justify-center bg-slate-950"><RailLoader size="lg" /></div>;

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_10%_0%,#3a1f2b_0%,#16111b_40%,#090d1f_100%)] px-4 pb-14 pt-6 md:px-7">
      <SubsidiaryServiceNavBar trainNumber={trainNumber} currentService="Cascade Analysis" />
      <div className="mx-auto mt-16 max-w-6xl space-y-5">
        <header className="surface-glass rounded-2xl p-5">
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-rose-300">Cascade Detection</p>
          <h1 className="text-3xl font-black text-white">Delay Propagation Watch</h1>
          <p className="mt-2 text-sm text-slate-300">Train: {trainNumber}</p>
          {error && <p className="mt-3 text-sm text-red-300">{error}</p>}
        </header>

        {analysis && (
          <>
            <section className="grid grid-cols-1 gap-4 md:grid-cols-4">
              <Card label="Current Delay" value={`${analysis.currentDelay} min`} icon={<TrendingDown className="h-4 w-4" />} />
              <Card label="Projected Delay" value={`${analysis.delayProgression.projectedDelay} min`} icon={<Activity className="h-4 w-4" />} />
              <Card label="Affected Trains" value={analysis.cascadeAnalysis.totalAffectedTrains} icon={<GitBranch className="h-4 w-4" />} />
              <Card label="Recovery" value={`${Math.round(analysis.recoveryPotential.recoveryProbability * 100)}%`} icon={<AlertTriangle className="h-4 w-4" />} />
            </section>

            <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div className="surface-glass rounded-2xl p-5">
                <h2 className="mb-4 text-lg font-bold text-white">Delay Progression</h2>
                <div className="space-y-2 text-sm text-slate-200">
                  <div className="rounded-lg border border-slate-700 bg-slate-900/45 px-3 py-2">Trend: {analysis.delayProgression.trend}</div>
                  <div className="rounded-lg border border-slate-700 bg-slate-900/45 px-3 py-2">Velocity: {analysis.delayProgression.velocityOfChange}</div>
                  <div className="rounded-lg border border-slate-700 bg-slate-900/45 px-3 py-2">Delay origin: {analysis.cascadeAnalysis.delayOrigin}</div>
                </div>
              </div>

              <div className="surface-glass rounded-2xl p-5">
                <h2 className="mb-4 text-lg font-bold text-white">Network Risk Factors</h2>
                <div className="space-y-2 text-sm text-slate-200">
                  <div className="rounded-lg border border-slate-700 bg-slate-900/45 px-3 py-2">Upstream congestion: {analysis.networkRiskFactors.upstreamCongestion ? 'Yes' : 'No'}</div>
                  <div className="rounded-lg border border-slate-700 bg-slate-900/45 px-3 py-2">Downstream congestion: {analysis.networkRiskFactors.downstreamCongestion ? 'Yes' : 'No'}</div>
                  <div className="rounded-lg border border-slate-700 bg-slate-900/45 px-3 py-2">Platform availability: {analysis.networkRiskFactors.platformAvailability ? 'Available' : 'Limited'}</div>
                  <div className="rounded-lg border border-slate-700 bg-slate-900/45 px-3 py-2">Junction spacing: {analysis.networkRiskFactors.junctionSpacing}</div>
                </div>
              </div>
            </section>

            <section className="surface-glass rounded-2xl p-5">
              <h2 className="mb-4 text-lg font-bold text-white">Propagation Forecast</h2>
              <div className="space-y-2">
                {analysis.cascadeAnalysis.estimatedPropagation.map((item, idx) => (
                  <div key={`${item.station}-${idx}`} className="rounded-lg border border-slate-700 bg-slate-900/45 px-3 py-2 text-sm text-slate-200">
                    <span className="font-semibold text-rose-200">{item.station}</span> • +{item.estimatedDelay} min • impacted trains: {item.impactedTrains}
                  </div>
                ))}
              </div>
            </section>

            <section className="surface-glass rounded-2xl p-5">
              <h2 className="mb-4 text-lg font-bold text-white">Recovery Guidance</h2>
              <p className="mb-3 text-sm text-slate-300">Estimated recovery: {analysis.recoveryPotential.estimatedRecovery}</p>
              <ul className="space-y-2 text-sm text-slate-200">
                {analysis.recommendations.map((rec, idx) => (
                  <li key={`${rec}-${idx}`} className="rounded-lg border border-slate-700 bg-slate-900/45 px-3 py-2">{rec}</li>
                ))}
              </ul>
            </section>
          </>
        )}
      </div>
    </div>
  );
}

function Card({ label, value, icon }: { label: string; value: string | number; icon: React.ReactNode }) {
  return <article className="surface-glass rounded-xl px-4 py-3"><p className="mb-1 flex items-center gap-1 text-[11px] uppercase tracking-[0.12em] text-slate-400">{icon}{label}</p><p className="text-sm font-bold text-rose-100">{value}</p></article>;
}

export default function CascadeAnalysisPage() {
  return <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-slate-950"><RailLoader size="lg" /></div>}><CascadeAnalysisContent /></Suspense>;
}
