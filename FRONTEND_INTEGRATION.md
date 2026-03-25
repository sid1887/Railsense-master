# Frontend Integration Guide

## Overview
This guide shows how to update React components to use the new `/api/train/:id` endpoint instead of the old fragmented API calls.

## Quick Start

### 1. Update SWR Hook Pattern

**OLD (Fragmented):**
```typescript
// Was calling multiple endpoints
const { data: trainData } = useSWR(`/api/trains/${id}`, fetcher);
const { data: haltData } = useSWR(`/api/trains/${id}/halt`, fetcher);
const { data: nearbyData } = useSWR(`/api/trains/${id}/nearby`, fetcher);
```

**NEW (Single Endpoint):**
```typescript
import useSWR from 'swr';

const { data: trainData, isLoading, error } = useSWR(
  `/api/train/${trainNumber}`,
  fetcher,
  { refreshInterval: 5000 } // Refresh every 5 seconds
);

// Access all fields from single response
if (trainData) {
  const {
    position,      // { lat, lng, speed, accuracy_m, timestamp }
    section,       // { current_station, next_station, distance_to_next_m }
    halt,          // { detected, duration_sec, is_scheduled, confidence, reason_candidates }
    nearby,        // { count, trains, congestion_level }
    prediction,    // { wait_time_min, confidence, method }
    metadata       // { source, data_quality, sample_count_1h }
  } = trainData;
}
```

### 2. Component Examples

#### TrainCard Component
```typescript
// components/TrainCard.tsx
import useSWR from 'swr';

interface TrainCardProps {
  trainNumber: string;
}

export function TrainCard({ trainNumber }: TrainCardProps) {
  const { data: train, isLoading } = useSWR(
    `/api/train/${trainNumber}`,
    fetcher,
    { refreshInterval: 5000 }
  );

  if (isLoading) return <SkeletonLoader />;
  if (!train) return <div>Train not found</div>;

  return (
    <div className="train-card">
      {/* Position Info */}
      <div>
        <h3>{train.trainNumber}</h3>
        <p>Speed: {train.position.speed} km/h</p>
        <p>Location: ({train.position.lat.toFixed(4)}, {train.position.lng.toFixed(4)})</p>
      </div>

      {/* Section Info */}
      <div>
        <p>📍 {train.section.current_station}</p>
        <p>→ {train.section.next_station} ({train.section.distance_to_next_m}m)</p>
      </div>

      {/* Halt Status */}
      {train.halt.detected && (
        <div className="halt-alert">
          <p>🛑 Halted for {train.halt.duration_sec}s</p>
          <p>Confidence: {(train.halt.confidence * 100).toFixed(0)}%</p>
          {train.halt.reason_candidates[0] && (
            <p>Reason: {train.halt.reason_candidates[0].label}</p>
          )}
        </div>
      )}

      {/* Wait Prediction */}
      <div className="prediction">
        <p>Expected wait: {train.prediction.wait_time_min.min}-{train.prediction.wait_time_min.max} min</p>
      </div>

      {/* Data Quality */}
      <div className="metadata">
        <p>Quality: {train.metadata.data_quality}</p>
        <p>Sources: {train.metadata.source.join(', ')}</p>
        <p>Samples (1h): {train.metadata.sample_count_1h}</p>
      </div>
    </div>
  );
}
```

#### Real-time Map Component
```typescript
// components/TrainMap.tsx
import { useEffect, useRef } from 'react';
import useSWR from 'swr';

export function TrainMap({ trainNumber }: { trainNumber: string }) {
  const mapRef = useRef(null);
  const { data: train } = useSWR(
    `/api/train/${trainNumber}`,
    fetcher,
    { refreshInterval: 3000 }
  );

  useEffect(() => {
    if (!train?.position || !mapRef.current) return;

    // Update marker position (smooth animation)
    const marker = mapRef.current as any;
    marker.style.left = `${train.position.lng}%`;
    marker.style.top = `${train.position.lat}%`;

    // Show nearby trains
    train.nearby.trains.forEach((t: any, idx: number) => {
      const elem = document.getElementById(`nearby-${idx}`);
      if (elem) {
        elem.style.left = `${t.lng}%`;
        elem.style.top = `${t.lat}%`;
      }
    });
  }, [train]);

  if (!train) return <div>Loading map...</div>;

  return (
    <div className="map-container" ref={mapRef}>
      {/* Current train */}
      <div className="train-marker" style={{
        left: `${train.position.lng}%`,
        top: `${train.position.lat}%`
      }}>
        {train.trainNumber}
      </div>

      {/* Nearby trains */}
      {train.nearby.trains.map((t: any, i: number) => (
        <div
          key={i}
          id={`nearby-${i}`}
          className="nearby-marker"
          style={{
            left: `${t.lng}%`,
            top: `${t.lat}%`
          }}
        >
          {t.trainNumber}
        </div>
      ))}
    </div>
  );
}
```

