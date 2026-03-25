'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Station } from '@/types/train';
import { MapPin, Clock, CheckCircle, AlertCircle } from 'lucide-react';

interface RouteTimelineProps {
  stations: Station[];
  currentStationIndex: number;
  trainName: string;
}

/**
 * RouteTimeline Component
 * Shows train's journey through stations
 * Displays scheduled vs estimated times
 * Highlights current position
 */
export default function RouteTimeline({
  stations,
  currentStationIndex,
  trainName,
}: RouteTimelineProps) {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1, delayChildren: 0.2 },
    },
  };

  const stationVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: {
      opacity: 1,
      x: 0,
      transition: { duration: 0.4 },
    },
  };

  const isCompleted = (index: number) => index < currentStationIndex;
  const isCurrent = (index: number) => index === currentStationIndex;

  return (
    <motion.div
      className="card p-6 rounded-lg border border-accent-blue/30"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <h3 className="font-semibold text-lg text-accent-blue mb-6 flex items-center gap-2">
        <MapPin size={20} />
        Route Timeline: {trainName}
      </h3>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="space-y-4"
      >
        {stations.map((station, index) => {
          const isCompleted_ = isCompleted(index);
          const isCurrent_ = isCurrent(index);
          const isUpcoming = !isCompleted_ && !isCurrent_;

          return (
            <motion.div key={`${station.name}-${index}`} variants={stationVariants}>
              <div className="flex gap-4">
                {/* Timeline indicator */}
                <div className="flex flex-col items-center">
                  <motion.div
                    className={`w-10 h-10 rounded-full flex items-center justify-center border-2 flex-shrink-0 ${
                      isCompleted_
                        ? 'bg-green-900/30 border-green-600 text-green-400'
                        : isCurrent_
                          ? 'border-accent-blue bg-accent-blue/20 text-accent-blue'
                          : 'bg-dark-bg border-text-secondary text-text-secondary'
                    }`}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: index * 0.1 + 0.3 }}
                    whileHover={isCurrent_ ? { scale: 1.1 } : {}}
                  >
                    {isCompleted_ ? (
                      <CheckCircle size={20} />
                    ) : isCurrent_ ? (
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 2, repeat: Infinity }}
                      >
                        <AlertCircle size={20} />
                      </motion.div>
                    ) : (
                      <div className="w-2 h-2 rounded-full bg-current" />
                    )}
                  </motion.div>

                  {/* Connector line */}
                  {index < stations.length - 1 && (
                    <motion.div
                      className={`w-1 my-2 flex-1 min-h-12 ${
                        isCompleted_
                          ? 'bg-gradient-to-b from-green-600 to-green-600'
                          : 'bg-gradient-to-b from-text-secondary to-dark-bg'
                      }`}
                      initial={{ scaleY: 0 }}
                      animate={{ scaleY: 1 }}
                      transition={{ delay: index * 0.1 + 0.4, duration: 0.4 }}
                      style={{ originY: 0 }}
                    />
                  )}
                </div>

                {/* Station details */}
                <div
                  className={`pb-8 pt-1 flex-1 ${
                    isCurrent_ ? 'border-l-2 border-accent-blue pl-4' : 'pl-4'
                  }`}
                >
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: index * 0.1 + 0.3 }}
                  >
                    <p
                      className={`font-semibold ${
                        isCurrent_
                          ? 'text-accent-blue text-lg'
                          : isCompleted_
                            ? 'text-green-400'
                            : 'text-text-primary'
                      }`}
                    >
                      {station.name}
                    </p>

                    <div className="mt-2 space-y-1 text-xs">
                      {/* Arrival */}
                      <div className="flex items-center gap-2">
                        <Clock size={14} className="text-text-secondary" />
                        <span className="text-text-secondary">Arrival:</span>
                        <motion.span
                          className={
                            station.estimatedArrival ? 'text-accent-blue' : 'text-text-secondary'
                          }
                        >
                          {station.estimatedArrival || station.scheduledArrival}
                        </motion.span>
                        {station.estimatedArrival && station.scheduledArrival && (
                          <span className="text-alert-orange">
                            (+{Math.round((new Date(station.estimatedArrival).getTime() - new Date(station.scheduledArrival).getTime()) / 60000)} min)
                          </span>
                        )}
                      </div>

                      {/* Departure */}
                      <div className="flex items-center gap-2">
                        <Clock size={14} className="text-text-secondary" />
                        <span className="text-text-secondary">Depart:</span>
                        <motion.span
                          className={
                            station.estimatedDeparture
                              ? 'text-accent-blue'
                              : 'text-text-secondary'
                          }
                        >
                          {station.estimatedDeparture || station.scheduledDeparture}
                        </motion.span>
                      </div>

                      {/* Status */}
                      {isCurrent_ && station.isHalted && (
                        <motion.p
                          className="text-alert-orange font-semibold mt-2"
                          animate={{ opacity: [1, 0.7, 1] }}
                          transition={{ duration: 1, repeat: Infinity }}
                        >
                          ⏸️ Currently Halted
                        </motion.p>
                      )}
                    </div>
                  </motion.div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </motion.div>

      {/* Route progress indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="mt-6 pt-4 border-t border-text-secondary/20"
      >
        <p className="text-xs text-text-secondary mb-2">Journey Progress</p>
        <div className="w-full bg-dark-bg rounded-full h-2 overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-accent-blue to-accent-blue-dark"
            initial={{ width: 0 }}
            animate={{ width: `${((currentStationIndex + 1) / stations.length) * 100}%` }}
            transition={{ duration: 1, ease: 'easeOut' }}
          />
        </div>
        <p className="text-xs text-accent-blue mt-2 text-right">
          {currentStationIndex + 1} of {stations.length} stations
        </p>
      </motion.div>
    </motion.div>
  );
}
