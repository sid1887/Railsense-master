# Phase 3: Intelligence Page Integration Guide
**Date:** March 17, 2026
**Status:** Backend APIs Complete → Frontend Integration In Progress

---

## ✅ What's Complete (Phase 1 & 2)

### Unified Data Context
- **TrainContext**: Single source of truth for all pages
- **Provider**: Wraps entire app in `/app/layout.tsx`
- **Hooks**: `useTrain()` hook for easy access

### Real-time APIs
All endpoints accept `?trainNumber=` parameter and return live data:

1. **GET `/api/system/data-quality`**
   - Returns: Quality metrics, source health, confidence scores
   - Use for: Data Quality Dashboard, transparency pages

2. **GET `/api/system/intelligence`**
   - Returns: Unified train state, module availability, confidence
   - Use for: Intelligence Hub, module overview

3. **GET `/api/system/halt-analysis`**
   - Returns: Halt detection, probable causes, recovery analysis
   - Use for: Halt Analysis page, real-time detection

4. **GET `/api/system/cascade-analysis`**
   - Returns: Delay propagation, affected trains, recovery potential
   - Use for: Cascade Analysis page, network impact

5. **GET `/api/system/network-intelligence`**
   - Returns: Route position, nearby trains, congestion analysis
   - Use for: Network Intelligence page

6. **GET `/api/system/passenger-safety`**
   - Returns: Safety metrics, welfare status, delay impact
   - Use for: Passenger Safety page, alert generation

7. **GET `/api/system/explainability`**
   - Returns: Prediction reasoning, data sources, model behavior
   - Use for: Explainability page, transparency

---

## 📋 Page Integration Template

### For any test page (e.g., `test-halt-analysis`, `test-network-intelligence`):

```typescript
'use client';

import React, { useState, useEffect } from 'react';
import { useTrain } from '@/contexts/TrainContext';

export default function TestPage() {
  const trainCtx = useTrain();
  const [apiData, setApiData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!trainCtx?.train?.trainNumber) {
      setLoading(false);
      return;
    }

    fetchIntelligence();
  }, [trainCtx?.train?.trainNumber]);

  const fetchIntelligence = async () => {
    try {
      setLoading(true);
      const res = await fetch(
        `/api/system/halt-analysis?trainNumber=${trainCtx.train.trainNumber}`
      );

      if (!res.ok) throw new Error(`API Error: ${res.status}`);

      const data = await res.json();
      setApiData(data);
      setError(null);
    } catch (err) {
      setError(err.message);
      setApiData(null);
    } finally {
      setLoading(false);
    }
  };

  // Show loading state
  if (loading) return <div>Loading...</div>;

  // Show error if API fails
  if (error) return <div className="text-red-500">Error: {error}</div>;

  // Show no-data message
  if (!trainCtx?.train) {
    return <div>Please select a train first</div>;
  }

  // Render with real data
  return (
    <div>
      <h1>Halt Analysis for {apiData?.train?.name}</h1>
      <div>Detected: {apiData?.currentStatus?.isHalted ? 'Halted' : 'Moving'}</div>
      {/* ... rest of UI ... */}
    </div>
  );
}
```

---

## 🎯 Pages to Update (In Priority Order)

### Priority 1: Core Intelligence Pages
These are directly accessed from the main nav:
- [ ] `/test-halt-analysis` → Fetch from `/api/system/halt-analysis`
- [ ] `/test-network-intelligence` → Fetch from `/api/system/network-intelligence`
- [ ] `/test-cascade-analysis` → Fetch from `/api/system/cascade-analysis`
- [ ] `/test-passenger-safety` → Fetch from `/api/system/passenger-safety`
- [ ] `/test-explainability` → Fetch from `/api/system/explainability`

### Priority 2: Dashboard Pages
- [ ] `/data-quality` → Already partially updated, consume `/api/system/data-quality`
- [ ] `/intelligence` → Main dashboard, use `/api/system/intelligence`

### Priority 3: Feature Pages
- [ ] `/test-alerts` → Use multiple APIs for alert generation
- [ ] `/test-load-testing` → Use `/api/system/network-intelligence` for load metrics
- [ ] `/test-ml-predictions` → Enhance with explainability data
- [ ] `/test-ml-training` → Add data quality metrics

---

## 🔄 Pattern for Each Page

All pages should follow this pattern:

```
1. Use TrainContext hook to get selected train
2. On train change, fetch from corresponding API
3. Display loading state while fetching
4. Show error message if API fails
5. Render real data once loaded
6. Auto-refresh on interval or user request
```

---

## ⚙️ Key Field Mappings

When updating pages, map these real fields:

| Field | Source | Type | Example |
|-------|--------|------|---------|
| `trainNumber` | API response | string | "01211" |
| `trainName` | API response | string | "Hyderabad Express" |
| `isHalted` | halt-analysis | boolean | true/false |
| `currentStation` | intelligence | string | "Hyderabad Jn" |
| `delayMinutes` | intelligence | number | 15 |
| `confidence` | intelligence.confidence | 0-1 | 0.85 |
| `quality` | data-quality | 0-100 | 82 |
| `timestamp` | API response | ISO string | "2024-03-17T..." |

---

## 🧪 Testing Each API

### Via PowerShell:
```powershell
# Test Halt Analysis
$uri = "http://localhost:3000/api/system/halt-analysis?trainNumber=01211"
$response = Invoke-WebRequest -Uri $uri -UseBasicParsing
$response.Content | ConvertFrom-Json
```

### Via Browser Console:
```javascript
fetch('/api/system/halt-analysis?trainNumber=01211')
  .then(r => r.json())
  .then(d => console.log(d))
```

---

## 📝 Migration Checklist

For each page:
- [ ] Replace mock data state with API fetch
- [ ] Add loading spinner
- [ ] Add error boundary
- [ ] Remove hardcoded train numbers
- [ ] Test with multiple train numbers
- [ ] Verify all fields map correctly
- [ ] Check API response time (target: <500ms)
- [ ] Add retry logic for failures

---

## 🚀 Next Steps (After Frontend Integration)

Once all pages are consuming real APIs:

1. **Data Validation** - Add schema validation
2. **Caching Strategy** - Implement intelligent caching
3. **Real-time Updates** - Add WebSocket support
4. **Performance** - Optimize query patterns
5. **Monitoring** - Add observability
6. **Error Recovery** - Implement fallbacks

---

## 🔗 Reference URLs

- Local dev: `http://localhost:3000`
- Train context: `@/contexts/TrainContext`
- Search orchestrator: `@/services/trainSearchOrchestrator`
- Example page: `/app/intelligence-hub/page.tsx`

---

**Status:** Ready for page integration.
**Est. Time:** 2-3 hours to update all pages.
**Risk:** Low - APIs are stable and well-tested.
