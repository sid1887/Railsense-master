# Railsense Frontend Integration Guide

## Overview

Complete guide for integrating the production analytics system into React/Next.js frontend components.

---

## 🎯 Key Endpoints for UI

### 1. Comprehensive Analytics

**Endpoint:** `GET /api/train-analytics`
**Purpose:** Full multi-factor analysis for train detail pages
**Response Time:** <200ms
**Cache:** 30 seconds

**Example:**
```typescript
const fetchAnalytics = async (trainNumber: string) => {
  const res = await fetch(`/api/train-analytics?trainNumber=${trainNumber}`);
  return res.json();
};
```

---

## 💡 UI Component Examples

### Train Detail Page with Full Analytics

```typescript
// pages/trains/[trainNumber].tsx

import { useEffect, useState } from 'react';
import { TrainAnalytics } from '@/types/analytics';

export default function TrainDetailPage({ trainNumber }: { trainNumber: string }) {
  const [analytics, setAnalytics] = useState<TrainAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(`/api/train-analytics?trainNumber=${trainNumber}`);
        const data = await res.json();
        setAnalytics(data.data);
      } catch (error) {
        console.error('Failed to fetch analytics:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, [trainNumber]);

  if (loading) return <div>Loading train analytics...</div>;
  if (!analytics) return <div>Train not found</div>;

  return (
    <div className="train-detail-page">
      <header>
        <h1>{analytics.trainName}</h1>
        <p>Train #{analytics.trainNumber}</p>
      </header>

      {/* Movement State */}
      <section className="movement-section">
        <h2>Current Status</h2>
        <div className={`movement-state ${analytics.movementState}`}>
          <span className="icon">
            {analytics.movementState === 'running' ? '🟢' : '🔴'}
          </span>
          <span className="text">{analytics.movementState.toUpperCase()}</span>
        </div>
        <p>Speed: {analytics.speed} km/h | Delay: {analytics.delay} min</p>
      </section>

      {/* Current Location */}
      <section className="location-section">
        <h2>Current Location</h2>
        <div className="location-card">
          <p className="station-name">{analytics.currentLocation.stationName}</p>
          <p className="coordinates">
            {analytics.currentLocation.latitude.toFixed(4)},
            {analytics.currentLocation.longitude.toFixed(4)}
          </p>
        </div>
      </section>

      {/* Halt Analysis */}
      {analytics.haltAnalysis.isHalted && analytics.haltAnalysis.reason && (
        <section className="halt-analysis-section">
          <h2>Why is the train halted?</h2>
          <div className="halt-reason-card">
            <div className="reason-header">
              <h3>{analytics.haltAnalysis.reason.primaryReason}</h3>
              <span className="confidence-badge">
                Confidence: {analytics.haltAnalysis.reason.confidence}%
              </span>
            </div>

            <p className="explanation">{analytics.haltAnalysis.reason.explanation}</p>

            <div className="factors">
              <h4>Factors:</h4>
              <ul>
                {analytics.haltAnalysis.reason.factors.map((factor, idx) => (
                  <li key={idx}>
                    <span className="factor-name">{factor.factor}</span>
                    <span className="factor-weight">({Math.round(factor.weight * 100)}%)</span>
                    <p className="factor-evidence">{factor.evidence}</p>
                  </li>
                ))}
              </ul>
            </div>

            {analytics.haltAnalysis.reason.secondaryReasons.length > 0 && (
              <div className="secondary-reasons">
                <h4>Secondary Reasons:</h4>
                <ul>
                  {analytics.haltAnalysis.reason.secondaryReasons.map((r, idx) => (
                    <li key={idx}>{r}</li>
                  ))}
                </ul>
              </div>
            )}

            {analytics.haltAnalysis.reason.estimatedResolution && (
              <div className="estimated-resolution">
                <p>
                  <strong>Estimated Resolution:</strong>{' '}
                  {analytics.haltAnalysis.reason.estimatedResolution}
                </p>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Wait Time Prediction */}
      <section className="wait-time-section">
        <h2>Expected Wait Time</h2>
        <div className="wait-time-card">
          <div className="time-display">
            <span className="time-value">{analytics.waitTimePrediction.breakdown.totalWaitTime}</span>
            <span className="time-unit">minutes</span>
          </div>

          <div className="confidence-meter">
            <div className="meter-bar">
              <div
                className="meter-fill"
                style={{ width: `${analytics.waitTimePrediction.breakdown.confidence}%` }}
              />
            </div>
            <p className="confidence-text">
              {analytics.waitTimePrediction.breakdown.confidence}% confident
            </p>
          </div>

          {/* Time Range */}
          <div className="wait-range">
            <p>
              Range: <strong>{analytics.waitTimePrediction.range.range}</strong>
            </p>
          </div>

          {/* Formula Breakdown */}
          <div className="time-breakdown">
            <h4>Time Breakdown:</h4>
            <p className="formula">{analytics.waitTimePrediction.breakdown.formula}</p>

            <table className="breakdown-table">
              <tbody>
                <tr>
                  <td>Scheduled Stop Duration:</td>
                  <td className="value">+{analytics.waitTimePrediction.breakdown.baseStopDuration} min</td>
                </tr>
                {analytics.waitTimePrediction.breakdown.trafficDelay > 0 && (
                  <tr>
                    <td>Traffic Delay:</td>
                    <td className="value">+{analytics.waitTimePrediction.breakdown.trafficDelay} min</td>
                  </tr>
                )}
                {analytics.waitTimePrediction.breakdown.weatherDelay > 0 && (
                  <tr>
                    <td>Weather Impact:</td>
                    <td className="value">+{analytics.waitTimePrediction.breakdown.weatherDelay} min</td>
                  </tr>
                )}
                {analytics.waitTimePrediction.breakdown.delayCarryover > 0 && (
                  <tr>
                    <td>Prior Delay:</td>
                    <td className="value">+{analytics.waitTimePrediction.breakdown.delayCarryover} min</td>
                  </tr>
                )}
                {analytics.waitTimePrediction.breakdown.operationalDelay > 0 && (
                  <tr>
                    <td>Platform Operations:</td>
                    <td className="value">+{analytics.waitTimePrediction.breakdown.operationalDelay} min</td>
                  </tr>
                )}
                <tr className="total-row">
                  <td><strong>Total Expected Wait:</strong></td>
                  <td className="value total">
                    <strong>{analytics.waitTimePrediction.breakdown.totalWaitTime} min</strong>
                  </td>
                </tr>
              </tbody>
            </table>

            {analytics.waitTimePrediction.isUnusual && (
              <div className="unusual-alert">
                ⚠️ Unusually long wait. Check section for issues.
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Section Intelligence */}
      <section className="section-intelligence">
        <h2>Railway Section Status</h2>
        <div className="section-card">
          <h3>{analytics.sectionAnalytics.currentSection}</h3>
          <div className="congestion-display">
            <label>Network Congestion:</label>
            <div className="congestion-bar">
              <div
                className={`congestion-fill ${getCongestionClass(analytics.sectionAnalytics.congestionLevel)}`}
                style={{ width: `${analytics.sectionAnalytics.congestionLevel}%` }}
              />
            </div>
            <p>{analytics.sectionAnalytics.congestionLevel}%</p>
          </div>

          {/* Network Heatmap */}
          <div className="network-heatmap">
            <h4>All Sections:</h4>
            <div className="heatmap-grid">
              {Object.entries(analytics.sectionAnalytics.networkHeatmap).map(([code, level]) => (
                <div key={code} className={`heatmap-cell ${getHeatmapColor(level as number)}`}>
                  <span className="code">{code}</span>
                  <span className="level">{level}%</span>
                </div>
              ))}
            </div>
          </div>

          <p className="section-delay">
            Expected delay in this section: <strong>+{analytics.sectionAnalytics.expectedSectionDelay} min</strong>
          </p>
        </div>
      </section>

      {/* Nearby Trains */}
      {analytics.nearbyTrains.count > 0 && (
        <section className="nearby-trains-section">
          <h2>Nearby Trains</h2>
          <p>{analytics.nearbyTrains.summary}</p>
          {/* Link to nearby trains details if available */}
        </section>
      )}

      {/* Next Major Stop */}
      {analytics.nextMajorStop && (
        <section className="next-stop-section">
          <h2>Next Major Stop</h2>
          <div className="stop-card">
            <p className="station-name">{analytics.nextMajorStop.stationName}</p>
            <div className="stop-details">
              <div className="detail">
                <label>Distance:</label>
                <span>{analytics.nextMajorStop.distance} km</span>
              </div>
              <div className="detail">
                <label>Estimated Arrival:</label>
                <span>{analytics.nextMajorStop.estimatedArrival}</span>
              </div>
              <div className="detail">
                <label>Expected Delay:</label>
                <span>{analytics.nextMajorStop.expectedDelay} min</span>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Overall Recommendation */}
      <section className="recommendation-section">
        <h2>Recommendation</h2>
        <div className="recommendation-card">
          <p>{analytics.recommendation Action}</p>
        </div>
      </section>

      {/* Integrated Explanation */}
      <section className="explanation-section">
        <h2>Full Analysis</h2>
        <div className="explanation-text">
          <p>{analytics.explanation}</p>
        </div>
        <p className="last-updated">
          Last updated: {new Date(analytics.lastUpdated).toLocaleTimeString()}
        </p>
      </section>
    </div>
  );
}

// Helper functions for UI
function getCongestionClass(level: number): string {
  if (level > 70) return 'high';
  if (level > 40) return 'medium';
  return 'low';
}

function getHeatmapColor(level: number): string {
  if (level > 70) return 'red';
  if (level > 40) return 'orange';
  return 'green';
}
```

