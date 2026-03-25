'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Shield, Thermometer, Users, AlertCircle, CheckCircle2, AlertTriangle, Users2 } from 'lucide-react';
import SubsidiaryServiceNavBar from '@/app/components/SubsidiaryServiceNavBar';
import RailLoader from '@/components/RailLoader';
import { useTrainSearchTracking } from '@/hooks/useTrainSearchTracking';

interface PassengerSafetyData {
  train: { number: string; name: string };
  safetyMetrics: { overallScore: number; trackCondition: string; weatherRisk: string; derailmentRisk: string; collisionRisk: string };
  passengerWelfare: { estimatedCrowding: string; ventilationStatus: string; temperatureControl: string; facilities: { toilets: string; water: string; medical: string } };
  delayImpact: { passengerStress: string; emergencyDelay: number; estimatedCompensation: string };
  alerts: Array<{ type: string; severity: string; message: string }>;
  recommendations: string[];
}

interface CrowdEstimation {
  trainNumber: string;
  crowdLevel: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  crowdScore: number;
  confidence: number;
  estimatedPassengersAtStation: number;
  safetyRisk: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  insights: string[];
  recommendations: string[];
  dataQuality: {
    searchDataAvailable: boolean;
    dataAge: number;
    sampleSize: number;
  };
}

