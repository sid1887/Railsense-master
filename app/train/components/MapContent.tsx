'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import * as turf from '@turf/turf';
import { MapPinOff } from 'lucide-react';
import { TrainAnalytics } from '@/types/analytics';

interface MapContentProps {
  analytics: TrainAnalytics;
}

interface RouteStop {
  name: string;
  code?: string;
  lat?: number;
  lng?: number;
}

interface RoutePayload {
  name: string;
  color: string;
  coordinates: [number, number][]; // [lng, lat]
  stops: RouteStop[];
}

interface MapViewResponse {
  success?: boolean;
  data?: {
    route?: {
      trainName?: string;
      color?: string;
      coordinates?: [number, number][];
      stops?: RouteStop[];
    };
  };
  liveUnavailable?: boolean;
  liveDataQuality?: string;
  liveDiagnostics?: {
    attemptedProviders?: string[];
    failedProviders?: string[];
    reason?: string;
  };
  error?: string;
  message?: string;
}

function hasValidCoords(coords: [number, number][]): boolean {
  return Array.isArray(coords) && coords.length >= 2;
}

export default function MapContent({ analytics }: MapContentProps) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.CircleMarker | null>(null);
  const stationMarkersRef = useRef<L.CircleMarker[]>([]);
  const zoomControlRef = useRef<L.Control | null>(null);
  const routeLineRef = useRef<any>(null);

  const [route, setRoute] = useState<RoutePayload | null>(null);
  const [routesLoading, setRoutesLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [liveUnavailable, setLiveUnavailable] = useState<boolean | null>(null);
  const [liveReason, setLiveReason] = useState<string>('');
  const [failedProviders, setFailedProviders] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function fetchRoute() {
      setRoutesLoading(true);
      setError(null);
      setLiveUnavailable(null);
      setLiveReason('');
      setFailedProviders([]);

      try {
        const res = await fetch(`/api/mapview?trainNumber=${analytics.trainNumber}`, {
          method: 'GET',
          cache: 'no-store',
          headers: {
            Accept: 'application/json',
          },
        });

        const contentType = res.headers.get('content-type') || '';
        const rawBody = await res.text();

        if (!contentType.includes('application/json')) {
          throw new Error(`Map API returned non-JSON response (${res.status}).`);
        }

        let data: MapViewResponse;
        try {
          data = JSON.parse(rawBody) as MapViewResponse;
        } catch {
          throw new Error('Map API returned malformed JSON.');
        }

        if (!res.ok) {
          throw new Error(data?.message || data?.error || `Map API error (${res.status}).`);
        }

        if (!data?.success || !data?.data?.route) {
          throw new Error(data?.message || data?.error || 'Route unavailable');
        }

        setLiveUnavailable(Boolean(data.liveUnavailable));
  setLiveReason(data.liveDiagnostics?.reason || '');
  setFailedProviders(Array.isArray(data.liveDiagnostics?.failedProviders) ? data.liveDiagnostics!.failedProviders! : []);

        const nextRoute: RoutePayload = {
          name: `${data.data.route.trainName || analytics.trainName} Route`,
          color: data.data.route.color || '#00E0FF',
          coordinates: data.data.route.coordinates || [],
          stops: data.data.route.stops || [],
        };

        if (!cancelled) {
          setRoute(nextRoute);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Failed to load route');
          setRoute(null);
        }
      } finally {
        if (!cancelled) {
          setRoutesLoading(false);
        }
      }
    }

    fetchRoute();

    return () => {
      cancelled = true;
    };
  }, [analytics.trainNumber, analytics.trainName]);

  const gpsPosition = useMemo<[number, number] | null>(() => {
    const lat = analytics.currentLocation?.latitude;
    const lng = analytics.currentLocation?.longitude;

    console.log(`[MapContent] Computing gpsPosition:`, {
      lat,
      lng,
      isNaN_lat: Number.isNaN(lat),
      isNaN_lng: Number.isNaN(lng),
      isFalsy_lat: !lat,
      isFalsy_lng: !lng,
    });

    if (!lat || !lng || Number.isNaN(lat) || Number.isNaN(lng)) {
      console.log(`[MapContent] gpsPosition is NULL - one of the values was invalid`);
      return null;
    }

    console.log(`[MapContent] gpsPosition is valid:`, [lat, lng]);
    return [lat, lng];
  }, [analytics.currentLocation]);

  useEffect(() => {
    const onTimelineHover = (event: Event) => {
      const customEvent = event as CustomEvent<{ code?: string | null }>;
      const code = (customEvent.detail?.code || '').toUpperCase();

      stationMarkersRef.current.forEach(marker => {
        const markerCode = String((marker.options as any)?.stationCode || '').toUpperCase();
        const isActive = Boolean(code) && code === markerCode;
        marker.setStyle({
          radius: isActive ? 8 : 5,
          color: isActive ? 'hsl(262, 83%, 58%)' : '#333',
          fillColor: isActive ? 'hsl(262, 83%, 58%)' : '#ffffff',
          weight: isActive ? 2 : 1,
        });
      });
    };

    window.addEventListener('timeline-station-hover', onTimelineHover as EventListener);
    return () => window.removeEventListener('timeline-station-hover', onTimelineHover as EventListener);
  }, []);

  useEffect(() => {
    if (!mapRef.current || !route || !hasValidCoords(route.coordinates)) {
      return;
    }

    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
      markerRef.current = null;
      stationMarkersRef.current = [];
      zoomControlRef.current = null;
      routeLineRef.current = null;
    }

    const firstPoint = route.coordinates[0];
    const center: L.LatLngTuple = [firstPoint[1], firstPoint[0]];

    // Ensure container is rendered and has dimensions before Leaflet init
    if (!mapRef.current.offsetHeight || !mapRef.current.offsetWidth) {
      const timer = window.setTimeout(() => {
        if (!mapRef.current) return;
        const map = L.map(mapRef.current, {
          center,
          zoom: 7,
          minZoom: 4,
          maxZoom: 16,
          zoomControl: false,
          preferCanvas: true,
        });
        mapInstanceRef.current = map;
        initializeMapLayers(map, route, center);
      }, 50);
      return () => clearTimeout(timer);
    }

    const map = L.map(mapRef.current, {
      center,
      zoom: 7,
      minZoom: 4,
      maxZoom: 16,
      zoomControl: false,
      preferCanvas: true,
    });

    mapInstanceRef.current = map;
    return initializeMapLayers(map, route, center);

  }, [route, gpsPosition, analytics.currentLocation.stationCode]);

  // Extracted map initialization function to ensure proper lifecycle
  const initializeMapLayers = (
    map: L.Map,
    route: RoutePayload,
    center: L.LatLngTuple
  ) => {
    try {
      // Guard: check if map is still valid
      if (!map || !map.getContainer()) {
        console.warn('Map container unavailable before layer initialization');
        return () => {};
      }

      // Prevent canvas errors by using error boundaries
      try {
        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png', {
          attribution: 'Carto',
          subdomains: 'abcd',
          maxZoom: 20,
        }).addTo(map);
      } catch (tileError) {
        console.error('Tile layer error:', tileError);
      }

      try {
        L.tileLayer('https://{s}.tiles.openrailwaymap.org/standard/{z}/{x}/{y}.png', {
          maxZoom: 19,
          opacity: 0.85,
          attribution: 'OpenStreetMap/OpenRailwayMap',
        }).addTo(map);
      } catch (tileError) {
        console.error('Railway tile layer error:', tileError);
      }

      const latLngRoute: L.LatLngTuple[] = route.coordinates.map(([lng, lat]) => [lat, lng]);

      try {
        L.polyline(latLngRoute, {
          color: 'rgba(0,0,0,0.35)',
          weight: 7,
          opacity: 1,
          lineCap: 'round',
          lineJoin: 'round',
        }).addTo(map);

        L.polyline(latLngRoute, {
          color: '#F59E0B',
          weight: 4,
          opacity: 0.95,
          lineCap: 'round',
          lineJoin: 'round',
        }).addTo(map);
      } catch (polylineError) {
        console.error('Polyline rendering error:', polylineError);
      }

      routeLineRef.current = turf.lineString(route.coordinates);

      route.stops
        .filter(stop => typeof stop.lat === 'number' && typeof stop.lng === 'number')
        .forEach(stop => {
          const isCurrent = (stop.code || '').toUpperCase() === (analytics.currentLocation.stationCode || '').toUpperCase();
          const stationMarker = L.circleMarker([stop.lat as number, stop.lng as number], {
            radius: isCurrent ? 7 : 5,
            fillColor: isCurrent ? 'hsl(262, 83%, 58%)' : '#ffffff',
            fillOpacity: 1,
            color: isCurrent ? 'hsl(262, 83%, 58%)' : '#333333',
            weight: isCurrent ? 2 : 1,
            pane: 'markerPane',
          }) as L.CircleMarker & { options: L.CircleMarkerOptions & { stationCode?: string } };

          stationMarker.options.stationCode = stop.code;
          stationMarker
            .bindTooltip(
              `${stop.name}${stop.code ? ` (${stop.code})` : ''}`,
              {
                permanent: true,
                direction: 'right',
                className: 'custom-tooltip',
                offset: [8, 0],
              }
            )
            .addTo(map);

          stationMarker.on('mouseover', () => {
            window.dispatchEvent(
              new CustomEvent('map-station-hover', {
                detail: { code: stop.code || null },
              })
            );
          });
          stationMarker.on('mouseout', () => {
            window.dispatchEvent(
              new CustomEvent('map-station-hover', {
                detail: { code: null },
              })
            );
          });

          stationMarkersRef.current.push(stationMarker);
        });

      let markerPos: L.LatLngTuple = center;
      if (gpsPosition) {
        markerPos = [gpsPosition[0], gpsPosition[1]];

        if (routeLineRef.current) {
          try {
            const snap = turf.nearestPointOnLine(routeLineRef.current, turf.point([gpsPosition[1], gpsPosition[0]]));
            markerPos = [snap.geometry.coordinates[1], snap.geometry.coordinates[0]];
          } catch {
            markerPos = [gpsPosition[0], gpsPosition[1]];
          }
        }
      }

      markerRef.current = L.circleMarker(markerPos, {
        radius: 8,
        fillColor: '#8B5CF6',
        fillOpacity: 1,
        stroke: true,
        color: '#ffffff',
        weight: 2,
        className: 'live-train-pulse',
      }).addTo(map);

      const customZoomControl = new L.Control({ position: 'bottomright' });
      customZoomControl.onAdd = () => {
        const container = L.DomUtil.create('div', 'railsense-zoom-controls');
        container.innerHTML = `
          <button type="button" class="railsense-zoom-btn" aria-label="Zoom in">+</button>
          <button type="button" class="railsense-zoom-btn" aria-label="Zoom out">-</button>
        `;

        const buttons = container.querySelectorAll('.railsense-zoom-btn');
        const zoomInBtn = buttons[0] as HTMLButtonElement;
        const zoomOutBtn = buttons[1] as HTMLButtonElement;

        L.DomEvent.disableClickPropagation(container);
        L.DomEvent.on(zoomInBtn, 'click', () => {
          if (mapInstanceRef.current) mapInstanceRef.current.zoomIn();
        });
        L.DomEvent.on(zoomOutBtn, 'click', () => {
          if (mapInstanceRef.current) mapInstanceRef.current.zoomOut();
        });

        return container;
      };

      customZoomControl.addTo(map);
      zoomControlRef.current = customZoomControl;

      try {
        const fitTarget = latLngRoute.length > 1 ? latLngRoute : [markerPos];
        map.fitBounds(L.latLngBounds(fitTarget), { padding: [24, 24] });
      } catch (boundsError) {
        console.error('fitBounds error:', boundsError);
      }

      // Use requestAnimationFrame for better timing with safety guard
      const raf = window.requestAnimationFrame(() => {
        try {
          if (mapInstanceRef.current && mapRef.current && mapInstanceRef.current.getContainer()) {
            mapInstanceRef.current.invalidateSize();
          }
        } catch (invalidError) {
          console.error('invalidateSize error:', invalidError);
        }
      });

      return () => {
        try {
          // Stop any pending animations or callbacks
          if (mapInstanceRef.current) {
            // Remove all layers before destroying map
            mapInstanceRef.current.eachLayer((layer: any) => {
              try {
                mapInstanceRef.current?.removeLayer(layer);
              } catch (e) {
                // Ignore layer removal errors
              }
            });

            mapInstanceRef.current.remove();
            mapInstanceRef.current = null;
          }
        } catch (cleanupError) {
          console.error('Map cleanup error:', cleanupError);
        }
        markerRef.current = null;
        stationMarkersRef.current = [];
        zoomControlRef.current = null;
        routeLineRef.current = null;
      };
    } catch (error) {
      console.error('Map initialization error:', error);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
      return () => {};
    }
  };

  useEffect(() => {
    if (!mapInstanceRef.current || !markerRef.current || !gpsPosition) {
      return;
    }

    try {
      let nextPos: L.LatLngTuple = [gpsPosition[0], gpsPosition[1]];

      if (routeLineRef.current) {
        try {
          const snap = turf.nearestPointOnLine(routeLineRef.current, turf.point([gpsPosition[1], gpsPosition[0]]));
          nextPos = [snap.geometry.coordinates[1], snap.geometry.coordinates[0]];
        } catch {
          nextPos = [gpsPosition[0], gpsPosition[1]];
        }
      }

      if (markerRef.current && mapInstanceRef.current) {
        markerRef.current.setLatLng(nextPos);
      }
    } catch (error) {
      console.error('Error updating marker position:', error);
    }
  }, [gpsPosition]);

  if (routesLoading) {
    return (
      <div style={{ width: '100%', height: '500px', borderRadius: '8px', background: '#172033', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9bb0d1' }}>
        Loading route map...
      </div>
    );
  }

  if (!route || !hasValidCoords(route.coordinates)) {
    return (
      <div style={{ width: '100%', minHeight: '500px', borderRadius: '8px', background: '#141922', color: '#d0dbef', padding: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', maxWidth: '520px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '44px', height: '44px', borderRadius: '999px', background: 'rgba(255,255,255,0.08)', marginBottom: '12px' }}>
            <MapPinOff size={20} color="#a6b2c8" />
          </div>
          <div style={{ fontWeight: 600, marginBottom: '8px', fontSize: '16px' }}>Map unavailable</div>
          <div style={{ opacity: 0.85, marginBottom: '8px', fontSize: '13px' }}>{error || 'Route coordinates are missing.'}</div>
          <div style={{ opacity: 0.75, fontSize: '12px', marginBottom: '4px' }}>
            Live GPS unavailable: {liveUnavailable === null ? (analytics.speed <= 0 ? 'yes' : 'no') : liveUnavailable ? 'yes' : 'no'}
          </div>
          {liveReason ? (
            <div style={{ opacity: 0.68, fontSize: '12px' }}>
              Reason: {liveReason}{failedProviders.length ? ` (${failedProviders.join(', ')})` : ''}
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div
      ref={mapRef}
      style={{
        width: '100%',
        height: '500px',
        borderRadius: '8px',
        overflow: 'hidden',
        background: '#0e1628',
        boxShadow: '0 4px 14px rgba(0,0,0,0.35)',
      }}
      className="mapContainer"
    />
  );
}
