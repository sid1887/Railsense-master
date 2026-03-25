/**
 * Skeleton Loading Components
 * Better UX than spinners - shows the expected layout
 */
import React from 'react';

export const TrainCardSkeleton: React.FC = () => (
  <div className="card p-6 animate-pulse">
    <div className="flex gap-4">
      <div className="w-16 h-16 bg-dark-bg rounded-lg" />
      <div className="flex-1">
        <div className="h-4 bg-dark-bg rounded w-1/3 mb-2" />
        <div className="h-3 bg-dark-bg rounded w-1/2 mb-3" />
        <div className="grid grid-cols-3 gap-2">
          <div className="h-3 bg-dark-bg rounded" />
          <div className="h-3 bg-dark-bg rounded" />
          <div className="h-3 bg-dark-bg rounded" />
        </div>
      </div>
    </div>
  </div>
);

export const MapSkeleton: React.FC = () => (
  <div className="w-full h-96 bg-dark-card rounded-lg animate-pulse" />
);

export const StatsSkeleton: React.FC = () => (
  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-pulse">
    {[1, 2, 3, 4].map((i) => (
      <div key={i} className="bg-dark-card rounded-lg p-4 space-y-2">
        <div className="h-8 bg-dark-bg rounded" />
        <div className="h-3 bg-dark-bg rounded w-2/3" />
      </div>
    ))}
  </div>
);

export const TimelineSkeleton: React.FC = () => (
  <div className="space-y-4 animate-pulse">
    {[1, 2, 3, 4, 5].map((i) => (
      <div key={i} className="flex gap-4">
        <div className="w-4 h-4 bg-dark-bg rounded-full mt-1 flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-3 bg-dark-bg rounded w-1/4" />
          <div className="h-2 bg-dark-bg rounded w-1/2" />
        </div>
      </div>
    ))}
  </div>
);

export const HeatmapSkeleton: React.FC = () => (
  <div className="w-full h-64 bg-dark-card rounded-lg animate-pulse flex items-center justify-center">
    <div className="text-center">
      <div className="h-8 bg-dark-bg rounded w-48 mx-auto mb-2" />
      <div className="h-4 bg-dark-bg rounded w-32 mx-auto" />
    </div>
  </div>
);