function PassengerSafetyContent() {
  const searchParams = useSearchParams();
  const trainNumber = searchParams.get('trainNumber') || '01211';
  
  // Track this search for crowd detection
  useTrainSearchTracking(trainNumber, 'exact');
  
  const [data, setData] = useState<PassengerSafetyData | null>(null);
  const [crowdData, setCrowdData] = useState<CrowdEstimation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [safetyRes, crowdRes] = await Promise.all([
          fetch(`/api/system/passenger-safety?trainNumber=${trainNumber}`),
          fetch(`/api/crowd-detection?trainNumber=${trainNumber}`),
        ]);
        
        if (!safetyRes.ok) throw new Error(`Safety API error: ${safetyRes.status}`);
        
        const safetyData = await safetyRes.json();
        setData(safetyData);

        // Crowd detection is optional - if it fails, just continue without it
        if (crowdRes.ok) {
          const crowd = await crowdRes.json();
          setCrowdData(crowd);
        }
      } catch (err: any) {
        setError(err?.message || 'Failed to fetch passenger safety data');
        setData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [trainNumber]);

  if (loading) return <div className="flex min-h-screen items-center justify-center bg-slate-950"><RailLoader size="lg" /></div>;

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_15%_5%,#1a3a52_0%,#0d1829_35%,#080d1f_100%)] px-4 pb-14 pt-6 md:px-7">
      <SubsidiaryServiceNavBar trainNumber={trainNumber} currentService="Passenger Safety" />
      <div className="mx-auto mt-16 max-w-6xl space-y-5">
        <motion.header 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <span className="inline-flex items-center rounded-full border border-emerald-300/40 bg-emerald-300/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-200">
            Passenger Safety Monitoring
          </span>
          <h1 className="text-4xl font-black md:text-5xl">
            Safety & Welfare
            <span className="block bg-gradient-to-r from-emerald-300 via-cyan-300 to-blue-300 bg-clip-text text-transparent">Monitoring Hub</span>
          </h1>
          <p className="max-w-2xl text-base text-slate-300">Comprehensive analysis of passenger safety, comfort, and platform conditions for train {trainNumber}</p>
          {error && <p className="mt-3 flex items-center gap-2 text-sm text-red-300"><AlertCircle size={16} /> {error}</p>}
        </motion.header>

        {data && (
          <>
            {/* Crowd Detection Section (powered by search analytics) */}
            {crowdData && crowdData.dataQuality.searchDataAvailable && (
              <motion.section 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.08 }}
                className="surface-glass rounded-2xl p-5 border border-cyan-500/30 bg-gradient-to-r from-cyan-500/5 to-blue-500/5"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <Users2 className="w-5 h-5 text-cyan-300" />
                    <h2 className="text-lg font-bold text-white">Live Crowd Detection</h2>
                    <span className="text-xs text-cyan-300 font-semibold">Via Search Analytics</span>
                  </div>
                  <CrowdLevelBadge level={crowdData.crowdLevel} />
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4 md:grid-cols-4">
                  <CrowdMetric label="Crowd Score" value={`${crowdData.crowdScore}/100`} color="cyan" />
                  <CrowdMetric label="Est. Passengers" value={`~${crowdData.estimatedPassengersAtStation}`} color="blue" />
                  <CrowdMetric label="Search Activity" value={`${crowdData.dataQuality.sampleSize} searches`} color="purple" />
                  <CrowdMetric label="Confidence" value={`${Math.round(crowdData.confidence * 100)}%`} color="emerald" />
                </div>

                <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                  <div className="rounded-lg border border-slate-700 bg-slate-900/30 p-3">
                    <p className="mb-2 text-xs uppercase tracking-[0.08em] text-slate-400 font-semibold">Crowd Insights</p>
                    <ul className="space-y-1">
                      {crowdData.insights.slice(0, 3).map((insight, idx) => (
                        <motion.li 
                          key={idx}
                          initial={{ opacity: 0, x: -10 }}
                          whileInView={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.05 }}
                          className="text-xs text-slate-300"
                        >
                          {insight}
                        </motion.li>
                      ))}
                    </ul>
                  </div>

                  <div className="rounded-lg border border-slate-700 bg-slate-900/30 p-3">
                    <p className="mb-2 text-xs uppercase tracking-[0.08em] text-slate-400 font-semibold">Safety Recommendations</p>
                    <ul className="space-y-1">
                      {crowdData.recommendations.slice(0, 2).map((rec, idx) => (
                        <motion.li 
                          key={idx}
                          initial={{ opacity: 0, x: -10 }}
                          whileInView={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.15 + idx * 0.05 }}
                          className="text-xs text-slate-300"
                        >
                          ✓ {rec}
                        </motion.li>
                      ))}
                    </ul>
                  </div>
                </div>

                <p className="mt-3 text-xs text-slate-500">
                  📊 Detection method: Analyzes {crowdData.dataQuality.sampleSize} live train searches to estimate platform crowding
                </p>
              </motion.section>
            )}

            <motion.section 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="grid grid-cols-1 gap-4 md:grid-cols-4"
            >
              <Card label="Safety Score" value={`${data.safetyMetrics.overallScore}%`} icon={<Shield className="h-4 w-4" />} color="emerald" />
              <Card label="Crowding" value={data.passengerWelfare.estimatedCrowding} icon={<Users className="h-4 w-4" />} color="blue" />
              <Card label="Weather Risk" value={data.safetyMetrics.weatherRisk} icon={<Thermometer className="h-4 w-4" />} color="orange" />
              <Card label="Emergency Delay" value={`${data.delayImpact.emergencyDelay} min`} icon={<AlertTriangle className="h-4 w-4" />} color="red" />
            </motion.section>

            <motion.section 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="grid grid-cols-1 gap-4 lg:grid-cols-2"
            >
              <div className="surface-glass rounded-2xl p-5">
                <h2 className="mb-4 text-lg font-bold text-white">Core Risk Indicators</h2>
                <ul className="space-y-2 text-sm text-slate-200">
                  <RiskItem label="Track condition" value={data.safetyMetrics.trackCondition} />
                  <RiskItem label="Derailment risk" value={data.safetyMetrics.derailmentRisk} />
                  <RiskItem label="Collision risk" value={data.safetyMetrics.collisionRisk} />
                  <RiskItem label="Passenger stress" value={data.delayImpact.passengerStress} />
                </ul>
              </div>

              <div className="surface-glass rounded-2xl p-5">
                <h2 className="mb-4 text-lg font-bold text-white">Onboard Welfare</h2>
                <ul className="space-y-2 text-sm text-slate-200">
                  <WelfareItem label="Ventilation" value={data.passengerWelfare.ventilationStatus} />
                  <WelfareItem label="Temperature" value={data.passengerWelfare.temperatureControl} />
                  <WelfareItem label="Toilets" value={data.passengerWelfare.facilities.toilets} />
                  <WelfareItem label="Water" value={data.passengerWelfare.facilities.water} />
                  <WelfareItem label="Medical" value={data.passengerWelfare.facilities.medical} />
                </ul>
              </div>
            </motion.section>

            <motion.section 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="surface-glass rounded-2xl p-5"
            >
              <h2 className="mb-4 text-lg font-bold text-white">Active Alerts</h2>
              {data.alerts.length === 0 ? (
                <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-200">
                  <CheckCircle2 size={16} />
                  No active safety alerts.
                </div>
              ) : (
                <div className="space-y-2">
                  {data.alerts.map((alert, idx) => (
                    <AlertItem key={`${alert.type}-${idx}`} alert={alert} />
                  ))}
                </div>
              )}
            </motion.section>

            <motion.section 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="surface-glass rounded-2xl p-5"
            >
              <h2 className="mb-4 text-lg font-bold text-white">Recommendations</h2>
              <ul className="space-y-2 text-sm text-slate-200">
                {data.recommendations.map((rec, idx) => (
                  <li key={`${rec}-${idx}`} className="rounded-lg border border-slate-700 bg-slate-900/45 px-3 py-2">{rec}</li>
                ))}
              </ul>
            </motion.section>
          </>
        )}
      </div>
    </div>
  );
}

