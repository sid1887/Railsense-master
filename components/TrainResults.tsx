/**
 * TrainResults Component
 * Displays filtered and sorted train data with details
 */

'use client';

import { useRouter } from 'next/navigation';
import { ArrowRight, Zap, Clock, Gauge } from 'lucide-react';
import { motion } from 'framer-motion';
import { FilteredTrain } from '@/services/filterService';

interface TrainResultsProps {
  trains: FilteredTrain[];
  loading?: boolean;
  error?: string;
  onTrainSelect?: (trainNumber: string) => void;
}

export default function TrainResults({
  trains,
  loading = false,
  error,
  onTrainSelect,
}: TrainResultsProps) {
  const router = useRouter();

  const handleTrainClick = (trainNumber: string) => {
    onTrainSelect?.(trainNumber);
    router.push(`/train/${trainNumber}`);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'moving':
        return 'bg-green-900/30 border-green-700 text-green-300';
      case 'halted':
        return 'bg-red-900/30 border-red-700 text-red-300';
      case 'delayed':
        return 'bg-yellow-900/30 border-yellow-700 text-yellow-300';
      default:
        return 'bg-blue-900/30 border-blue-700 text-blue-300';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'moving':
        return '✓';
      case 'halted':
        return '⏸';
      case 'delayed':
        return '⚠️';
      default:
        return '?';
    }
  };

  if (error) {
    return (
      <div className="card p-6 text-center border border-red-700/50 bg-red-900/20">
        <p className="text-red-300">Error loading trains: {error}</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="card p-4 h-24 bg-gradient-to-r from-dark-card to-dark-bg animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (!trains || trains.length === 0) {
    return (
      <div className="card p-8 text-center border border-accent-blue/20">
        <div className="text-3xl mb-2">🔍</div>
        <p className="text-text-secondary">No trains found matching your criteria</p>
        <p className="text-xs text-text-secondary mt-2">Try adjusting your filters</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {trains.map((train, index) => (
        <motion.div
          key={train.trainNumber}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05 }}
          onClick={() => handleTrainClick(train.trainNumber)}
          className="card p-4 cursor-pointer hover:glow-blue transition-all duration-300 border border-dark-card hover:border-accent-blue/50 group"
        >
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            {/* Train Info */}
            <div className="md:col-span-4 flex flex-col justify-between">
              <div>
                <h3 className="font-bold text-accent-blue group-hover:text-accent-blue-light transition-colors">
                  {train.trainNumber}
                </h3>
                <p className="text-sm text-text-secondary mt-1">{train.trainName}</p>
              </div>

              <div className="flex items-center gap-2 mt-2">
                <span
                  className={`text-xs px-2 py-1 rounded border ${getStatusColor(
                    train.status
                  )}`}
                >
                  {getStatusIcon(train.status)} {train.status.charAt(0).toUpperCase() + train.status.slice(1)}
                </span>
                {train.region && (
                  <span className="text-xs px-2 py-1 bg-dark-bg/50 text-text-secondary rounded">
                    {train.region}
                  </span>
                )}
              </div>
            </div>

            {/* Metrics */}
            <div className="md:col-span-8 grid grid-cols-3 gap-3">
              {/* Speed */}
              <div className="flex items-center gap-2 p-2 bg-dark-bg/50 rounded">
                <Gauge className="w-4 h-4 text-accent-blue" />
                <div>
                  <p className="text-xs text-text-secondary">Speed</p>
                  <p className="font-semibold text-sm text-text-primary">
                    {train.speed.toFixed(0)} km/h
                  </p>
                </div>
              </div>

              {/* Delay */}
              <div className="flex items-center gap-2 p-2 bg-dark-bg/50 rounded">
                <Clock
                  className={`w-4 h-4 ${
                    train.delay > 0 ? 'text-yellow-400' : 'text-green-400'
                  }`}
                />
                <div>
                  <p className="text-xs text-text-secondary">Delay</p>
                  <p className={`font-semibold text-sm ${
                    train.delay > 0 ? 'text-yellow-300' : 'text-green-300'
                  }`}>
                    {train.delay > 0 ? `+${train.delay}m` : 'On time'}
                  </p>
                </div>
              </div>

              {/* Distance */}
              {train.distance !== undefined && (
                <div className="flex items-center gap-2 p-2 bg-dark-bg/50 rounded">
                  <Zap className="w-4 h-4 text-accent-blue" />
                  <div>
                    <p className="text-xs text-text-secondary">Distance</p>
                    <p className="font-semibold text-sm text-text-primary">
                      {(train.distance / 1000).toFixed(1)} km
                    </p>
                  </div>
                </div>
              )}
              {/* Data Quality Badge */}
              {train.dataQuality !== undefined && (
                <div className="flex items-center gap-2 p-2 bg-dark-bg/50 rounded">
                  <div className="w-4 h-4 rounded-full" style={{
                    background: train.dataQuality >= 80
                      ? 'linear-gradient(135deg, #1dd1b0, #16a78f)'
                      : train.dataQuality >= 60
                        ? 'linear-gradient(135deg, #58c7fa, #3ba3d0)'
                        : 'linear-gradient(135deg, #fca311, #e8933c)'
                  }} />
                  <div>
                    <p className="text-xs text-text-secondary">Quality</p>
                    <p className="font-semibold text-sm text-text-primary">
                      {train.dataQuality}%
                    </p>
                  </div>
                </div>
              )}            </div>

            {/* View Details Button */}
            <div className="md:col-span-12 flex justify-end">
              <button className="p-2 rounded-full bg-accent-blue/20 hover:bg-accent-blue/40 text-accent-blue transition-colors group">
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
        </motion.div>
      ))}

      <p className="text-xs text-text-secondary text-center mt-6">
        Showing {trains.length} result{trains.length !== 1 ? 's' : ''}
      </p>
    </div>
  );
}