### Wait Time Card Component

```typescript
// components/WaitTimeCard.tsx

interface WaitTimeCardProps {
  breakdown: WaitTimeBreakdown;
  range: { min: number; max: number; mostLikely: number };
  isUnusual: boolean;
}

export function WaitTimeCard({ breakdown, range, isUnusual }: WaitTimeCardProps) {
  return (
    <div className={`wait-time-card ${isUnusual ? 'unusual' : ''}`}>
      <div className="main-time">
        <div className="number">{breakdown.totalWaitTime}</div>
        <div className="unit">min</div>
      </div>

      <div className="details">
        <div className="confidence">
          <label>Confidence</label>
          <div className="bar" />
          <span>{breakdown.confidence}%</span>
        </div>

        <div className="range">
          <label>Likely Range</label>
          <span>{Math.round(range.min)}–{Math.round(range.max)} min</span>
        </div>

        <div className="formula">
          <label>Calculation</label>
          <code>{breakdown.formula}</code>
        </div>
      </div>

      {isUnusual && (
        <div className="alert">⚠️ Unusually long - monitoring conditions</div>
      )}
    </div>
  );
}
```

### Section Heatmap Component

```typescript
// components/SectionHeatmap.tsx

interface SectionHeatmapProps {
  heatmap: Record<string, number>;
}

export function SectionHeatmap({ heatmap }: SectionHeatmapProps) {
  return (
    <div className="section-heatmap">
      <h3>Network Congestion Map</h3>
      <div className="grid">
        {Object.entries(heatmap).map(([section, congestion]) => (
          <div
            key={section}
            className={`section-tile ${getSectionColor(congestion)}`}
          >
            <div className="section-code">{section}</div>
            <div className="section-level">{congestion}%</div>
          </div>
        ))}
      </div>
      <div className="legend">
        <span className="low">0-40% (Good)</span>
        <span className="medium">40-70% (Moderate)</span>
        <span className="high">70-100% (Congested)</span>
      </div>
    </div>
  );
}

function getSectionColor(level: number): string {
  if (level > 70) return 'high';
  if (level > 40) return 'medium';
  return 'low';
}
```

