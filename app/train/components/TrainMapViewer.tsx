'use client';

import React from 'react';
import { TrainAnalytics } from '@/types/analytics';
import dynamic from 'next/dynamic';

/**
 * Train Map Viewer Component
 * Displays train position on interactive map with track segments and overlays
 * Uses dynamic loading for Leaflet to avoid SSR issues
 */

interface TrainMapViewerProps {
  analytics: TrainAnalytics;
}

// Dynamic import of Leaflet-based map with no SSR
const MapContent = dynamic(() => import('./MapContent'), {
  ssr: false,
  loading: () => (
    <div style={{
      width: '100%',
      height: '500px',
      background: '#f0f0f0',
      borderRadius: '8px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#666',
    }}>
      Loading map...
    </div>
  ),
});

export default function TrainMapViewer({ analytics }: TrainMapViewerProps) {
  // PHASE 12: FIXED - Render MapContent directly without conditional display
  // This prevents the Leaflet error when container is hidden during initialization
  // MapContent itself handles loading/error states internally

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      {/* Render MapContent directly - it handles its own loading states */}
      <MapContent analytics={analytics} />
    </div>
  );
}
