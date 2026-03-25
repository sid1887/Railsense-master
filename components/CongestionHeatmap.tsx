'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { TrafficAnalysis } from '@/types/train';

interface CongestionHeatmapProps {
  traffic: TrafficAnalysis;
}

/**
 * CongestionHeatmap Component
 * Visual representation of train traffic density
 * Shows nearby trains distribution and intensity
 */
export default function CongestionHeatmap({ traffic }: CongestionHeatmapProps) {
  const { congestionLevel, nearbyTrainsCount, nearbyTrains, radiusKm } = traffic;

  // Generate heatmap grid based on nearby trains
  const gridSize = 8;
  const grid = Array(gridSize)
    .fill(null)
    .map(() => Array(gridSize).fill(0));

  // Fill grid points with train intensity
  nearbyTrains.forEach((train) => {
    // Normalize distance to grid position
    const gridIndex = Math.floor((1 - train.distance / radiusKm) * (gridSize - 1));
    if (gridIndex >= 0 && gridIndex < gridSize) {
      const centerX = Math.floor(gridSize / 2);
      const centerY = Math.floor(gridSize / 2);

      // Create circular pattern around center
      for (let i = Math.max(0, centerX - gridIndex); i < Math.min(gridSize, centerX + gridIndex + 1); i++) {
        for (let j = Math.max(0, centerY - gridIndex); j < Math.min(gridSize, centerY + gridIndex + 1); j++) {
          const distance = Math.sqrt(Math.pow(i - centerX, 2) + Math.pow(j - centerY, 2));
          if (distance <= gridIndex) {
            grid[i][j] = Math.min(grid[i][j] + 30, 100);
          }
        }
      }
    }
  });

  const getHeatColor = (intensity: number): string => {
    if (intensity === 0) return '#1a1f3a';
    if (intensity < 25) return '#1a4d2e';
    if (intensity < 50) return '#f97316';
    if (intensity < 75) return '#ff6b6b';
    return '#ff0000';
  };

  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5 },
    },
  };

  const cellVariants = {
    hidden: { opacity: 0, scale: 0.8 },
    visible: (i: number) => ({
      opacity: 1,
      scale: 1,
      transition: {
        delay: (i % gridSize) * 0.01 + Math.floor(i / gridSize) * 0.01,
        duration: 0.3,
      },
    }),
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="card p-6 rounded-lg border border-accent-blue/30"
    >
      <h3 className="font-semibold text-lg text-accent-blue mb-4">Traffic Density Heatmap</h3>

      <div className="space-y-4">
        {/* Heatmap grid */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="grid gap-1 p-4 bg-dark-bg/50 rounded-lg"
          style={{
            gridTemplateColumns: `repeat(${gridSize}, 1fr)`,
            aspectRatio: '1',
          }}
        >
          {grid.map((row, i) =>
            row.map((intensity, j) => (
              <motion.div
                key={`${i}-${j}`}
                custom={i * gridSize + j}
                variants={cellVariants}
                initial="hidden"
                animate="visible"
                className="rounded-xs cursor-pointer group relative"
                style={{
                  backgroundColor: getHeatColor(intensity),
                  transition: 'all 0.3s ease',
                }}
                whileHover={{ scale: 1.2, zIndex: 10 }}
                title={`Intensity: ${intensity.toFixed(0)}%`}
              >
                {/* Tooltip on hover */}
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 rounded text-xs text-text-primary bg-dark-card border border-accent-blue hidden group-hover:block whitespace-nowrap">
                  {intensity.toFixed(0)}%
                </div>
              </motion.div>
            ))
          )}
        </motion.div>

        {/* Legend */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-text-secondary">Intensity Legend:</p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded" style={{ backgroundColor: '#1a4d2e' }} />
              <span className="text-text-secondary">Low (0-25%)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded" style={{ backgroundColor: '#f97316' }} />
              <span className="text-text-secondary">Medium (26-50%)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded" style={{ backgroundColor: '#ff6b6b' }} />
              <span className="text-text-secondary">High (51-75%)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded" style={{ backgroundColor: '#ff0000' }} />
              <span className="text-text-secondary">Critical (76-100%)</span>
            </div>
          </div>
        </div>

        {/* Summary stats */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="border-t border-text-secondary/20 pt-4"
        >
          <div className="grid grid-cols-2 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-accent-blue">{nearbyTrainsCount}</p>
              <p className="text-xs text-text-secondary">Trains Detected</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-accent-blue">{radiusKm}km</p>
              <p className="text-xs text-text-secondary">Detection Radius</p>
            </div>
          </div>

          {/* Congestion assessment */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className={`mt-3 p-3 rounded-lg text-xs text-center font-semibold ${
              congestionLevel === 'LOW'
                ? 'bg-green-900/30 text-green-400 border border-green-700'
                : congestionLevel === 'MEDIUM'
                  ? 'bg-yellow-900/30 text-yellow-400 border border-yellow-700'
                  : 'bg-orange-900/30 text-orange-400 border border-orange-700'
            }`}
          >
            Congestion Level: {congestionLevel}
          </motion.div>
        </motion.div>

        {/* Traffic pattern info */}
        {nearbyTrains.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="bg-dark-bg/50 p-3 rounded-lg border border-text-secondary/20"
          >
            <p className="text-xs text-text-secondary">
              <span className="font-semibold text-accent-blue">Closest train:</span>{' '}
              {nearbyTrains[0]?.distance.toFixed(2)}km away ({nearbyTrains[0]?.trainNumber})
            </p>
            {nearbyTrains.length > 1 && (
              <p className="text-xs text-text-secondary mt-1">
                <span className="font-semibold text-accent-blue">Average distance:</span>{' '}
                {(nearbyTrains.reduce((sum, t) => sum + t.distance, 0) / nearbyTrains.length).toFixed(2)}km
              </p>
            )}
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