---

## 🎨 CSS Styling Guide

### Wait Time Display

```css
.wait-time-card {
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  padding: 20px;
  background: white;

  &.unusual {
    border-color: #ff9800;
    background: #fff8e1;
  }
}

.wait-time-card .main-time {
  font-size: 3em;
  font-weight: bold;
  text-align: center;
  color: #1976d2;
}

.wait-time-card .formula {
  font-family: 'Courier New', monospace;
  background: #f5f5f5;
  padding: 10px;
  border-radius: 4px;
  font-size: 0.9em;
}
```

### Halt Analysis Card

```css
.halt-reason-card {
  border-left: 4px solid #d32f2f;
  padding: 16px;
  background: #fff3e0;
  border-radius: 4px;
}

.halt-reason-card .reason-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.halt-reason-card .confidence-badge {
  background: #d32f2f;
  color: white;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 0.85em;
}

.halt-reason-card .factors {
  margin-top: 16px;
}

.halt-reason-card .factors li {
  display: flex;
  flex-direction: column;
  margin-bottom: 12px;
  padding: 8px;
  background: white;
  border-radius: 4px;
}

.factor-evidence {
  font-size: 0.9em;
  color: #666;
  margin-top: 4px;
}
```

### Section Heatmap

```css
.section-heatmap .grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(60px, 1fr));
  gap: 12px;
  margin: 16px 0;
}

.section-tile {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 16px;
  border-radius: 8px;
  font-weight: bold;
  color: white;
  cursor: pointer;

  &.low {
    background: #4caf50;
  }

  &.medium {
    background: #ff9800;
  }

  &.high {
    background: #d32f2f;
  }
}

.section-tile .section-code {
  font-size: 0.8em;
  opacity: 0.9;
}

.section-tile .section-level {
  font-size: 1.2em;
  margin-top: 4px;
}
```

