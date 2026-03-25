'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Gauge, MapPin, Radar, Train } from 'lucide-react';
import SubsidiaryServiceNavBar from '@/app/components/SubsidiaryServiceNavBar';
import RailLoader from '@/components/RailLoader';

interface NetworkIntelligenceData {
  train: { number: string; name: string; source: string; destination: string };
  networkPosition: { currentStation: string; route: { totalStations: number; completedStations: number; upcomingStations: number } };
  nearbyTrains: { onSameRoute: number; onIntersectingRoutes: number; nearbyInNetwork: number };
  congestionAnalysis: { currentSection: string; aheadSection: string; behindSection: string; upstreamCongestion: boolean };
  interconnections: { stations: string[] };
  networkMetrics: { loadFactor: string; delayPropagation: string; routeReliability: number };
}

function asNumber(value: unknown, fallback = 0): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return fallback;
}

function asString(value: unknown, fallback = 'Unknown'): string {
  if (typeof value === 'string' && value.trim().length > 0) {
    return value.trim();
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }

  return fallback;
}

function normalizeNetworkPayload(payload: any, trainNumber: string): NetworkIntelligenceData | null {
  const root = payload && typeof payload === 'object' && payload.data && typeof payload.data === 'object'
    ? payload.data
    : payload;

  if (!root || typeof root !== 'object') {
    return null;
  }

  const nearbyTrains = root.nearbyTrains && typeof root.nearbyTrains === 'object' ? root.nearbyTrains : {};
  const segmentPressure = root.segmentPressure && typeof root.segmentPressure === 'object' ? root.segmentPressure : {};
  const congestion = root.congestionAnalysis && typeof root.congestionAnalysis === 'object' ? root.congestionAnalysis : {};
  const routePosition = root.networkPosition && typeof root.networkPosition === 'object' ? root.networkPosition : {};
  const route = routePosition.route && typeof routePosition.route === 'object' ? routePosition.route : {};

  const congestionScore = Math.max(0, Math.min(100, asNumber(congestion.score, 0)));
  const congestionLevel = asString(congestion.level, 'low').toLowerCase();
  const upstreamCongestion = congestionLevel === 'high' || congestionLevel === 'severe' || congestionScore >= 70;

  const routeReliabilityFromPayload = root.networkMetrics?.routeReliability;
  const normalizedReliability = typeof routeReliabilityFromPayload === 'number' && Number.isFinite(routeReliabilityFromPayload)
    ? (routeReliabilityFromPayload > 1 ? routeReliabilityFromPayload / 100 : routeReliabilityFromPayload)
    : 1 - (congestionScore / 100);
  const routeReliability = Math.max(0, Math.min(1, normalizedReliability));

  const intersectingCount = asNumber(nearbyTrains.onIntersectingRoutes, 0);
  const nearbyCount = asNumber(nearbyTrains.nearbyInNetwork, asNumber(nearbyTrains.trainsBetween, 0));

  const interconnectionStations = Array.isArray(root.interconnections?.stations)
    ? root.interconnections.stations.map((station: unknown) => asString(station, '')).filter((station: string) => station.length > 0)
    : Array.isArray(nearbyTrains.trains)
      ? nearbyTrains.trains
          .map((item: any) => asString(item?.trainName || item?.trainNumber, ''))
          .filter((station: string) => station.length > 0)
          .slice(0, 9)
      : [];

  return {
    train: {
      number: asString(root.train?.number, trainNumber),
      name: asString(root.train?.name, 'Unknown Train'),
      source: asString(root.train?.source, 'Unknown'),
      destination: asString(root.train?.destination, 'Unknown'),
    },
    networkPosition: {
      currentStation: asString(routePosition.currentStation || root.currentLocation?.station, 'Unknown'),
      route: {
        totalStations: asNumber(route.totalStations, asNumber(root.route?.totalStations, 0)),
        completedStations: asNumber(route.completedStations, asNumber(root.route?.currentStationIndex, 0)),
        upcomingStations: asNumber(route.upcomingStations, Math.max(0, asNumber(route.totalStations, 0) - asNumber(route.completedStations, 0))),
      },
    },
    nearbyTrains: {
      onSameRoute: asNumber(nearbyTrains.onSameRoute, 0),
      onIntersectingRoutes: intersectingCount,
      nearbyInNetwork: nearbyCount,
    },
    congestionAnalysis: {
      currentSection: asString(root.congestionAnalysis?.currentSection, asString(segmentPressure.from, 'Unknown section')),
      aheadSection: asString(root.congestionAnalysis?.aheadSection, asString(segmentPressure.to, 'Unknown section')),
      behindSection: asString(root.congestionAnalysis?.behindSection, 'No segment data'),
      upstreamCongestion,
    },
    interconnections: {
      stations: interconnectionStations,
    },
    networkMetrics: {
      loadFactor: asString(root.networkMetrics?.loadFactor, `${Math.round(congestionScore)}%`),
      delayPropagation: asString(root.networkMetrics?.delayPropagation, upstreamCongestion ? 'Elevated' : 'Stable'),
      routeReliability,
    },
  };
}

