# STAGE 14: RailSense Test Plan & Validation Checklist

## Quick Start (5 minutes)

```bash
# Terminal 1: Start dev server
npm run dev

# Terminal 2: Wait for "Ready in X s", then run manual tests
# Visit http://localhost:3000

# Terminal 3 (Optional): Run snapshot worker
node -r ts-node/register scripts/snapshotWorker.ts
```

## Pre-Flight Checks

### 1. Build Validation
```bash
# Verify production build succeeds
npm run build

# Expected output:
# ✓ Compiled successfully
# Linting and checking validity of types ...
# (if this completes without errors, build is good)
```

**Expected Result:** Build completes in ~60 seconds without errors.

---

## Manual Test Checklist

### Test Group A: Frontend & Routing (5 minutes)

- [ ] **Home Page Load**
  - URL: http://localhost:3000
  - Expected: Home page loads with search bar
  - Check: No console errors, page renders in <3s

- [ ] **Train Search**
  - Search for train number: `12702`
  - Expected: Search results show list of matching trains
  - Check: Results display quickly, train info visible

- [ ] **Train Detail Page Navigation**
  - Click on train result or navigate to: http://localhost:3000/train/12702
  - Expected: Detail page loads with live map
  - Check: Map renders, all 8 components visible (map, cards, timeline, heatmap)

- [ ] **No Console Errors**
  - Open DevTools (F12)
  - Check Console tab
  - Expected: No red errors (warnings okay)
  - Common warnings to ignore: "useLayoutEffect", "HMR", source map warnings

### Test Group B: Real-Time Data Flow (10 minutes)

- [ ] **API Endpoint Working**
  - URL: http://localhost:3000/api/train-details?trainNumber=12702
  - Expected: Returns JSON with trainData, haltResult, trafficResult, etc.
  - Check: Status 200, Content-Type: application/json

  ```bash
  curl http://localhost:3000/api/train-details?trainNumber=12702
  ```

- [ ] **Live Data Updates**
  - Keep detail page open for 30 seconds
  - Check browser Network tab (api/train-details calls)
  - Expected: API called every 5 seconds (polling)
  - Check: Response times < 1 second, data changing slightly (speed, delay)

- [ ] **Halt Detection**
  - Look at HaltStatusCard component on detail page
  - Expected: Shows "Halted" or "Moving" status
  - Check: Status badge color changes correspond to logic (green=normal, orange=halt)

- [ ] **Traffic Analysis**
  - Check TrafficIndicator component
  - Expected: Shows congestion level (LOW, MEDIUM, HIGH) with nearby trains count
  - Check: Nearby trains list displays with distance

- [ ] **Prediction Engine**
  - Check PredictionCard component
  - Expected: Shows estimated waiting time with confidence
  - Check: Wait time is reasonable (typically 0-30 minutes for demo)

- [ ] **Uncertainty Gauge**
  - Check UncertaintyGauge component (circular gauge)
  - Expected: Animated ring showing uncertainty index (0-100%)
  - Check: Ring fills smoothly, percentage readable

### Test Group C: Map & Visualization (10 minutes)

- [ ] **Live Train Map**
  - Observe map on detail page
  - Expected: Map shows train marker, zoomed to train location
  - Check: Zoom level appropriate (not too far, not too close)

- [ ] **Route Timeline**
  - Check RouteTimeline component below map
  - Expected: Shows station-by-station progress with completion dots
  - Check: Current station highlighted, next stations visible

  - [ ] **Congestion Heatmap**
  - Check CongestionHeatmap component
  - Expected: Shows heat visualization of congestion zones
  - Check: Colors range from blue (low) to red (high)

- [ ] **Map Interactions**
  - Try dragging/zooming map
  - Expected: Map responds smoothly
  - Check: No freezing or lag

- [ ] **Responsive Design**
  - Resize browser window or open on mobile
  - Expected: All components stack vertically on small screens
  - Check: No text overflow, all buttons accessible

### Test Group D: Component Animations (5 minutes)

