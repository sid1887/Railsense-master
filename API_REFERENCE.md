# API Reference - NTES Data Integration

## Base URL
```
http://localhost:3000/api
```

---

## Health & Monitoring

### GET /system/db-health
Database connectivity and performance monitoring

**Response (HTTP 200 - Healthy)**
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

**Response (HTTP 503 - Degraded)**
```json
{
  "timestamp": "2026-03-21T10:30:00Z",
  "overallStatus": "degraded",
  "cache": {
    "status": "degraded",
    "fallbackMode": true,
    "description": "Using in-memory cache (Redis unavailable)",
    "suggestions": "Start Redis: redis-server or docker run -p 6379:6379 redis"
  }
}
```

---

## Data Collection Endpoints

### POST /data-collection/ntes/train-status
Collect current running status of a train

**Request**
```json
{
  "trainNumber": "12955",
  "startDate": "2026-03-21"  // Optional, format: YYYY-MM-DD
}
```

**cURL Example**
```bash
curl -X POST http://localhost:3000/api/data-collection/ntes/train-status \
  -H "Content-Type: application/json" \
  -d '{"trainNumber": "12955"}'
```

**Response (HTTP 201 - Created)**
```json
{
  "success": true,
  "message": "Train status collected for 12955",
  "data": {
    "trainNumber": "12955",
    "trainName": "Intercity Express",
    "currentStatus": "Running",
    "lastReportedStation": {
      "code": "VR",
      "name": "Virar",
      "time": "10:25:00"
    },
    "delayMinutes": 12,
    "distanceCovered": 45,
    "distanceRemaining": 1223,
    "nextStation": {
      "code": "VST",
      "name": "Vasai Road",
      "scheduledArrival": "10:35:00",
      "expectedArrival": "10:47:00"
    },
    "platformNumber": "3",
    "collectedAt": "2026-03-21T10:30:00Z",
    "timestamp": 1742611800
  }
}
```

**Response (HTTP 400 - Bad Request)**
```json
{
  "success": false,
  "error": "trainNumber is required"
}
```

**Database Table Created**
```
train_status_snapshots
├── train_number (TEXT)
├── current_status (TEXT)
├── delay_minutes (INTEGER)
├── distance_covered (INTEGER)
├── last_reported_station_code (TEXT)
├── scheduled_arrival (TEXT)
├── actual_arrival (TEXT)
├── platform_number (TEXT)
└── collected_at (DATETIME)
```

---

### POST /data-collection/ntes/train-routes
Collect complete route with all stations

**Request**
```json
{
  "trainNumber": "12955"
}
```

**cURL Example**
```bash
curl -X POST http://localhost:3000/api/data-collection/ntes/train-routes \
  -H "Content-Type: application/json" \
  -d '{"trainNumber": "12955"}'
```

**Response (HTTP 201 - Created)**
```json
{
  "success": true,
  "message": "Route collected for 12955",
  "data": {
    "trainNumber": "12955",
    "stationsCount": 22,
    "segmentsStored": 21,
    "totalDistance": 1268,
    "routes": [
      {
        "station": "MMCT",
        "stationName": "Mumbai Central",
        "sequence": 1,
        "distance": 0,
        "scheduledDeparture": "09:00:00",
        "actualDeparture": "09:03:00",
        "delayAtDeparture": 3
      },
      {
        "station": "VR",
        "stationName": "Virar",
        "sequence": 2,
        "distance": 45,
        "scheduledArrival": "09:35:00",
        "actualArrival": "09:40:00",
        "scheduledDeparture": "09:40:00",
        "actualDeparture": "09:42:00",
        "delayAtArrival": 5
      }
    ],
    "collectedAt": "2026-03-21T10:31:00Z"
  }
}
```

**Database Table Created**
```
train_route_segments
├── train_number (TEXT)
├── from_station_code (TEXT)
├── to_station_code (TEXT)
├── from_station_name (TEXT)
├── to_station_name (TEXT)
├── sequence (INTEGER)
├── distance (INTEGER)
├── scheduled_departure (TEXT)
├── actual_departure (TEXT)
├── scheduled_arrival (TEXT)
├── actual_arrival (TEXT)
├── delay_minutes (INTEGER)
└── collected_at (DATETIME)
```

---

### POST /data-collection/ntes/station-boards
Collect arrival/departure information for a station

**Request**
```json
{
  "stationCode": "VR"
}
```

**cURL Example**
```bash
curl -X POST http://localhost:3000/api/data-collection/ntes/station-boards \
  -H "Content-Type: application/json" \
  -d '{"stationCode": "VR"}'
```

**Response (HTTP 201 - Created)**
```json
{
  "success": true,
  "message": "Station board collected for VR",
  "data": {
    "stationCode": "VR",
    "stationName": "Virar",
    "arrivalCount": 12,
    "departureCount": 12,
    "totalRecords": 24,
    "board": [
      {
        "trainNumber": "12955",
        "trainName": "Intercity Express",
        "eventType": "arrival",
        "scheduledTime": "10:35:00",
        "expectedTime": "10:47:00",
        "delayMinutes": 12,
        "platformNumber": "2"
      },
      {
        "trainNumber": "13345",
        "trainName": "MMCT-JBP Express",
        "eventType": "departure",
        "scheduledTime": "10:52:00",
        "expectedTime": "10:55:00",
        "delayMinutes": 3,
        "platformNumber": "3"
      }
    ],
    "collectedAt": "2026-03-21T10:32:00Z"
  }
}
```

