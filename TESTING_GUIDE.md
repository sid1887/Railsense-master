# Testing Guide - Phase 2 Services

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Start Development Server
```bash
npm run dev
```

Server runs on: `http://localhost:3000`

---

## 🧪 Testing Endpoints

### Test 1: Get Complete Train Insight
```bash
curl "http://localhost:3000/api/train-details?trainNumber=12702"
```

**Expected Response:**
```json
{
  "trainData": {
    "trainNumber": "12702",
    "trainName": "Kazipet-Warangal Express",
    "currentLocation": {
      "latitude": 17.3850,
      "longitude": 78.5230,
      "timestamp": 1699564800000
    },
    "speed": 0,
    "delay": 18
  },
  "haltDetection": {
    "halted": true,
    "haltDuration": 18,
    "reason": "Traffic regulation or line congestion detected"
  },
  "trafficAnalysis": {
    "congestionLevel": "MEDIUM",
    "nearbyTrainsCount": 2,
    "nearbyTrains": [...]
  },
  "prediction": {
    "minWait": 15.6,
    "maxWait": 23.4,
    "confidence": 75
  },
  "uncertainty": {
    "level": "MEDIUM",
    "score": 48,
    "factors": {
      "haltDuration": 90,
      "trafficDensity": 55,
      "weatherRisk": 20
    }
  },
  "insight": {
    "headline": "⏱️ Train halted for 18 minutes",
    "details": "Train has been stationary for 18 minutes between..."
  }
}
```

**What This Shows:**
- ✅ Train is halted (speed = 0)
- ✅ Duration: 18 minutes
- ✅ Traffic detected: 2 nearby trains (medium congestion)
- ✅ Uncertainty: MEDIUM (score 48/100)
- ✅ Expected wait: 15-23 minutes
- ✅ Confidence: 75%

---

### Test 2: Get Quick Insight (No Traffic Analysis)
```bash
curl "http://localhost:3000/api/insights?trainNumber=17015"
```

**Expected Response:**
```json
{
  "trainData": {
    "trainNumber": "17015",
    "speed": 45,
    "delay": 5
  },
  "prediction": {
    "minWait": 6.5,
    "maxWait": 9.75,
    "confidence": 85
  },
  "uncertainty": {
    "level": "LOW",
    "score": 22
  }
}
```

**Speed Advantage:**
- No traffic analysis = faster response
- Perfect for mobile apps and quick checks
- ~50-100ms response time

---

### Test 3: Search Train Data
```bash
curl "http://localhost:3000/api/train?trainNumber=12702"
```

**Expected Response:**
```json
{
  "trainNumber": "12702",
  "trainName": "Kazipet-Warangal Express",
  "source": "Kazipet Junction",
  "destination": "Warangal Station",
  "currentLocation": {...},
  "speed": 0,
  "delay": 18
}
```

---

### Test 4: Find Trains Nearby
```bash
curl "http://localhost:3000/api/nearby-trains?latitude=17.38&longitude=78.52&radius=5"
```

**Expected Response:**
```json
{
  "center": {
    "latitude": 17.38,
    "longitude": 78.52
  },
  "radius": 5,
  "trainsFound": 2,
  "trains": [
    {
      "trainNumber": "12702",
      "distance": 0.23,
      "trainName": "Kazipet-Warangal Express",
      "currentLocation": {...}
    },
    {
      "trainNumber": "17015",
      "distance": 2.45,
      "trainName": "Hyderabad-Vijayawada Passenger",
      "currentLocation": {...}
    }
  ]
}
```

**Shows:**
- 2 trains within 5km radius
- Sorted by distance (closest first)
- Full train details for each

---

## 🎨 Testing in Frontend

### Test the Train Detail Page

1. **Navigate to home:**
   ```
   http://localhost:3000/
   ```

2. **Click on suggested train:** `12702`
   - Should navigate to: `http://localhost:3000/train/12702`
   - Should display all insight data
   - Should update every 5 seconds

3. **Observe the dashboard:**
   - ✅ Train name and route at top
   - ✅ Map placeholder (with coordinates)
   - ✅ Halt status card
   - ✅ Uncertainty gauge with score
   - ✅ Traffic indicator
   - ✅ Wait time prediction
   - ✅ Passenger insight message

---

## 🔍 Service Testing (Unit Level)

### Test Halt Detection

Create a test file: `services/__tests__/haltDetection.test.ts`