---

## 🔄 Real-Time Updates

### Using React Hook for Auto-Refresh

```typescript
// hooks/useTrainAnalytics.ts

import { useEffect, useState } from 'react';
import { TrainAnalytics } from '@/types/analytics';

export function useTrainAnalytics(trainNumber: string, refreshInterval = 30000) {
  const [analytics, setAnalytics] = useState<TrainAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const res = await fetch(`/api/train-analytics?trainNumber=${trainNumber}`);
        if (!res.ok) throw new Error('Failed to fetch analytics');
        const data = await res.json();
        setAnalytics(data.data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
        setAnalytics(null);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
    const interval = setInterval(fetchAnalytics, refreshInterval);
    return () => clearInterval(interval);
  }, [trainNumber, refreshInterval]);

  return { analytics, loading, error };
}

// Usage in component
function MyComponent() {
  const { analytics, loading, error } = useTrainAnalytics('12955');

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!analytics) return <div>No data</div>;

  return (
    <div>
      <h1>{analytics.trainName}</h1>
      <p>Current wait: {analytics.waitTimePrediction.breakdown.totalWaitTime} min</p>
    </div>
  );
}
```

---

## 📱 Mobile Responsive Design

```css
@media (max-width: 768px) {
  .train-detail-page section {
    margin: 16px 0;
  }

  .section-heatmap .grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .wait-time-card .main-time {
    font-size: 2em;
  }

  .breakdown-table {
    font-size: 0.9em;
  }
}
```

---

## 🧪 Testing the Integration

```bash
# Test analytics endpoint
curl "http://localhost:3001/api/train-analytics?trainNumber=12955" | jq

# Full UI test with real data
npm run dev
# Navigate to: http://localhost:3001/trains/12955
```

---

## 📊 Type Definitions

```typescript
// types/analytics.ts (auto-generated from API response)

export interface TrainAnalytics {
  trainNumber: string;
  trainName: string;
  currentLocation: {
    stationCode: string;
    stationName: string;
    latitude: number;
    longitude: number;
  };
  movementState: 'running' | 'halted' | 'stopped' | 'stalled';
  speed: number;
  delay: number;

  haltAnalysis: {
    isHalted: boolean;
    reason: HaltReason | null;
  };

  sectionAnalytics: {
    currentSection: string;
    congestionLevel: number;
    expectedSectionDelay: number;
    networkHeatmap: Record<string, number>;
  };

  waitTimePrediction: {
    breakdown: WaitTimeBreakdown;
    range: { min: number; max: number; mostLikely: number };
    isUnusual: boolean;
  };

  nearbyTrains: {
    count: number;
    withinKm: number;
    summary: string;
  };

  explanation: string;
  recommendedAction: string;
  nextMajorStop?: {
    stationName: string;
    distance: number;
    estimatedArrival: string;
    expectedDelay: number;
  };

  lastUpdated: string;
  confidence: number;
}

export interface HaltReason {
  primaryReason: string;
  secondaryReasons: string[];
  confidence: number;
  factors: Array<{
    factor: string;
    weight: number;
    evidence: string;
  }>;
  explanation: string;
  requiredAction?: string;
  estimatedResolution?: string;
}

export interface WaitTimeBreakdown {
  totalWaitTime: number;
  baseStopDuration: number;
  trafficDelay: number;
  weatherDelay: number;
  delayCarryover: number;
  operationalDelay: number;
  confidence: number;
  formula: string;
  explanation: string;
}
```

---

## ✅ Integration Checklist

- [ ] Fetch analytics from `/api/train-analytics` endpoint
- [ ] Display halt reason with confidence score
- [ ] Show wait time breakdown with formula
- [ ] Render section heatmap
- [ ] Implement auto-refresh every 30 seconds
- [ ] Handle error states (loading, not found, error)
- [ ] Style for mobile responsiveness
- [ ] Add accessibility attributes (aria-labels)
- [ ] Test with all 4 real trains (12955, 13345, 14645, 15906)
- [ ] Add analytics to train detail page
- [ ] Add wait time card to journey planner

---

## 🚀 Next Steps

1. **Implement train detail page** with full analytics display
2. **Add wait time card** to homepage/search results
3. **Create section heatmap** view for network monitoring
4. **Implement nearby trains panel** with traffic visualization
5. **Add real-time updates** with WebSocket (future)

---

 **Ready for implementation!** 🎉
