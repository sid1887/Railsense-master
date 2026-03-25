/**
 * Component: HeatmapLayer
 * Leaflet heatmap visualization for train density/traffic
 * Shows where trains have been moving (based on historical snapshots)
 */

'use client';

import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { useTrainHeatmapData } from '@/hooks/useTrainInsight';

interface HeatmapLayerProps {
  map: L.Map | null;
  trainNumber?: string;
  timeWindowMinutes?: number;
  enabled?: boolean;
}

// Simple heatmap implementation using circle markers
// For production, use leaflet-heat library
export function HeatmapLayer({
  map,
  trainNumber,
  timeWindowMinutes = 60,
  enabled = true
}: HeatmapLayerProps) {
  const heatLayerRef = useRef<L.LayerGroup | null>(null);
  const { points, loading } = useTrainHeatmapData(trainNumber, timeWindowMinutes);

  useEffect(() => {
    if (!map || !enabled) return;

    // Clear previous layer
    if (heatLayerRef.current) {
      map.removeLayer(heatLayerRef.current);
    }

    // Create new layer group for heatmap
    heatLayerRef.current = L.layerGroup().addTo(map);

    if (!points || points.length === 0) return;

    // Render heatmap points as circle markers with opacity based on intensity
    points.forEach((point: any) => {
      const intensity = Math.min(point.intensity || 0, 1);
      const radius = 8 + intensity * 12; // 8-20px radius

      // Color gradient: green → yellow → red based on intensity
      let fillColor = '#16a34a'; // green
      if (intensity > 0.5) fillColor = '#eab308'; // yellow
      if (intensity > 0.75) fillColor = '#ef4444'; // red

      const circle = L.circleMarker([point.lat, point.lng], {
        radius,
        fillColor,
        color: '#1f2937',
        weight: 1,
        opacity: 0.7,
        fillOpacity: Math.max(0.3, intensity),
      });

      // Bind popup with statistics
      circle.bindPopup(
        `<div style="color: #f0f0f0; background: #1a1f3a; padding: 8px; border-radius: 4px; font-size: 11px;">
          <strong>Traffic Intensity:</strong> ${(intensity * 100).toFixed(0)}%<br/>
          <strong>Snapshots:</strong> ${point.count}<br/>
          <strong>Avg Delay:</strong> ${point.delayAvg} min
        </div>`,
        { className: 'dark-popup' }
      );

      circle.addTo(heatLayerRef.current!);
    });

    console.log(`[HeatmapLayer] Rendered ${points.length} heatmap points`);
  }, [map, points, enabled]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (heatLayerRef.current && map) {
        map.removeLayer(heatLayerRef.current);
      }
    };
  }, [map]);

  return null; // Layer renders directly to map
}

/**
 * Hook to manage heatmap layer toggle in maps
 */
export function useHeatmapToggle(initialEnabled = false) {
  const [enabled, setEnabled] = React.useState(initialEnabled);

  return {
    enabled,
    toggle: () => setEnabled(prev => !prev),
    enable: () => setEnabled(true),
    disable: () => setEnabled(false)
  };
}