```typescript
import { detectUnexpectedHalt } from '@/services/haltDetection';

// Test data
const haltedTrain = {
  speed: 0,
  currentLocation: { latitude: 17.38, longitude: 78.52 },
  scheduledStations: [
    { latitude: 17.36, longitude: 78.50, name: 'Station A' }, // 2km away
    { latitude: 17.40, longitude: 78.54, name: 'Station B' }
  ],
  currentStationIndex: 0,
  delay: 18
};

// Test
const result = detectUnexpectedHalt(haltedTrain);
console.assert(result.halted === true);
console.assert(result.haltDuration !== undefined);
console.log('✅ Halt detection test passed');
```

---

### Test Traffic Analysis

```typescript
import { analyzeTrafficAround } from '@/services/trafficAnalyzer';

const referenceLocation = { latitude: 17.38, longitude: 78.52 };
const train = { currentLocation: referenceLocation };
const allTrains = [
  { trainNumber: '17015', currentLocation: { latitude: 17.39, longitude: 78.53 } },
  { trainNumber: '11039', currentLocation: { latitude: 17.40, longitude: 78.54 } },
  { trainNumber: '12345', currentLocation: { latitude: 17.50, longitude: 78.60 } }
];

const traffic = await analyzeTrafficAround(train, allTrains);
console.assert(traffic.nearbyTrainsCount === 2); // 2 within 5km
console.assert(traffic.congestionLevel === 'MEDIUM');
console.log('✅ Traffic analysis test passed');
```

---

## 📊 Testing Different Scenarios

### Scenario 1: On-Time Moving Train
```bash
# Test train 17015 (moving, low delay)
curl "http://localhost:3000/api/train-details?trainNumber=17015"

# Expected Results:
# - halted: false
# - delay: 5 minutes
# - uncertainty.level: LOW
# - prediction: 8-10 minutes
```

### Scenario 2: Halted with High Traffic
```bash
# Test train 12702 (halted, traffic)
curl "http://localhost:3000/api/train-details?trainNumber=12702"

# Expected Results:
# - halted: true
# - congestionLevel: MEDIUM
# - uncertainty.level: MEDIUM
# - prediction: 15-23 minutes
```

### Scenario 3: Long-Distance Express (Clear)
```bash
# Test train 11039 (long-distance, clear)
curl "http://localhost:3000/api/train-details?trainNumber=11039"

# Expected Results:
# - speed: 62 km/h (moving)
# - nearby trains: LOW traffic
# - uncertainty.level: LOW
```

---

## 🐛 Debugging Tips

### Enable Console Logging

Services include `console.log()` for debugging:

```
[Orchestrator] Fetching data for train 12702...
[Orchestrator] Analyzing halt status...
[Orchestrator] Analyzing nearby traffic...
[Orchestrator] Predicting wait times...
[Orchestrator] Calculating uncertainty index...
[Orchestrator] Generating passenger insight...
[Orchestrator] Complete insight generated successfully
```

Monitor the dev server terminal to see these logs.

### Check Network Requests

1. **Open DevTools:** `F12` or `Ctrl+Shift+I`
2. **Go to Network tab**
3. **Search for:** `/api/train-details`
4. **Click request**
5. **View Response tab** to see full JSON

### Inspect Hook Data

In the train detail page, the `useTrainData` hook provides:
- `data` - Complete insight data
- `loading` - Fetch in progress
- `error` - Any errors encountered
- `refetch` - Manual refresh function

---

## ✅ Verification Checklist

- [ ] `npm install` completes without errors
- [ ] `npm run dev` starts server on localhost:3000
- [ ] Home page loads and shows search
- [ ] Can search for train 12702
- [ ] Train detail page loads
- [ ] Can see all insight cards populated
- [ ] Data updates every 5 seconds (check timestamps)
- [ ] `/api/train-details` returns complete JSON
- [ ] `/api/insights` returns quick response
- [ ] `/api/train` returns train data
- [ ] `/api/nearby-trains` returns trains within radius
- [ ] Error messages appear for invalid train numbers
- [ ] Loading spinner shows while fetching
- [ ] No console errors in DevTools

---

## 🎯 Next Steps

Once testing is complete:

1. **Phase 3:** Build visual components (LiveTrainMap, Gauges, etc.)
2. **Phase 4:** Add real API integration
3. **Phase 5:** Deploy to Vercel

Current status: **Services phase complete ✅**

Ready for component development!