- [ ] **Card Entrance Animations**
  - Navigate to train detail page (fresh load)
  - Expected: Cards slide in and fade in smoothly
  - Check: Animation duration ~0.5 seconds, smooth easing

- [ ] **Gauge Animation**
  - UncertaintyGauge should animate from 0 to final value
  - Expected: Ring fills smoothly over ~1 second
  - Check: Animation uses cubic-bezier or similar

- [ ] **Framer Motion Responsiveness**
  - Change train query and navigate between trains
  - Expected: No layout shift, smooth transitions
  - Check: No janky animations

### Test Group E: Error Handling & Fallbacks (5 minutes)

- [ ] **Invalid Train Number**
  - Search for: `99999` (non-existent train)
  - Expected: Shows "Train not found" message
  - Check: Graceful error message, no crash

- [ ] **Offline Mode (Simulate Network Failure)**
  - Open DevTools → Network → Offline
  - Try to load detail page
  - Expected: Falls back to mock data or shows cached data
  - Check: App doesn't crash, shows informative message

- [ ] **Slow Network**
  - DevTools → Network → Throttle to "Slow 3G"
  - Navigate to detail page
  - Expected: Page loads with skeleton/placeholder content
  - Check: Data loads progressively, no timeout errors

### Test Group F: News Service (5 minutes)

- [ ] **News API Endpoint**
  - URL: http://localhost:3000/api/news?query=Indian+railway
  - Expected: Returns JSON with articles array
  - Check: Status 200, articles list populated

  ```bash
  curl "http://localhost:3000/api/news?query=Indian+railway"
  ```

- [ ] **News Caching**
  - Call news API twice rapidly
  - Expected: Second call returns faster (cached)
  - Check: Console shows "News cache hit" message

---

## API Integration Tests

### Test /api/train-details

```bash
# Get complete train analysis
curl -s "http://localhost:3000/api/train-details?trainNumber=12702" | jq '.' | head -50

# Expected response structure:
{
  "trainData": { trainNumber, currentLocation, speed, delay, ... },
  "haltResult": { halted, haltDuration, reason, ... },
  "trafficResult": { congestionLevel, nearbyTrainsCount, ... },
  "predictions": { minWait, maxWait, confidence, ... },
  "insight": { text, sentiment, recommendations, ... },
  "analysis": { method, dataSource, timestamp, ... }
}
```

### Test /api/insights

```bash
curl "http://localhost:3000/api/insights?trainNumber=12702"
# Expected: Condensed insight response (faster)
```

### Test /api/nearby-trains

```bash
curl "http://localhost:3000/api/nearby-trains?lat=17.38&lon=78.52&radius=5"
# Expected: Array of nearby trains with distances
```

---

## Performance Benchmarks

### Load Time Targets

| Page/Component | Target | Method |
|---|---|---|
| Home page | < 2s | DevTools Lighthouse |
| Train detail | < 3s | First Contentful Paint |
| Map render | < 500ms | Network tab |
| API response | < 1s | Network tab, excluding cache |
| Animations | 60fps | DevTools Performance tab |

### Test Performance

```bash
# Run Lighthouse audit
# DevTools → Lighthouse → Analyze page

# For train detail page:
# http://localhost:3000/train/12702
# Target: Desktop Score > 70
```

---

## Database & Logging Tests

### Check Logs

```bash
# View latest logs (only if snapshotWorker running)
tail -50 logs/app.log

# Expected: Lines with timestamps like:
# [2026-03-09T...] [INFO] Fetching train data...
# [2026-03-09T...] [SUCCESS] Got live data for train 12702
```

### Check Log File Size

```bash
# Verify logs directory exists and has entries
ls -lh logs/

# File size should be small (< 1MB) unless worker has been running long
```

---

## End-to-End Scenario Tests

### Scenario 1: Normal Train Journey

**Setup:** Train 12702 moving normally

1. Open http://localhost:3000/train/12702
2. Observe: Speed > 0, no halt, low traffic
3. Verify: Green status, all components show normal state
4. Expected: UI stable, no errors for 2+ minutes

**Outcome:** ✅ PASS (stable normal operation)

---