function NetworkIntelligenceContent() {
  const searchParams = useSearchParams();
  const trainNumber = searchParams.get('trainNumber') || '01211';
  const [data, setData] = useState<NetworkIntelligenceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/system/network-intelligence?trainNumber=${trainNumber}`);
        if (!response.ok) throw new Error(`API error: ${response.status}`);
        const payload = await response.json();
        const normalized = normalizeNetworkPayload(payload, trainNumber);
        if (!normalized) {
          throw new Error('Invalid network intelligence response format');
        }
        setData(normalized);
      } catch (err: any) {
        setError(err?.message || 'Failed to fetch network intelligence');
        setData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [trainNumber]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <RailLoader size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_10%_0%,#17345e_0%,#0b132a_40%,#090d1f_100%)] px-4 pb-14 pt-6 md:px-7">
      <SubsidiaryServiceNavBar trainNumber={trainNumber} currentService="Network Intelligence" />
      <div className="mx-auto mt-16 max-w-6xl space-y-5">
        <header className="surface-glass rounded-2xl p-5">
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-cyan-300">Network Intelligence</p>
          <h1 className="text-3xl font-black text-white">Train Network Situation</h1>
          <p className="mt-2 text-sm text-slate-300">Train: {trainNumber}</p>
          {error && <p className="mt-3 text-sm text-red-300">{error}</p>}
        </header>

        {data && (
          <>
            <section className="grid grid-cols-1 gap-4 md:grid-cols-4">
              <Tile label="Current Station" value={data.networkPosition.currentStation} icon={<MapPin className="h-4 w-4" />} />
              <Tile label="Same Route" value={data.nearbyTrains.onSameRoute} icon={<Train className="h-4 w-4" />} />
              <Tile label="Intersecting" value={data.nearbyTrains.onIntersectingRoutes} icon={<Radar className="h-4 w-4" />} />
              <Tile label="Route Reliability" value={`${Math.round(data.networkMetrics.routeReliability * 100)}%`} icon={<Gauge className="h-4 w-4" />} />
            </section>

            <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div className="surface-glass rounded-2xl p-5">
                <h2 className="mb-4 text-lg font-bold text-white">Route Progress</h2>
                <p className="text-sm text-slate-300">
                  {data.networkPosition.route.completedStations} of {data.networkPosition.route.totalStations} stations completed
                </p>
                <div className="mt-3 h-2 rounded-full bg-slate-800">
                  <div
                    className="h-2 rounded-full bg-gradient-to-r from-cyan-400 to-blue-500"
                    style={{ width: `${(data.networkPosition.route.completedStations / Math.max(1, data.networkPosition.route.totalStations)) * 100}%` }}
                  />
                </div>
                <p className="mt-2 text-xs text-slate-400">{data.networkPosition.route.upcomingStations} stations remaining</p>
              </div>

              <div className="surface-glass rounded-2xl p-5">
                <h2 className="mb-4 text-lg font-bold text-white">Section Congestion</h2>
                <ul className="space-y-2 text-sm text-slate-200">
                  <li>Current section: {data.congestionAnalysis.currentSection}</li>
                  <li>Ahead section: {data.congestionAnalysis.aheadSection}</li>
                  <li>Behind section: {data.congestionAnalysis.behindSection}</li>
                  <li>Upstream risk: {data.congestionAnalysis.upstreamCongestion ? 'High' : 'Low'}</li>
                </ul>
              </div>
            </section>

            <section className="surface-glass rounded-2xl p-5">
              <h2 className="mb-4 text-lg font-bold text-white">Interconnected Stations</h2>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3">
                {data.interconnections.stations.map((station, idx) => (
                  <div key={`${station}-${idx}`} className="rounded-lg border border-slate-700 bg-slate-900/45 px-3 py-2 text-sm text-slate-200">
                    {idx + 1}. {station}
                  </div>
                ))}
              </div>
            </section>

            <section className="surface-glass rounded-2xl p-5">
              <h2 className="mb-3 text-lg font-bold text-white">Network Health</h2>
              <div className="grid grid-cols-1 gap-2 md:grid-cols-3 text-sm text-slate-200">
                <div className="rounded-lg border border-slate-700 bg-slate-900/45 px-3 py-2">Load factor: {data.networkMetrics.loadFactor}</div>
                <div className="rounded-lg border border-slate-700 bg-slate-900/45 px-3 py-2">Delay propagation: {data.networkMetrics.delayPropagation}</div>
                <div className="rounded-lg border border-slate-700 bg-slate-900/45 px-3 py-2">Nearby in network: {data.nearbyTrains.nearbyInNetwork}</div>
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}

function Tile({ label, value, icon }: { label: string; value: string | number; icon: React.ReactNode }) {
  return (
    <article className="surface-glass rounded-xl px-4 py-3">
      <p className="mb-1 flex items-center gap-1 text-[11px] uppercase tracking-[0.12em] text-slate-400">{icon}{label}</p>
      <p className="text-sm font-bold text-cyan-100">{value}</p>
    </article>
  );
}

export default function NetworkIntelligencePage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-slate-950"><RailLoader size="lg" /></div>}>
      <NetworkIntelligenceContent />
    </Suspense>
  );
}
