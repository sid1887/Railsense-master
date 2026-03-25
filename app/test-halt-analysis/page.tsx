'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { AlertTriangle, Clock3, Siren, AlertCircle } from 'lucide-react';
import SubsidiaryServiceNavBar from '@/app/components/SubsidiaryServiceNavBar';
import RailLoader from '@/components/RailLoader';

interface HaltAnalysisData {
  trainNumber: string;
  trainName: string;
  currentStatus: { isHalted: boolean; haltReason?: string; haltDuration?: number };
  haltAnalysis: { probableCauses: Array<{ cause: string; probability: number }>; signalStrength: number };
  impactAnalysis: { delayAccumulation: number; cascadeRisk: string; affectedStations: number };
  recommendations: string[];
}

function HaltAnalysisContent() {
  const searchParams = useSearchParams();
  const trainNumber = searchParams.get('trainNumber') || '01211';
  const [analysis, setAnalysis] = useState<HaltAnalysisData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAnalysis = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/system/halt-analysis?trainNumber=${trainNumber}`);
        if (!response.ok) throw new Error(`API error: ${response.status}`);
        setAnalysis(await response.json());
      } catch (err: any) {
        setError(err?.message || 'Failed to fetch halt analysis');
        setAnalysis(null);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalysis();
  }, [trainNumber]);

  if (loading) return <div className="flex min-h-screen items-center justify-center bg-slate-950"><RailLoader size="lg" /></div>;

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_10%_0%,#2b1f1f_0%,#141420_40%,#090d1f_100%)] px-4 pb-14 pt-6 md:px-7">
      <SubsidiaryServiceNavBar trainNumber={trainNumber} currentService="Halt Analysis" />
      <div className="mx-auto mt-16 max-w-6xl space-y-5">
        <motion.header 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="surface-glass rounded-2xl p-5"
        >
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-amber-300">Halt Analysis</p>
          <h1 className="text-3xl font-black text-white">Stop Cause and Impact Diagnosis</h1>
          <p className="mt-2 text-sm text-slate-300">Train: {trainNumber}</p>
          {error && <p className="mt-3 flex items-center gap-2 text-sm text-red-300"><AlertCircle size={16} /> {error}</p>}
        </motion.header>

        {analysis && (
          <>
            <motion.section 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="grid grid-cols-1 gap-4 md:grid-cols-4"
            >
              <Metric label="Current State" value={analysis.currentStatus.isHalted ? 'HALTED' : 'MOVING'} icon={<Siren className="h-4 w-4" />} color="amber" />
              <Metric label="Halt Duration" value={`${analysis.currentStatus.haltDuration || 0} min`} icon={<Clock3 className="h-4 w-4" />} color="orange" />
              <Metric label="Signal Strength" value={`${Math.round(analysis.haltAnalysis.signalStrength * 100)}%`} icon={<AlertTriangle className="h-4 w-4" />} color="red" />
              <Metric label="Cascade Risk" value={analysis.impactAnalysis.cascadeRisk} icon={<AlertTriangle className="h-4 w-4" />} color="yellow" />
            </motion.section>

            <motion.section 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="grid grid-cols-1 gap-4 lg:grid-cols-2"
            >
              <div className="surface-glass rounded-2xl p-5">
                <h2 className="mb-4 text-lg font-bold text-white">Probable Causes</h2>
                <div className="space-y-3">
                  {analysis.haltAnalysis.probableCauses.map((item, idx) => (
                    <motion.div 
                      key={`${item.cause}-${idx}`}
                      initial={{ opacity: 0, x: -20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.1 }}
                    >
                      <div className="mb-1 flex items-center justify-between text-sm">
                        <span className="text-slate-200">{item.cause}</span>
                        <span className="text-amber-200 font-semibold">{Math.round(item.probability * 100)}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          whileInView={{ width: `${item.probability * 100}%` }}
                          transition={{ delay: idx * 0.1 + 0.2, duration: 0.8 }}
                          className="h-2 rounded-full bg-gradient-to-r from-amber-400 to-orange-500"
                        />
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>

              <div className="surface-glass rounded-2xl p-5">
                <h2 className="mb-4 text-lg font-bold text-white">Impact Snapshot</h2>
                <div className="grid grid-cols-1 gap-2 text-sm text-slate-200">
                  <motion.div 
                    initial={{ opacity: 0, x: -10 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    className="rounded-lg border border-slate-700 bg-slate-900/45 px-3 py-2"
                  >
                    Delay accumulation: <span className="text-amber-300 font-semibold">+{analysis.impactAnalysis.delayAccumulation} min</span>
                  </motion.div>
                  <motion.div 
                    initial={{ opacity: 0, x: -10 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 }}
                    className="rounded-lg border border-slate-700 bg-slate-900/45 px-3 py-2"
                  >
                    Affected stations: <span className="text-orange-300 font-semibold">{analysis.impactAnalysis.affectedStations}</span>
                  </motion.div>
                  <motion.div 
                    initial={{ opacity: 0, x: -10 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 }}
                    className="rounded-lg border border-slate-700 bg-slate-900/45 px-3 py-2"
                  >
                    Primary reason: <span className="text-amber-200 font-semibold">{analysis.currentStatus.haltReason || 'Under evaluation'}</span>
                  </motion.div>
                </div>
              </div>
            </motion.section>

            <motion.section 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="surface-glass rounded-2xl p-5"
            >
              <h2 className="mb-4 text-lg font-bold text-white">Operational Recommendations</h2>
              <ul className="space-y-2 text-sm text-slate-200">
                {analysis.recommendations.map((rec, idx) => (
                  <motion.li 
                    key={`${rec}-${idx}`} 
                    initial={{ opacity: 0, x: -10 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="rounded-lg border border-slate-700 bg-slate-900/45 px-3 py-2"
                  >
                    {rec}
                  </motion.li>
                ))}
              </ul>
            </motion.section>
          </>
        )}
      </div>
    </div>
  );
}

function Metric({ label, value, icon, color }: { label: string; value: string; icon: React.ReactNode; color: string }) {
  const colorMap = {
    amber: 'text-amber-100',
    orange: 'text-orange-100',
    red: 'text-red-100',
    yellow: 'text-yellow-100',
  };
  
  return (
    <motion.article 
      whileHover={{ scale: 1.05 }}
      className="surface-glass rounded-xl px-4 py-3 cursor-pointer transition"
    >
      <p className="mb-1 flex items-center gap-1 text-[11px] uppercase tracking-[0.12em] text-slate-400">{icon}{label}</p>
      <p className={`text-sm font-bold ${colorMap[color as keyof typeof colorMap]}`}>{value}</p>
    </motion.article>
  );
}

export default function HaltAnalysisPage() {
  return <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-slate-950"><RailLoader size="lg" /></div>}><HaltAnalysisContent /></Suspense>;
}
