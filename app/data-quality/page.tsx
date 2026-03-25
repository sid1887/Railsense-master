'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Database, AlertCircle, CheckCircle2 } from 'lucide-react';
import RailLoader from '@/components/RailLoader';

interface DataQualityData {
  trainNumber: string;
  trainName: string;
  overall: number;
  trustLevel: string;
  sources: Array<{ name: string; quality: number }>;
  warnings: string[];
  recommendations: string[];
  metrics: {
    staticDataQuality: number;
    liveDataQuality: number;
    predictionQuality: number;
  };
}

function DataQualityContent() {
  const searchParams = useSearchParams();
  const trainNumber = searchParams.get('trainNumber') || '01211';

  const [data, setData] = useState<DataQualityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/system/data-quality?trainNumber=${trainNumber}`);
        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }
        const result = await response.json();
        setData(result);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch data quality');
        setData(null);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [trainNumber]);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_20%_10%,#1a3d52_0%,#0d1829_38%,#080d1f_100%)] p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Desktop Hero Section */}
        <div className="hidden md:block mb-12 relative z-10">
          <div className="inline-flex items-center gap-3 mb-6">
            <div className="h-1 w-12 bg-gradient-to-r from-cyan-400/80 to-transparent rounded" />
            <span className="text-sm font-semibold tracking-widest text-cyan-400/70 uppercase">Quality Assurance</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
            Data Quality
            <br />
            <span className="bg-gradient-to-r from-cyan-300 via-blue-400 to-purple-400 bg-clip-text text-transparent">
              Intelligence Hub
            </span>
          </h1>
          <p className="text-xl text-gray-300/90 font-light max-w-2xl leading-relaxed">
            Monitor system health, validate data integrity, and ensure optimal railway data quality with AI-powered insights and comprehensive analytics.
          </p>
        </div>

        {/* Mobile Hero Section */}
        <div className="md:hidden mb-8 relative z-10">
          <h1 className="text-3xl font-bold mb-3 leading-tight">
            Data Quality
            <br />
            <span className="bg-gradient-to-r from-cyan-300 via-blue-400 to-purple-400 bg-clip-text text-transparent">
              Intelligence
            </span>
          </h1>
          <p className="text-sm text-gray-300/90 leading-relaxed">
            Monitor system health and ensure optimal data quality with AI-powered insights.
          </p>
        </div>

        {/* Train Selector */}
        <div className="mb-8 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
          <p className="text-sm font-semibold text-blue-300">Selected Train: <span className="text-white">{trainNumber}</span></p>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-12">
            <RailLoader size="lg" />
          </div>
        )}

        {error && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-500/10 border border-red-500/30 rounded-lg p-6 mb-6 flex items-center gap-3"
          >
            <AlertCircle className="text-red-400" size={20} />
            <p className="text-red-400">{error}</p>
          </motion.div>
        )}

        {data && !loading && (
          <div className="space-y-6">
            {/* Overall Score */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 }}
              className="bg-[hsl(230,20%,16%)] rounded-lg p-8 border border-white/[0.06]"
            >
              <div className="flex items-end gap-6">
                <div>
                  <p className="text-[hsl(220,15%,55%)] text-sm mb-2">Overall Quality Score</p>
                  <motion.p 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className={`text-6xl font-bold ${
                      data.overall >= 80 ? 'text-green-400' :
                      data.overall >= 60 ? 'text-yellow-400' : 'text-red-400'
                    }`}
                  >
                    {data.overall}%
                  </motion.p>
                </div>
                <div>
                  <p className="text-[hsl(220,15%,55%)] text-small mb-2">Trust Level</p>
                  <p className={`text-2xl font-bold ${
                    data.trustLevel === 'high' || data.trustLevel.toLowerCase() === 'high' ? 'text-green-400' :
                    data.trustLevel === 'medium' || data.trustLevel.toLowerCase() === 'medium' ? 'text-yellow-400' : 'text-red-400'
                  }`}>
                    {data.trustLevel.charAt(0).toUpperCase() + data.trustLevel.slice(1)}
                  </p>
                </div>
              </div>
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="mt-6 w-full bg-[hsl(230,20%,25%)] rounded-full h-4 overflow-hidden"
              >
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${data.overall}%` }}
                  transition={{ delay: 0.4, duration: 1 }}
                  className={`h-4 rounded-full ${
                    data.overall >= 80 ? 'bg-green-500' :
                    data.overall >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                  }`}
                />
              </motion.div>
            </motion.div>

            {/* Quality Breakdown */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="bg-[hsl(230,20%,16%)] rounded-lg p-6 border border-white/[0.06]"
            >
              <h2 className="text-xl font-bold text-white mb-4">Quality Breakdown</h2>
              <div className="grid grid-cols-3 gap-6">
                <QualityMetric label="Static Data" value={data.metrics.staticDataQuality} color="blue" delay={0.2} />
                <QualityMetric label="Live Data" value={data.metrics.liveDataQuality} color="purple" delay={0.25} />
                <QualityMetric label="Prediction" value={data.metrics.predictionQuality} color="cyan" delay={0.3} />
              </div>
            </motion.div>

            {/* Data Sources */}
            {data.sources.length > 0 && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-[hsl(230,20%,16%)] rounded-lg p-6 border border-white/[0.06]"
              >
                <h2 className="text-xl font-bold text-white mb-4">Data Sources</h2>
                <div className="space-y-3">
                  {data.sources.map((source, idx) => (
                    <SourceItem key={idx} source={source} index={idx} />
                  ))}
                </div>
              </motion.div>
            )}

            {/* Warnings */}
            {data.warnings.length > 0 && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-6"
              >
                <h3 className="text-yellow-300 font-bold text-lg mb-3">Warnings</h3>
                <ul className="space-y-2">
                  {data.warnings.map((warning, idx) => (
                    <motion.li 
                      key={idx} 
                      initial={{ opacity: 0, x: -10 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      className="flex gap-3 text-[hsl(220,20%,70%)]"
                    >
                      <span className="text-yellow-400 font-bold">⚠</span>
                      <span>{warning}</span>
                    </motion.li>
                  ))}
                </ul>
              </motion.div>
            )}

            {/* Recommendations */}
            {data.recommendations.length > 0 && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-6"
              >
                <h3 className="text-blue-300 font-bold text-lg mb-3">Recommendations</h3>
                <ul className="space-y-2">
                  {data.recommendations.map((rec, idx) => (
                    <motion.li 
                      key={idx} 
                      initial={{ opacity: 0, x: -10 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      className="flex gap-3 text-[hsl(220,20%,70%)]"
                    >
                      <span className="text-blue-400 font-bold">→</span>
                      <span>{rec}</span>
                    </motion.li>
                  ))}
                </ul>
              </motion.div>
            )}

            {/* No warnings/recommendations indicator */}
            {data.warnings.length === 0 && data.recommendations.length === 0 && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center justify-center gap-2 p-6 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-emerald-200"
              >
                <CheckCircle2 size={20} />
                All data quality metrics are within normal parameters.
              </motion.div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function QualityMetric({ label, value, color, delay }: { label: string; value: number; color: string; delay: number }) {
  const colorMap = {
    blue: { text: 'text-blue-400', bar: 'bg-blue-500' },
    purple: { text: 'text-purple-400', bar: 'bg-purple-500' },
    cyan: { text: 'text-cyan-400', bar: 'bg-cyan-500' },
  };
  
  const colors = colorMap[color as keyof typeof colorMap];

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
    >
      <p className="text-[hsl(220,15%,55%)] text-sm mb-2">{label}</p>
      <p className={`text-3xl font-bold ${colors.text}`}>{value}%</p>
      <div className="w-full bg-[hsl(230,20%,25%)] rounded-full h-2 mt-2 overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ delay: delay + 0.2, duration: 1 }}
          className={`h-2 rounded-full ${colors.bar}`}
        />
      </div>
    </motion.div>
  );
}

function SourceItem({ source, index }: { source: { name: string; quality: number }; index: number }) {
  return (
    <motion.div 
      initial={{ opacity: 0, x: -20 }}
      whileInView={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.1 }}
      className="p-4 bg-[hsl(230,20%,25%)] rounded space-y-2"
    >
      <div className="flex justify-between items-center">
        <p className="text-white font-semibold">{source.name}</p>
        <p className="text-[hsl(220,20%,70%)] text-sm">{source.quality}% quality</p>
      </div>
      <div className="w-full bg-[hsl(230,20%,30%)] rounded-full h-2 overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          whileInView={{ width: `${source.quality}%` }}
          transition={{ delay: index * 0.1 + 0.2, duration: 0.8 }}
          className="h-2 rounded-full bg-blue-500"
        />
      </div>
    </motion.div>
  );
}

export default function DataQualityPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><RailLoader size="lg" /></div>}>
      <DataQualityContent />
    </Suspense>
  );
}