function Card({ label, value, icon, color }: { label: string; value: string; icon: React.ReactNode; color: 'emerald' | 'blue' | 'orange' | 'red' }) {
  const colorClasses = {
    emerald: 'text-emerald-100',
    blue: 'text-blue-100',
    orange: 'text-orange-100',
    red: 'text-red-100',
  };
  return (
    <motion.article 
      whileHover={{ scale: 1.05 }}
      className="surface-glass rounded-xl px-4 py-3 cursor-pointer transition"
    >
      <p className="mb-1 flex items-center gap-1 text-[11px] uppercase tracking-[0.12em] text-slate-400">{icon}{label}</p>
      <p className={`text-sm font-bold ${colorClasses[color]}`}>{value}</p>
    </motion.article>
  );
}

function RiskItem({ label, value }: { label: string; value: string }) {
  const isLow = value.toLowerCase().includes('low') || value.toLowerCase().includes('good');
  return (
    <motion.li 
      initial={{ opacity: 0, x: -10 }}
      whileInView={{ opacity: 1, x: 0 }}
      className="rounded-lg border border-slate-700 bg-slate-900/45 px-3 py-2"
    >
      <div className="flex items-center justify-between">
        <span>{label}:</span>
        <span className={`font-semibold ${isLow ? 'text-emerald-300' : 'text-orange-300'}`}>{value}</span>
      </div>
    </motion.li>
  );
}

function WelfareItem({ label, value }: { label: string; value: string }) {
  const isGood = value.toLowerCase().includes('normal') || value.toLowerCase().includes('good') || value.toLowerCase().includes('available') || value.toLowerCase().includes('functional');
  return (
    <motion.li 
      initial={{ opacity: 0, x: -10 }}
      whileInView={{ opacity: 1, x: 0 }}
      className="rounded-lg border border-slate-700 bg-slate-900/45 px-3 py-2"
    >
      <div className="flex items-center justify-between">
        <span>{label}:</span>
        <span className={`font-semibold ${isGood ? 'text-emerald-300' : 'text-amber-300'}`}>{value}</span>
      </div>
    </motion.li>
  );
}

function AlertItem({ alert }: { alert: { type: string; severity: string; message: string } }) {
  const severityColor = {
    'critical': 'border-red-500/30 bg-red-500/10 text-red-200',
    'high': 'border-orange-500/30 bg-orange-500/10 text-orange-200',
    'medium': 'border-yellow-500/30 bg-yellow-500/10 text-yellow-200',
    'low': 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200',
  }[alert.severity.toLowerCase()] || 'border-slate-700 bg-slate-900/45 text-slate-200';

  return (
    <motion.div 
      initial={{ opacity: 0, x: -10 }}
      whileInView={{ opacity: 1, x: 0 }}
      className={`rounded-lg border px-3 py-2 text-sm ${severityColor}`}
    >
      <span className="mr-2 font-semibold">[{alert.severity.toUpperCase()}]</span>
      <span>{alert.type}: {alert.message}</span>
    </motion.div>
  );
}

function CrowdLevelBadge({ level }: { level: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL' }) {
  const badges = {
    LOW: { bg: 'bg-emerald-500/20', border: 'border-emerald-500/50', text: 'text-emerald-200', label: '🟢 LOW' },
    MODERATE: { bg: 'bg-yellow-500/20', border: 'border-yellow-500/50', text: 'text-yellow-200', label: '🟡 MODERATE' },
    HIGH: { bg: 'bg-orange-500/20', border: 'border-orange-500/50', text: 'text-orange-200', label: '🔴 HIGH' },
    CRITICAL: { bg: 'bg-red-500/20', border: 'border-red-500/50', text: 'text-red-200', label: '⛔ CRITICAL' },
  };

  const badge = badges[level];

  return (
    <div className={`rounded-lg border px-3 py-1 text-sm font-bold ${badge.bg} ${badge.border} ${badge.text}`}>
      {badge.label}
    </div>
  );
}

function CrowdMetric({ label, value, color }: { label: string; value: string; color: 'cyan' | 'blue' | 'purple' | 'emerald' }) {
  const colorMap = {
    cyan: { text: 'text-cyan-300', icon: '📊' },
    blue: { text: 'text-blue-300', icon: '👥' },
    purple: { text: 'text-purple-300', icon: '🔍' },
    emerald: { text: 'text-emerald-300', icon: '✓' },
  };

  const colors = colorMap[color];

  return (
    <div className="rounded-lg border border-slate-700 bg-slate-900/40 p-3 text-center">
      <p className="text-xs uppercase tracking-[0.08em] text-slate-500 font-semibold mb-1">{label}</p>
      <p className={`text-lg font-bold ${colors.text}`}>{value}</p>
    </div>
  );
}

export default function PassengerSafetyPage() {
  return <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-slate-950"><RailLoader size="lg" /></div>}><PassengerSafetyContent /></Suspense>;
}