#### Halt Detection Alert
```typescript
// components/HaltAlert.tsx
import useSWR from 'swr';
import { motion } from 'framer-motion';

export function HaltAlert({ trainNumber }: { trainNumber: string }) {
  const { data: train } = useSWR(`/api/train/${trainNumber}`, fetcher, {
    refreshInterval: 5000
  });

  if (!train?.halt.detected) return null;

  const confidence = Math.round(train.halt.confidence * 100);
  const topReason = train.halt.reason_candidates[0];

  return (
    <motion.div
      className="halt-alert"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      <div className="alert-header">
        🛑 Train Halted
      </div>

      <div className="alert-content">
        <p>Duration: {Math.floor(train.halt.duration_sec / 60)}min {train.halt.duration_sec % 60}s</p>
        <p>Type: {train.halt.is_scheduled ? 'Scheduled Stop' : 'Unscheduled Halt'}</p>

        <div className="confidence-meter">
          <div
            className="confidence-bar"
            style={{ width: `${confidence}%` }}
          />
          <span>{confidence}% confidence</span>
        </div>

        {topReason && (
          <div className="reason">
            <p>Likely cause: {topReason.label}</p>
            <p className="reason-score">Score: {(topReason.score * 100).toFixed(0)}%</p>
          </div>
        )}

        {train.nearby.count > 0 && (
          <div className="congestion">
            <p>Congestion: {train.nearby.congestion_level}</p>
            <p>{train.nearby.count} nearby trains</p>
          </div>
        )}
      </div>

      <div className="prediction">
        <p>Expected wait: {train.prediction.wait_time_min.min}-{train.prediction.wait_time_min.max} min</p>
        <p className="confidence">{(train.prediction.confidence * 100).toFixed(0)}% confident</p>
      </div>
    </motion.div>
  );
}
```

### 3. Search Results Component
```typescript
// components/SearchResults.tsx
import useSWR from 'swr';

export function SearchResults({ trainNumbers }: { trainNumbers: string[] }) {
  const trains = trainNumbers.map(id => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const { data } = useSWR(`/api/train/${id}`, fetcher, {
      refreshInterval: 5000
    });
    return data;
  });

  return (
    <div className="results-grid">
      {trains.map((train) => (
        <div key={train?.trainNumber} className="result-card">
          <h4>{train?.trainNumber}</h4>

          <div className="status-badges">
            <span className={`data-quality ${train?.metadata.data_quality}`}>
              {train?.metadata.data_quality}
            </span>
            {train?.halt.detected && (
              <span className="halt-badge">Halted</span>
            )}
          </div>

          <p>Speed: {train?.position.speed} km/h</p>
          <p>Station: {train?.section.current_station}</p>
          <p>Wait: {train?.prediction.wait_time_min.min}-{train?.prediction.wait_time_min.max}min</p>
        </div>
      ))}
    </div>
  );
}
```

## Data Quality Visualization

Show users where data is coming from:

```typescript
// components/DataQualityBadge.tsx
export function DataQualityBadge({ train }: { train: TrainData }) {
  const sourceIcons: Record<string, string> = {
    'ntes': '📋',
    'railyatri': '📱',
    'real-schedule': '📅',
    'simulated': '🎮',
    'mock': '❓'
  };

  return (
    <div className="quality-badge">
      <div className={`quality-${train.metadata.data_quality.toLowerCase()}`}>
        {train.metadata.data_quality}
      </div>

      <div className="sources">
        {train.metadata.source.map(src => (
          <span key={src} title={src}>
            {sourceIcons[src] || '?'}
          </span>
        ))}
      </div>

      <div className="timestamp">
        Updated {train.metadata.last_update_ago_sec}s ago
      </div>
    </div>
  );
}
```

## Migration Steps

### Step 1: Update Environment
```bash
# Ensure API calls will hit /api/train/:id
# No env changes needed if running on localhost:3000
```

### Step 2: Replace Old Hooks
Find all instances of:
- `useSWR(/api/trains/:id, ...)`
- `useSWR(/api/trains/:id/halt, ...)`
- `useSWR(/api/trains/:id/nearby, ...)`

Replace with:
- `useSWR(/api/train/:id, ...)`

### Step 3: Update Component Logic
Components that previously checked multiple data sources now check single response:

```typescript
// OLD
const { data: halt } = useSWR(...);
if (halt?.detected) { ... }

// NEW
const { data: train } = useSWR(...);
if (train?.halt.detected) { ... }
```

### Step 4: Test Individual Trains
```bash
# Terminal 1: Start collector
node scripts/stableCollector.js

# Terminal 2: Start server
npm run dev

# Terminal 3: Test API
curl http://localhost:3000/api/train/12955 | jq .
```

### Step 5: Update Landing Page
The landing page already shows search functionality. Update it to use new schema:

```typescript
// In EnhancedSearchComponent or similar
const handleSearch = async (trainNumber: string) => {
  const res = await fetch(`/api/train/${trainNumber}`);
  const data = await res.json();

  // Now data has complete structure
  navigate(`/train/${trainNumber}`, { state: { initialData: data } });
};
```

## Performance Tips

### Data Refresh Rates
```typescript
// Real-time tracking (5-second interval)
useSWR(url, fetcher, { refreshInterval: 5000 })

// Landing page (30-second interval)
useSWR(url, fetcher, { refreshInterval: 30000 })

// Admin monitoring (10-second interval)
useSWR(url, fetcher, { refreshInterval: 10000 })
```

### Deduplication
SWR automatically deduplicates requests in the same interval — multiple components requesting the same train will share cached data.

### Error Handling
```typescript
const { data, isLoading, error } = useSWR(url, fetcher);

if (error?.status === 404) {
  return <div>Train not found</div>;
}

if (error?.status === 500) {
  return <div>Data service unavailable</div>;
}

if (isLoading) {
  return <SkeletonLoader />;
}
```

## Backwards Compatibility

The new endpoint is fully backwards compatible. Old code will continue to work during transition:

```typescript
// Old style still works
const { data: train } = useSWR(`/api/train/${id}`, fetcher);

// Now has all fields from new schema
console.log(train.halt.detected);
console.log(train.nearby.count);
console.log(train.prediction.wait_time_min);
```

---

**Complete migration should take 2-3 hours for typical application with 5-10 component updates.**
