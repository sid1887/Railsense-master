'use client';

import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { TrainData, Station } from '@/types/train';

interface LiveTrainMapProps {
  trainData: TrainData;
}

/**
 * LiveTrainMap Component
 * Interactive Leaflet map showing train location
 * Displays route polyline and station markers
 */
export default function LiveTrainMap({ trainData }: LiveTrainMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const polylineRef = useRef<L.Polyline | null>(null);

  // Fix for default marker icons in Leaflet
  useEffect(() => {
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      iconUrl: 'https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/images/marker-icon.png',
      shadowUrl: 'https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/images/marker-shadow.png',
    });
  }, []);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Check if container has dimensions
    if (mapContainerRef.current.offsetHeight === 0 || mapContainerRef.current.offsetWidth === 0) {
      return;
    }

    const { latitude, longitude } = trainData.currentLocation;

    // Initialize map
    if (!mapRef.current) {
      try {
        mapRef.current = L.map(mapContainerRef.current, {
          center: [latitude, longitude],
          zoom: 10,
        });

        // Add tile layer (using CartoDB)
        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
          subdomains: 'abcd',
          maxZoom: 20,
        }).addTo(mapRef.current);
      } catch (err) {
        console.error('Error initializing Leaflet map:', err);
        return;
      }
    }

    // Update/create train marker
    const trainLatLng = L.latLng(latitude, longitude);

    if (markerRef.current) {
      markerRef.current.setLatLng(trainLatLng);
    } else {
      const customIcon = L.divIcon({
        html: `
          <div style="display: flex; align-items: center; justify-content: center; width: 40px; height: 40px; background: #00d4ff; border-radius: 50%; border: 3px solid #0a0e27; box-shadow: 0 0 10px #00d4ff;">
            <div style="font-size: 20px;">🚂</div>
          </div>
        `,
        iconSize: [40, 40],
        className: 'custom-marker',
      });

      markerRef.current = L.marker(trainLatLng, { icon: customIcon })
        .addTo(mapRef.current!)
        .bindPopup(
          `<div style="color: #f0f0f0; background: #1a1f3a; padding: 10px; border-radius: 5px;">
            <strong>${trainData.trainName}</strong><br/>
            Train #${trainData.trainNumber}<br/>
            Speed: ${trainData.speed} km/h<br/>
            Delay: ${trainData.delay.toFixed(1)} min
          </div>`,
          { className: 'dark-popup' }
        );
    }

    // Draw route polyline
    if (polylineRef.current) {
      mapRef.current.removeLayer(polylineRef.current);
    }

    const routeCoordinates = trainData.scheduledStations.map((station: Station) => [
      station.latitude,
      station.longitude,
    ]);

    if (routeCoordinates.length > 1) {
      polylineRef.current = L.polyline(routeCoordinates as L.LatLngExpression[], {
        color: '#00d4ff',
        weight: 2,
        opacity: 0.7,
        dashArray: '5, 5',
      }).addTo(mapRef.current!);

      // Fit bounds with route
      try {
        const bounds = L.latLngBounds(routeCoordinates as L.LatLngExpression[]);
        mapRef.current.fitBounds(bounds, { padding: [50, 50] });
      } catch (err) {
        console.warn('Error fitting bounds:', err);
      }
    }

    // Add station markers
    trainData.scheduledStations.forEach((station: Station, index: number) => {
      const isCompleted = index < trainData.currentStationIndex;
      const isCurrent = index === trainData.currentStationIndex;

      const stationIcon = L.divIcon({
        html: `
          <div style="display: flex; align-items: center; justify-content: center; width: 30px; height: 30px; background: ${
            isCompleted ? '#16a34a' : isCurrent ? '#ff9999' : '#666'
          }; border-radius: 50%; border: 2px solid #f0f0f0; font-size: 16px;">
            📍
          </div>
        `,
        iconSize: [30, 30],
      });

      L.marker([station.latitude, station.longitude], { icon: stationIcon })
        .addTo(mapRef.current!)
        .bindPopup(
          `<div style="color: #f0f0f0; background: #1a1f3a; padding: 10px; border-radius: 5px; font-size: 12px;">
            <strong>${station.name}</strong><br/>
            Arr: ${station.estimatedArrival || station.scheduledArrival}<br/>
            Dep: ${station.estimatedDeparture || station.scheduledDeparture}
          </div>`,
          { className: 'dark-popup' }
        );
    });

    // Pan to train (if map exists and is initialized)
    if (mapRef.current && mapRef.current.getContainer()) {
      try {
        mapRef.current.panTo(trainLatLng);
      } catch (err) {
        console.warn('Error panning map:', err);
      }
    }

    return () => {
      // Cleanup on unmount
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [trainData]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      className="card rounded-lg border border-accent-blue/30 overflow-hidden"
    >
      <div
        ref={mapContainerRef}
        style={{
          width: '100%',
          height: '400px',
          backgroundColor: '#0a0e27',
        }}
      />

      {/* Map info overlay */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="absolute bottom-4 left-4 bg-dark-card/90 backdrop-blur p-3 rounded-lg border border-accent-blue/30 text-xs text-text-secondary"
        style={{ zIndex: 400 }}
      >
        <p>
          <span className="text-accent-blue font-semibold">Current Position:</span>{' '}
          {trainData.currentLocation.latitude.toFixed(4)}°, {trainData.currentLocation.longitude.toFixed(4)}°
        </p>
        <p className="mt-1">
          <span className="text-accent-blue font-semibold">Speed:</span> {trainData.speed} km/h
        </p>
        <p className="mt-1">
          <span className="text-accent-blue font-semibold">Source:</span> {trainData.source}
        </p>
        <p className="mt-1">
          <span className="text-accent-blue font-semibold">Quality:</span> {trainData.dataQuality}/100
          {trainData.isSynthetic ? ' (synthetic)' : ''}
        </p>
      </motion.div>

      {/* Legend */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="absolute top-4 right-4 bg-dark-card/90 backdrop-blur p-3 rounded-lg border border-accent-blue/30 text-xs space-y-2"
        style={{ zIndex: 400 }}
      >
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-green-500 rounded-full" />
          <span className="text-text-secondary">Completed</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-red-400 rounded-full animate-pulse" />
          <span className="text-text-secondary">Current</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-gray-600 rounded-full" />
          <span className="text-text-secondary">Upcoming</span>
        </div>
      </motion.div>
    </motion.div>
  );
}
