/**
 * FilterControls Component
 * Advanced filtering and sorting UI for trained data
 */

'use client';

import { useState } from 'react';
import {
  FilterIcon,
  ChevronDown,
  X,
  ArrowUpDown,
  Zap,
  MapPin,
  Gauge,
  Clock,
} from 'lucide-react';
import { TrainFilters, SortBy, SortOptions, filterPresets } from '@/services/filterService';
import { motion, AnimatePresence } from 'framer-motion';

interface FilterControlsProps {
  onFilterChange: (filters: TrainFilters) => void;
  onSortChange: (sort: SortOptions) => void;
  activeFilters: TrainFilters;
  activeSort: SortOptions;
  trainCount?: number;
}

export default function FilterControls({
  onFilterChange,
  onSortChange,
  activeFilters,
  activeSort,
  trainCount = 0,
}: FilterControlsProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleRegionChange = (region: string) => {
    onFilterChange({ ...activeFilters, region: region || undefined });
  };

  const handleStatusChange = (status: 'moving' | 'halted' | 'delayed' | undefined) => {
    onFilterChange({ ...activeFilters, status });
  };

  const handleSpeedChange = (min?: number, max?: number) => {
    onFilterChange({
      ...activeFilters,
      minSpeed: min,
      maxSpeed: max,
    });
  };

  const handleDelayChange = (value: string) => {
    if (value === 'none') {
      onFilterChange({ ...activeFilters, minDelay: undefined });
    } else if (value === 'short') {
      onFilterChange({ ...activeFilters, minDelay: 0, maxDelay: 5 });
    } else if (value === 'medium') {
      onFilterChange({ ...activeFilters, minDelay: 5, maxDelay: 15 });
    } else if (value === 'long') {
      onFilterChange({ ...activeFilters, minDelay: 15 });
    }
  };

  const handleSortChange = (field: SortBy) => {
    const newDirection =
      activeSort.field === field && activeSort.direction === 'asc'
        ? ('desc' as const)
        : ('asc' as const);

    onSortChange({ field, direction: newDirection });
  };

  const applyPreset = (presetName: keyof typeof filterPresets) => {
    const preset = filterPresets[presetName]();
    onFilterChange(preset);
  };

  const clearFilters = () => {
    onFilterChange({});
  };

  const activeFilterCount = Object.values(activeFilters).filter(
    (v) => v !== undefined && v !== ''
  ).length;

  return (
    <div className="w-full bg-gradient-to-r from-dark-card to-dark-card border border-accent-blue/20 rounded-lg p-4 mb-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <FilterIcon className="w-5 h-5 text-accent-blue" />
          <span className="font-semibold text-text-primary">Filters & Sort</span>
          {activeFilterCount > 0 && (
            <span className="ml-2 px-2 py-1 bg-accent-blue rounded-full text-xs font-bold">
              {activeFilterCount}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {activeFilterCount > 0 && (
            <button
              onClick={clearFilters}
              className="px-3 py-1 text-xs bg-red-900/30 hover:bg-red-900/50 text-red-300 rounded transition-colors"
            >
              Clear All
            </button>
          )}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-2 hover:bg-dark-bg rounded transition-colors"
          >
            <ChevronDown
              className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            />
          </button>
        </div>
      </div>

      {/* Quick Presets */}
      <div className="flex flex-wrap gap-2 mb-4 text-sm">
        <button
          onClick={() => applyPreset('delayedTrains')}
          className="px-3 py-1 bg-yellow-900/30 hover:bg-yellow-900/50 text-yellow-300 rounded transition-colors"
        >
          ⚠️ Delayed
        </button>
        <button
          onClick={() => applyPreset('haltedTrains')}
          className="px-3 py-1 bg-red-900/30 hover:bg-red-900/50 text-red-300 rounded transition-colors"
        >
          🛑 Halted
        </button>
        <button
          onClick={() => applyPreset('fastTrains')}
          className="px-3 py-1 bg-green-900/30 hover:bg-green-900/50 text-green-300 rounded transition-colors"
        >
          ⚡ Fast
        </button>
        <button
          onClick={() => applyPreset('northernRegion')}
          className="px-3 py-1 bg-blue-900/30 hover:bg-blue-900/50 text-blue-300 rounded transition-colors"
        >
          🗺️ North
        </button>
        <button
          onClick={() => applyPreset('southernRegion')}
          className="px-3 py-1 bg-blue-900/30 hover:bg-blue-900/50 text-blue-300 rounded transition-colors"
        >
          🗺️ South
        </button>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="border-t border-accent-blue/20 pt-4 space-y-4"
          >
            {/* Region Filter */}
            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-2 flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                Region
              </label>
              <div className="flex flex-wrap gap-2">
                {['North', 'South', 'East', 'West', 'Central'].map((region) => (
                  <button
                    key={region}
                    onClick={() =>
                      handleRegionChange(
                        activeFilters.region === region ? '' : region
                      )
                    }
                    className={`px-3 py-1 text-xs rounded transition-colors ${
                      activeFilters.region === region
                        ? 'bg-accent-blue text-dark-bg'
                        : 'bg-dark-bg/50 hover:bg-dark-bg text-text-secondary'
                    }`}
                  >
                    {region}
                  </button>
                ))}
              </div>
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-2 flex items-center gap-2">
                <Zap className="w-4 h-4" />
                Status
              </label>
              <div className="flex flex-wrap gap-2">
                {[
                  { label: 'Moving', value: 'moving' },
                  { label: 'Halted', value: 'halted' },
                  { label: 'Delayed', value: 'delayed' },
                ].map(({ label, value }) => (
                  <button
                    key={value}
                    onClick={() =>
                      handleStatusChange(
                        activeFilters.status === value
                          ? undefined
                          : (value as 'moving' | 'halted' | 'delayed')
                      )
                    }
                    className={`px-3 py-1 text-xs rounded transition-colors ${
                      activeFilters.status === value
                        ? 'bg-accent-blue text-dark-bg'
                        : 'bg-dark-bg/50 hover:bg-dark-bg text-text-secondary'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Speed Range */}
            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-2 flex items-center gap-2">
                <Gauge className="w-4 h-4" />
                Speed (km/h)
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder="Min"
                  value={activeFilters.minSpeed || ''}
                  onChange={(e) =>
                    handleSpeedChange(e.target.value ? parseInt(e.target.value) : undefined)
                  }
                  className="flex-1 px-2 py-1 text-xs bg-dark-bg border border-accent-blue/30 rounded focus:border-accent-blue focus:outline-none text-text-primary"
                />
                <input
                  type="number"
                  placeholder="Max"
                  value={activeFilters.maxSpeed || ''}
                  onChange={(e) =>
                    handleSpeedChange(
                      activeFilters.minSpeed,
                      e.target.value ? parseInt(e.target.value) : undefined
                    )
                  }
                  className="flex-1 px-2 py-1 text-xs bg-dark-bg border border-accent-blue/30 rounded focus:border-accent-blue focus:outline-none text-text-primary"
                />
              </div>
            </div>

            {/* Halt Duration */}
            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-2 flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Halt Duration
              </label>
              <div className="flex flex-wrap gap-2">
                {[
                  { label: 'Any', value: 'none' },
                  { label: 'Short (&lt; 5m)', value: 'short' },
                  { label: 'Medium (5-15m)', value: 'medium' },
                  { label: 'Long (&gt; 15m)', value: 'long' },
                ].map(({ label, value }) => (
                  <button
                    key={value}
                    onClick={() => handleDelayChange(value)}
                    className="px-2 py-1 text-xs bg-dark-bg/50 hover:bg-dark-bg text-text-secondary rounded transition-colors"
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Sorting */}
            <div className="pt-2 border-t border-accent-blue/20">
              <label className="block text-xs font-semibold text-text-secondary mb-2 flex items-center gap-2">
                <ArrowUpDown className="w-4 h-4" />
                Sort By
              </label>
              <div className="flex flex-wrap gap-2">
                {[
                  { label: 'Delay', value: 'delay' },
                  { label: 'Speed', value: 'speed' },
                  { label: 'Distance', value: 'distance' },
                  { label: 'Name', value: 'name' },
                ].map(({ label, value }) => (
                  <button
                    key={value}
                    onClick={() => handleSortChange(value as SortBy)}
                    className={`px-3 py-1 text-xs rounded transition-colors flex items-center gap-1 ${
                      activeSort.field === value
                        ? 'bg-accent-blue text-dark-bg'
                        : 'bg-dark-bg/50 hover:bg-dark-bg text-text-secondary'
                    }`}
                  >
                    {label}
                    {activeSort.field === value && (
                      <span>{activeSort.direction === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {trainCount > 0 && (
              <p className="text-xs text-text-secondary pt-2">
                Showing {trainCount} train{trainCount !== 1 ? 's' : ''}
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