**Database Table Created**
```
station_board_snapshots
├── station_code (TEXT)
├── station_name (TEXT)
├── train_number (TEXT)
├── train_name (TEXT)
├── event_type (TEXT)  -- arrival | departure
├── scheduled_time (TEXT)
├── expected_time (TEXT)
├── delay_minutes (INTEGER)
├── platform_number (TEXT)
└── collected_at (DATETIME)
```

---

## Monitoring & Status

### GET /data-collection/ntes/status
Get collection progress and ML training readiness status

**cURL Example**
```bash
curl http://localhost:3000/api/data-collection/ntes/status
```

**Response (HTTP 200 - OK)**
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
  "phase": "EARLY_STAGE",
  "phaseColor": "YELLOW",
  "recommendations": [
    "[YELLOW] Early stage (11% complete). Continue collecting data."
  ],
  "nextSteps": [
    "STEP 1: Collect train status for active trains (POST /data-collection/ntes/train-status)",
    "STEP 2: Collect full train routes (POST /data-collection/ntes/train-routes)",
    "STEP 3: Collect station board data (POST /data-collection/ntes/station-boards)"
  ],
  "estimatedTimeToReady": "7-14 days"
}
```

**Phase Definitions**
```
Phase       Color   % Complete   Status                      Action
-------     -----   ----------   ------                      ------
NO_DATA     RED     0%           No data collected           Start immediate collection
EARLY       YELLOW  1-30%        Initial collection phase    Continue collecting
GROWTH      YELLOW  30-50%       Good momentum               Scale up collection
APPROACHING ORANGE  50-90%       Nearly ready                Intensive collection
READY       GREEN   90-100%      Ready for ML training       Begin model training
```

---

## Error Responses

### 400 Bad Request
```json
{
  "success": false,
  "error": "trainNumber is required",
  "code": "INVALID_REQUEST"
}
```

### 404 Not Found
```json
{
  "success": false,
  "error": "Train 99999 not found in NTES database",
  "code": "NOT_FOUND"
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "error": "Database operation failed",
  "details": "SQLITE_ERROR: database is locked",
  "code": "DATABASE_ERROR"
}
```

### 503 Service Unavailable
```json
{
  "success": false,
  "error": "NTES service temporarily unavailable",
  "code": "SERVICE_UNAVAILABLE",
  "retryAfter": 60
}
```

---

## Rate Limiting

**Current Limits:**
- Health check: 100 req/minute
- Collection endpoints: 50 req/minute per train
- Status check: 200 req/minute

**When Rate Limited (HTTP 429):**
```json
{
  "success": false,
  "error": "Rate limit exceeded",
  "retryAfter": 3600,
  "limit": {
    "requests": 50,
    "period": "1 minute",
    "remaining": 0,
    "resetAt": "2026-03-21T10:32:00Z"
  }
}
```

---

## Caching Strategy

| Endpoint | Cache TTL | Key Pattern | Fallback |
|----------|-----------|------------|----------|
| train-status | 5 min | `ntes:running:{trainNumber}` | Memory cache |
| train-routes | 1 hour | `ntes:route:{trainNumber}` | Memory cache |
| station-boards | 10 min | `ntes:board:{stationCode}` | Memory cache |
| db-health | 30 sec | `ntes:health` | No cache |
| status | No cache | - | Live calculation |

**Cache Invalidation**
```bash
# Manual cache clear for specific train
POST /api/cache/invalidate
Body: { "trainNumber": "12955", "type": "running" }

# Response
{
  "success": true,
  "message": "Cache cleared for 12955 (running status)"
}
```

---

## Data Retention

| Table | Retention | Growth Rate | Index |
|-------|-----------|------------|-------|
| train_status_snapshots | 90 days | ~100 records/day | train_number, collected_at |
| route_segments | 1 year | ~50 records/day | train_number, from_station |
| station_board_snapshots | 30 days | ~100 records/day | station_code, collected_at |

---

## Integration Examples

### Python (requests)
```python
import requests
import json

BASE_URL = "http://localhost:3000/api"

# Collect train status
response = requests.post(
    f"{BASE_URL}/data-collection/ntes/train-status",
    json={"trainNumber": "12955"}
)
print(response.json())

# Check progress
response = requests.get(
    f"{BASE_URL}/data-collection/ntes/status"
)
progress = response.json()
print(f"Records: {progress['collectionProgress']['totalRecords']}")
print(f"ML Ready: {progress['mlTrainingReadiness']['isReadyForTraining']}")
```

### JavaScript (fetch)
```javascript
const BASE_URL = "http://localhost:3000/api";

// Collect train status
const response = await fetch(`${BASE_URL}/data-collection/ntes/train-status`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ trainNumber: '12955' })
});
const data = await response.json();
console.log(data);

// Check progress
const statusResponse = await fetch(`${BASE_URL}/data-collection/ntes/status`);
const status = await statusResponse.json();
console.log(`Progress: ${status.mlTrainingReadiness.percentComplete}%`);
```

### PowerShell
```powershell
$BaseUrl = "http://localhost:3000/api"

# Collect train status
$body = @{ trainNumber = "12955" } | ConvertTo-Json
$response = Invoke-WebRequest -Method POST `
  -Uri "$BaseUrl/data-collection/ntes/train-status" `
  -Headers @{"Content-Type"="application/json"} `
  -Body $body

$response.Content | ConvertFrom-Json | fl

# Check progress
$status = Invoke-WebRequest -Uri "$BaseUrl/data-collection/ntes/status" | ConvertFrom-Json
Write-Host "Progress: $($status.mlTrainingReadiness.percentComplete)%"
```

---

**Last Updated:** March 2026 | **API Version:** 1.0 | **Status:** Stable
