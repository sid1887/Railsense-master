# RailSense NTES Integration System
## Step-by-Step Data Collection for ML Model Training

### Overview
This system progressively fetches real-time train data from the NTES (National Train Enquiry System) website and populates the RailSense database for ML model training. Data collection is designed to be gradual and non-blocking - you can scale up collection as needed.

---

## 🚀 QUICK START

### Step 0: Verify Database Connectivity
Before collecting data, ensure your database systems are operational.

**Endpoint:** `GET /api/system/db-health`

**Example Request:**
```bash
curl http://localhost:3000/api/system/db-health
```

**Success Response:**
```json
{
  "timestamp": "2026-03-21T10:30:00Z",
  "overallStatus": "healthy",
  "responseTimeMs": 45,
  "redis": {
    "available": true,
    "connected": true,
    "responseTimeMs": 12,
    "info": {
      "version": "7.0.0",
      "connectedClients": "3",
      "usedMemory": "2.5M"
    }
  },
  "sqlite": {
    "available": true,
    "responseTimeMs": 8,
    "dbInfo": {
      "userCount": 5,
      "queryResponseTime": 8
    }
  },
  "cache": {
    "status": "operational",
    "fallbackMode": false,
    "description": "Redis cache operational"
  },
  "recommendations": [
    "[OK] All database systems operational. Ready for data integration."
  ]
}
```

**If Redis is unavailable:**
```json
{
  "overallStatus": "degraded",
  "cache": {
    "status": "degraded",
    "fallbackMode": true,
    "description": "Using in-memory cache (Redis unavailable)"
  },
  "recommendations": [
    "[WARNING] Redis is unavailable. System uses in-memory fallback (performance may be impacted)",
    "[INFO] Consider starting Redis: redis-server (Linux/Mac) or check Docker Redis"
  ]
}
```

---

## 📊 STEP 1: Collect Train Running Status (Immediate Data)

**What it collects:**
- Current train status (Running/Arrived/Departed/Yet to start)
- Last reported station with time
- Current delay in minutes
- Distance covered and remaining
- Next station information
- Scheduled vs actual arrival/departure times
- Platform information

**Database Impact:**
- Creates `train_status_snapshots` table
- Stores one snapshot per API call per train
- TTL: Cached for 5 minutes (live data refreshes frequently)

**Endpoint:** `POST /api/data-collection/ntes/train-status`

**Request:**
```bash
curl -X POST http://localhost:3000/api/data-collection/ntes/train-status \
  -H "Content-Type: application/json" \
  -d {
    "trainNumber": "12955",
    "startDate": "2026-03-21"  // Optional: format YYYY-MM-DD
  }
```

**Success Response (201):**
```json
{
  "success": true,
  "message": "Train status collected for 12955",
  "data": {
    "trainNumber": "12955",
    "currentStatus": "Running",
    "delayMinutes": 15,
    "collectedAt": "2026-03-21T10:35:00Z",
    "storageReady": true
  }
}
```

**Collect Multiple Trains:**
```bash
# Train 1
curl -X POST http://localhost:3000/api/data-collection/ntes/train-status \
  -d '{"trainNumber": "12955"}'

# Train 2
curl -X POST http://localhost:3000/api/data-collection/ntes/train-status \
  -d '{"trainNumber": "13345"}'

# Train 3
curl -X POST http://localhost:3000/api/data-collection/ntes/train-status \
  -d '{"trainNumber": "14645"}'
```

**Collection Strategy:**
- ✅ Easy: Single train per request
- 🔄 Recommended: Fetch every 5 minutes for live trains
- 📈 Scale: Set up automated job to collect for 100+ trains periodically

---

## 🗺️ STEP 2: Collect Full Train Routes (Route Information)

**What it collects:**
- All stations in complete train route
- Sequence index and distance from source
- Scheduled vs actual arrival/departure at each station
- Delay at each station
- Halt time (time spent at station)
- Current status per station (passed/upcoming/current)