### Scenario 2: Unexpected Halt Detection

**Setup:** Train location history tracked via location history

1. Open train detail page
2. Watch HaltStatusCard for "Halted" status
3. Check haltDuration increases
4. Expected: Halt reason identified (signal delays, maintenance, etc.)

**Outcome:** ✅ Test passes if halt detected within 2 cycles

---

### Scenario 3: Traffic Congestion

**Setup:** Look for trains in high-congestion areas

1. Try train 17015 in congested corridor
2. Check TrafficIndicator
3. Expected: Shows "MEDIUM" or "HIGH" congestion
4. Nearby trains list shows 2-5 trains

**Outcome:** ✅ PASS if nearby trains detected

---

### Scenario 4: Notification Trigger

**Setup:** Enable browser notifications (if available)

1. Click "Notify Me" button
2. Grant notification permission
3. Keep tab open
4. Expected: Browser notification when train state changes

**Outcome:** ✅ PASS if notification fires (or graceful fallback)

---

## Regression Tests (Before Each Commit)

Run these quick checks before pushing code:

```bash
# 1. Type check
npm run type-check

# 2. Build
npm run build

# 3. Dev server health check
npm run dev &
sleep 5
curl -s http://localhost:3000 | head -20
curl -s http://localhost:3000/api/train-details?trainNumber=12702 | jq '.trainData.trainNumber'
```

---

## Troubleshooting Test Failures

### Map not rendering
- **Check:** Browser console for Leaflet errors
- **Fix:** Clear cache (Ctrl+Shift+Del), reload page

### API returns 404
- **Check:** Train number is valid (try 12702 or 17015)
- **Check:** API route exists: `app/api/train-details/route.ts`
- **Fix:** Restart dev server (`npm run dev`)

### Animations janky
- **Check:** DevTools Performance → frame rate
- **Check:** No console errors
- **Fix:** Ensure no heavy computations in render

### Logs not appearing
- **Check:** `TRACKED_TRAINS` env var set
- **Check:** `scripts/snapshotWorker.ts` running
- **Fix:** Create `logs/` directory manually if missing

---

## Sign-Off Checklist

Before demo/presentation, verify:

- [ ] All Type checks pass: `npm run type-check` returns 0 errors
- [ ] Build succeeds: `npm run build` completes without errors
- [ ] Dev server stable: Runs for 5+ minutes without crashing
- [ ] Home page loads: No console errors
- [ ] Train search works: Can find multiple trains
- [ ] Detail page functional: All components render
- [ ] Maps display: Leaflet renders without "_leaflet_pos" errors
- [ ] Data updates: Polling refreshes data every 5 seconds
- [ ] News service: /api/news returns valid articles (or empty gracefully)
- [ ] Logs exist: logs/app.log has entries with timestamps

---

## Demo Script (10 minutes for judges)

```
1. Open http://localhost:3000 (Home page)
   "This is RailSense, an intelligent train halt insight system"

2. Search for train: "12702"
   "We track live positions of Indian trains via public APIs"

3. Click result → Navigate to detail page
   "Here's the real-time dashboard showing:"

4. Point out:
   - "Live map with train location"
   - "Traffic analysis - detecting nearby trains"
   - "Halt detection - identifying unexpected stops"
   - "Uncertainty gauge - passenger trust score"
   - "Predictions - estimated waiting time"

5. Scroll down:
   - "Route timeline shows progress through stations"
   - "Heatmap visualizes congestion zones"

6. Explain architecture:
   - "Real data from RailYatri public endpoints"
   - "Multi-source fallback (scraper, mock, news)"
   - "Live polling every 5 seconds"
   - "Smart caching for performance"

7. (Optional) Show logs:
   ```bash
   tail -20 logs/app.log
   ```
   "Logging every significant event for debugging"

[Total: ~10 min, covers all major features]
```

---

## Notes for Future Iterations

- Add unit tests with Jest
- Add E2E tests with Playwright
- Add visual regression tests
- Monitor performance in production with Sentry
- Add A/B testing for UI variants
- Collect user feedback on prediction accuracy
