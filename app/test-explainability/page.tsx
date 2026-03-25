'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Brain, Database, Lightbulb, Sigma } from 'lucide-react';
import SubsidiaryServiceNavBar from '@/app/components/SubsidiaryServiceNavBar';
import RailLoader from '@/components/RailLoader';

interface ExplainabilityData {
  train: { number: string; name: string };
  predictions: {
    delayForecast: { prediction: string; confidence: number; reasoning: string[]; factors: Array<{ name: string; weight: number; value: string; impact: string }> };
    stationArrival: { prediction: string; estimatedTime: string; confidence: number; reasoning: string[] };
  };
  dataQualityImpact: { statement: string; sources: Array<{ name: string; used: boolean; confidence: number }> };
  modelCharacteristics: { type: string; updateFrequency: string; trainingData: string; accuracy: string };
  disclaimers: string[];
  userGuidance: string[];
}

function ExplainabilityContent() {
  const searchParams = useSearchParams();
  const trainNumber = searchParams.get('trainNumber') || '01211';
  const [data, setData] = useState<ExplainabilityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/system/explainability?trainNumber=${trainNumber}`);
        if (!response.ok) throw new Error(`API error: ${response.status}`);
        setData(await response.json());
      } catch (err: any) {
        setError(err?.message || 'Failed to fetch explainability data');
        setData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [trainNumber]);

  if (loading) return <div className="flex min-h-screen items-center justify-center bg-slate-950"><RailLoader size="lg" /></div>;

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_10%_0%,#2f1f46_0%,#151327_40%,#090d1f_100%)] px-4 pb-14 pt-6 md:px-7">
      <SubsidiaryServiceNavBar trainNumber={trainNumber} currentService="Explainability" />
      <div className="mx-auto mt-16 max-w-6xl space-y-5">
        <header className="surface-glass rounded-2xl p-5">
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-violet-300">Explainability Engine</p>
          <h1 className="text-3xl font-black text-white">Prediction Reasoning Surface</h1>
          <p className="mt-2 text-sm text-slate-300">Train: {trainNumber}</p>
          {error && <p className="mt-3 text-sm text-red-300">{error}</p>}
        </header>

        {data && (
          <>
            <section className="grid grid-cols-1 gap-4 md:grid-cols-4">
              <Metric label="Delay Forecast" value={data.predictions.delayForecast.prediction} icon={<Sigma className="h-4 w-4" />} />
              <Metric label="Forecast Confidence" value={`${data.predictions.delayForecast.confidence}%`} icon={<Brain className="h-4 w-4" />} />
              <Metric label="Arrival ETA" value={data.predictions.stationArrival.estimatedTime} icon={<Lightbulb className="h-4 w-4" />} />
              <Metric label="Model Accuracy" value={data.modelCharacteristics.accuracy} icon={<Database className="h-4 w-4" />} />
            </section>

            <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div className="surface-glass rounded-2xl p-5">
                <h2 className="mb-4 text-lg font-bold text-white">Delay Reasoning</h2>
                <ul className="space-y-2 text-sm text-slate-200">
                  {data.predictions.delayForecast.reasoning.map((reason, idx) => (
                    <li key={`${reason}-${idx}`} className="rounded-lg border border-slate-700 bg-slate-900/45 px-3 py-2">{reason}</li>
                  ))}
                </ul>
              </div>

              <div className="surface-glass rounded-2xl p-5">
                <h2 className="mb-4 text-lg font-bold text-white">Arrival Reasoning</h2>
                <ul className="space-y-2 text-sm text-slate-200">
                  {data.predictions.stationArrival.reasoning.map((reason, idx) => (
                    <li key={`${reason}-${idx}`} className="rounded-lg border border-slate-700 bg-slate-900/45 px-3 py-2">{reason}</li>
                  ))}
                </ul>
              </div>
            </section>

            <section className="surface-glass rounded-2xl p-5">
              <h2 className="mb-4 text-lg font-bold text-white">Weighted Factors</h2>
              <div className="space-y-3">
                {data.predictions.delayForecast.factors.map((factor, idx) => (
                  <div key={`${factor.name}-${idx}`}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="text-slate-200">{factor.name} ({factor.value})</span>
                      <span className="text-violet-200">{Math.round(factor.weight * 100)}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-800">
                      <div className="h-2 rounded-full bg-gradient-to-r from-violet-400 to-purple-500" style={{ width: `${factor.weight * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div className="surface-glass rounded-2xl p-5">
                <h2 className="mb-4 text-lg font-bold text-white">Data Quality Inputs</h2>
                <p className="mb-3 text-sm text-slate-300">{data.dataQualityImpact.statement}</p>
                <ul className="space-y-2 text-sm text-slate-200">
                  {data.dataQualityImpact.sources.map((source, idx) => (
                    <li key={`${source.name}-${idx}`} className="rounded-lg border border-slate-700 bg-slate-900/45 px-3 py-2">
                      {source.name}: {source.used ? 'Used' : 'Not used'} • {Math.round(source.confidence * 100)}%
                    </li>
                  ))}
                </ul>
              </div>

              <div className="surface-glass rounded-2xl p-5">
                <h2 className="mb-4 text-lg font-bold text-white">Model Profile</h2>
                <ul className="space-y-2 text-sm text-slate-200">
                  <li className="rounded-lg border border-slate-700 bg-slate-900/45 px-3 py-2">Type: {data.modelCharacteristics.type}</li>
                  <li className="rounded-lg border border-slate-700 bg-slate-900/45 px-3 py-2">Update: {data.modelCharacteristics.updateFrequency}</li>
                  <li className="rounded-lg border border-slate-700 bg-slate-900/45 px-3 py-2">Training data: {data.modelCharacteristics.trainingData}</li>
                </ul>
              </div>
            </section>

            <section className="surface-glass rounded-2xl p-5">
              <h2 className="mb-3 text-lg font-bold text-white">Guidance and Limits</h2>
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <div>
                  <h3 className="mb-2 text-sm font-semibold text-violet-200">Disclaimers</h3>
                  <ul className="space-y-2 text-sm text-slate-200">
                    {data.disclaimers.map((item, idx) => (
                      <li key={`${item}-${idx}`} className="rounded-lg border border-slate-700 bg-slate-900/45 px-3 py-2">{item}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h3 className="mb-2 text-sm font-semibold text-violet-200">User Guidance</h3>
                  <ul className="space-y-2 text-sm text-slate-200">
                    {data.userGuidance.map((item, idx) => (
                      <li key={`${item}-${idx}`} className="rounded-lg border border-slate-700 bg-slate-900/45 px-3 py-2">{item}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}

function Metric({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return <article className="surface-glass rounded-xl px-4 py-3"><p className="mb-1 flex items-center gap-1 text-[11px] uppercase tracking-[0.12em] text-slate-400">{icon}{label}</p><p className="text-sm font-bold text-violet-100">{value}</p></article>;
}

export default function ExplainabilityPage() {
  return <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-slate-950"><RailLoader size="lg" /></div>}><ExplainabilityContent /></Suspense>;
}