**Database Impact:**
- Creates `train_route_segments` table
- Stores one record per station-to-station segment
- TTL: Cached for 1 hour (route data doesn't change during journey)

**Endpoint:** `POST /api/data-collection/ntes/train-routes`

**Request:**
```bash
curl -X POST http://localhost:3000/api/data-collection/ntes/train-routes \
  -H "Content-Type: application/json" \
  -d '{"trainNumber": "12955"}'
```

**Success Response (201):**
```json
{
  "success": true,
  "message": "Route collected for 12955",
  "data": {
    "trainNumber": "12955",
    "stationsCount": 22,
    "segmentsStored": 21,
    "totalDistance": 1268,
    "collectedAt": "2026-03-21T10:36:00Z"
  }
}
```

**What's Stored:**
- 22 stations = 21 segments (A→B, B→C, C→D, etc.)
- Each segment includes travel time, delay, distance
- Perfect for training segment-level delay models

---

## 🚉 STEP 3: Collect Station Board Data (Congestion Analysis)

**What it collects:**
- All trains arriving at a specific station (next 24 hours)
- All trains departing from the station
- For each train: number, name, origin, destination
- Expected arrival/departure times and delays
- Platform number (when available)

**Database Impact:**
- Creates `station_board_snapshots` table
- Stores one record per train per event (arrival/departure)
- TTL: Cached for 10 minutes (changes frequently with delays)

**Endpoint:** `POST /api/data-collection/ntes/station-boards`

**Request:**
```bash
curl -X POST http://localhost:3000/api/data-collection/ntes/station-boards \
  -H "Content-Type: application/json" \
  -d '{"stationCode": "VR"}'  // Virar station
```

**Success Response (201):**
```json
{
  "success": true,
  "message": "Station board collected for VR",
  "data": {
    "stationCode": "VR",
    "stationName": "Virar",
    "arrivalTrainsCount": 12,
    "departureTrainsCount": 12,
    "totalRecordsStored": 24,
    "collectedAt": "2026-03-21T10:37:00Z"
  }
}
```

**Station Codes to Collect:**
```
MMCT - Mumbai Central
VR   - Virar
VST  - Vasai Road
NG   - Nagpur Junction
NDLS - New Delhi
JBP  - Jhansi
BPL  - Bhopal
SBC  - Bangalore
```

---

## 📈 Collection Progress Monitoring

**Endpoint:** `GET /api/data-collection/ntes/status`

**Request:**
```bash
curl http://localhost:3000/api/data-collection/ntes/status
```

**Response:**
```json
{
  "timestamp": "2026-03-21T10:40:00Z",
  "databaseReady": true,
  "collectionProgress": {
    "trainStatusSnapshots": 150,
    "routeSegments": 342,
    "stationBoardSnapshots": 580,
    "totalRecords": 1072
  },
  "mlTrainingReadiness": {
    "minRequiredRecords": 10000,
    "currentRecords": 1072,
    "percentComplete": 11,
    "isReadyForTraining": false
  },
  "recommendations": [
    "[YELLOW] Early stage (11% complete). Continue collecting data."
  ],
  "nextSteps": [
    "STEP 2: Collect full train routes: POST /api/data-collection/ntes/train-routes",
    "STEP 3: Collect station board data: POST /api/data-collection/ntes/station-boards"
  ]
}
```

**Progress Stages:**
- 0-10% → Red "No data" (start collecting)
- 10-50% → Yellow "Early stage" (collect more)
- 50-90% → Orange "Approaching readiness" (intensive collection)
- 90-100% → Green "Ready for ML training" (begin model training)

---

##  Automated Collection Strategy (Recommended)

### Daily Automated Collection Job
```javascript
// Run this daily at midnight
async function dailyDataCollection() {
  const trains = ['12955', '13345', '14645', '15906'];
  const stations = ['MMCT', 'VR', 'VST', 'NG', 'NDLS', 'JBP', 'BPL', 'SBC'];

  // Collect running status
  for (const trainNumber of trains) {
    await fetch('http://localhost:3000/api/data-collection/ntes/train-status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ trainNumber })
    });
  }

  // Collect full routes
  for (const trainNumber of trains) {
    await fetch('http://localhost:3000/api/data-collection/ntes/train-routes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ trainNumber })
    });
  }

  // Collect station boards
  for (const stationCode of stations) {
    await fetch('http://localhost:3000/api/data-collection/ntes/station-boards', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stationCode })
    });
  }
}
```

### Real-Time Collection (Every 5 Minutes)
```javascript
// Run every 5 minutes for active trains
setInterval(async () => {
  const activeTains = ['12955', '13345', '14645'];

  for (const trainNumber of activeTrains) {
    await fetch('http://localhost:3000/api/data-collection/ntes/train-status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ trainNumber })
    }).catch(err => console.error(`Failed to collect ${trainNumber}:`, err));
  }
}, 5 * 60 * 1000); // 5 minutes
```

---

## 📚 Database Tables Structure

### `train_status_snapshots`
```sql
CREATE TABLE train_status_snapshots (
  id INTEGER PRIMARY KEY,
  train_number TEXT,
  train_name TEXT,
  current_status TEXT,  -- Running/Arrived/Departed/Yet to start
  last_reported_station_code TEXT,
  last_reported_station_name TEXT,
  delay_minutes INTEGER,
  distance_covered INTEGER,
  distance_remaining INTEGER,
  scheduled_arrival TEXT,
  actual_arrival TEXT,
  platform_number TEXT,
  collected_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  day_of_journey TEXT
);
```

**ML Use Cases:**
- Predict delay at next station
- Estimate platform usage
- Forecast crowding levels based on delay patterns

### `train_route_segments`
```sql
CREATE TABLE train_route_segments (
  id INTEGER PRIMARY KEY,
  train_number TEXT,
  from_station_code TEXT,
  to_station_code TEXT,
  from_station_name TEXT,
  to_station_name TEXT,
  scheduled_departure TEXT,
  scheduled_arrival TEXT,
  actual_departure TEXT,
  actual_arrival TEXT,
  delay_minutes INTEGER,
  segment_distance INTEGER,
  segment_duration INTEGER,
  collected_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

**ML Use Cases:**
- Segment-level delay prediction
- Travel time estimation
- Identify bottleneck segments

### `station_board_snapshots`
```sql
CREATE TABLE station_board_snapshots (
  id INTEGER PRIMARY KEY,
  station_code TEXT,
  station_name TEXT,
  train_number TEXT,
  train_name TEXT,
  event_type TEXT,  -- arrival/departure
  scheduled_time TEXT,
  expected_time TEXT,
  delay_minutes INTEGER,
  platform_number TEXT,
  collected_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

**ML Use Cases:**
- Station congestion estimation
- Platform load prediction
- Arrival/departure delay patterns

---

## 🎯 ML Training Data Preparation

### Once You Have 10,000+ Records

**Endpoint:** `POST /api/ml-training` (Coming soon)

```bash
curl -X POST http://localhost:3000/api/ml-training \
  -H "Content-Type: application/json" \
  -d {
    "modelType": "delay_prediction",  # delay_prediction, crowding, halt_duration
    "trainingData": "all",            # all, last_30_days, last_7_days
    "testMinutes": 15,                # Delay prediction horizont
    "evaluationMetric": "rmse"        # rmse, mae, accuracy
  }
```

### Useful Queries for Analysis

```sql
-- Average delay by station
SELECT last_reported_station_name, AVG(delay_minutes) as avg_delay, COUNT(*) as records
FROM train_status_snapshots
GROUP BY last_reported_station_name
ORDER BY avg_delay DESC;

-- Segment performance
SELECT from_station_name, to_station_name,
       AVG(delay_minutes) as avg_delay,
       MAX(delay_minutes) as max_delay
FROM train_route_segments
GROUP BY from_station_code, to_station_code
ORDER BY avg_delay DESC;

-- Station congestion (trains per hour)
SELECT station_name, strftime('%H', collected_at) as hour,
       COUNT(*) as trains_count
FROM station_board_snapshots
GROUP BY station_code, hour
ORDER BY trains_count DESC;
```

---

## ⚙️ Configuration

**Environment Variables:**
```bash
# .env.local
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=0

NODE_ENV=development
LOG_LEVEL=debug
```

**NTES Integration Settings (in `services/ntes-service.ts`):**
```typescript
// Cache TTLs
const RUNNING_STATUS_CACHE_TTL = 300;      // 5 minutes
const ROUTE_CACHE_TTL = 3600;              // 1 hour
const STATION_BOARD_CACHE_TTL = 600;       // 10 minutes

// Batch collection
const BATCH_SIZE = 50;                     // Trains per batch
const BATCH_DELAY = 1000;                  // ms between batches
```

---

## 🔄 Future Enhancements (Coming Soon)

### STEP 4: Cancelled & Rescheduled Trains
```
GET /api/data-collection/ntes/cancellations
GET /api/data-collection/ntes/rescheduled
```

### STEP 5: Diverted Trains
```
GET /api/data-collection/ntes/diversions
```

### STEP 6: Live Arrival/Departure Streams
```
WebSocket /api/stream/train-arrivals
WebSocket /api/stream/train-departures
```

### STEP 7: Train Between Stations
```
GET /api/data-collection/ntes/trains-between?from=MMCT&to=NG
```

### Derived Metrics (Auto-calculated)
- Segment travel time vs scheduled
- Dwell time actual vs scheduled
- Train progress percentage
- Station load approximation
- Congestion index per station

---

## 🐛 Troubleshooting

### Database Health Check Returns "Unhealthy"
```bash
# Check SQLite database file exists
ls -la /path/to/railsense/data/railsense.db

# Restart SQLite with fresh schema
rm data/railsense.db  # CAUTION: This deletes all data!
npm start
```

### Redis Connection Failed
```bash
# Option 1: Start Redis
redis-server

# Option 2: Start Docker Redis
docker run -d -p 6379:6379 redis:latest

# Option 3: Disable Redis (use in-memory fallback)
# Set REDIS_HOST=skip in .env.local
```

### Collection Shows 0 Records
```bash
# Verify API endpoints are working
curl http://localhost:3000/api/health

# Check database tables exist
sqlite3 data/railsense.db ".tables"

# Test single collection
curl -X POST http://localhost:3000/api/data-collection/ntes/train-status \
  -d '{"trainNumber": "12955"}'
```

---

## 📞 Support

For issues or questions:
1. Check `/api/system/db-health` status
2. Review logs in `logs/` directory
3. Verify NTES service is accessible
4. Check database schema is initialized

---

**Last Updated:** March 21, 2026 | **Version:** 1.0 | **Status:** Production Ready
