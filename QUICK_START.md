# 🚀 NTES Integration - Quick Start Reference

## Verify System is Ready
```bash
GET /api/system/db-health
# Should show: "overallStatus": "healthy"
```

---

## 5 KEY ENDPOINTS

### 1️⃣ Check Collection Progress
```bash
GET /api/data-collection/ntes/status
```
**Returns:** Record counts, % complete toward 10,000-record ML threshold

---

### 2️⃣ Collect Train Running Status
```bash
POST /api/data-collection/ntes/train-status
Body: { "trainNumber": "12955" }
```
**Collects:** Current delay, location, next station, platform
**Best for:** Real-time train information
**Frequency:** Every 5 minutes for active trains

---

### 3️⃣ Collect Train Complete Route
```bash
POST /api/data-collection/ntes/train-routes
Body: { "trainNumber": "12955" }
```
**Collects:** All stations, segment delays, arrival/departure times
**Best for:** Historical route analysis
**Frequency:** Once per train per day (route data stable)

---

### 4️⃣ Collect Station Board
```bash
POST /api/data-collection/ntes/station-boards
Body: { "stationCode": "VR" }
```
**Collects:** All arrivals/departures at station
**Best for:** Congestion analysis
**Frequency:** Every 10 minutes

---

### 5️⃣ View Database Health
```bash
GET /api/system/db-health
```
**Checks:** Redis connectivity, SQLite availability, response times
**Response times:** Redis <50ms, SQLite <100ms

---

## ⚡ Quick Test (Copy & Paste)

### Windows PowerShell
```powershell
# Test 1: Health Check
$response = Invoke-WebRequest -Uri "http://localhost:3000/api/system/db-health" | ConvertFrom-Json
Write-Host "Database Status: $($response.overallStatus)"

# Test 2: Collect Train Status
$body = @{ trainNumber = "12955" } | ConvertTo-Json
Invoke-WebRequest -Method POST -Uri "http://localhost:3000/api/data-collection/ntes/train-status" `
  -Headers @{"Content-Type"="application/json"} -Body $body | ConvertFrom-Json | fl

# Test 3: Check Progress
Invoke-WebRequest -Uri "http://localhost:3000/api/data-collection/ntes/status" | ConvertFrom-Json | fl
```

### Windows Command Prompt
```cmd
REM Run the batch test script
test-ntes-integration.bat
```

### Linux/Mac Terminal
```bash
# Run the shell test script
bash test-ntes-integration.sh
```

---

## 📊 COLLECTION MILESTONES

| Records | Status | ML Readiness | Recommendation |
|---------|--------|--------------|-----------------|
| 0-1K | 🔴 RED | 0-10% | Start collecting now |
| 1K-5K | 🟡 YELLOW | 10-50% | Good progress, keep going |
| 5K-10K | 🟠 ORANGE | 50-90% | Almost ready, intensify collection |
| 10K+ | 🟢 GREEN | 100% | ✅ Ready for ML training |

---

## 📋 TRAIN NUMBERS (Pre-verified)
```
12955 - Mumbai → Pune (High-frequency)
13345 - Mumbai → Jhansi (Long-distance)
14645 - Mumbai → Bhopal (Premium)
15906 - Bangalore → Mumbai (Express)
```

## 🏘️ STATION CODES
```
MMCT  - Mumbai Central
VR    - Virar
VST   - Vasai Road
NG    - Nagpur Junction
NDLS  - New Delhi
JBP   - Jhansi
BPL   - Bhopal
SBC   - Bangalore
```

---

## 🔧 RECOMMENDED COLLECTION SCHEDULE

### Daily (1-2x per day)
- Full routes for all 4 trains
- Station boards for 4-6 major junctions

### Every 2 Hours (for active trains)
- Running status for trains currently in service
- Updated station boards for busy stations

### Every 5 Minutes (real-time)
- Running status for top trains (if server resources allow)
- Live platform updates

---

## 🎯 GOALS

| Phase | Target | Timeline | Action |
|-------|--------|----------|--------|
| 1 | Test endpoints | Day 1 | Run test endpoints manually |
| 2 | Initial collection | Days 1-3 | Collect 100-500 records |
| 3 | Scale collection | Days 3-7 | Automated daily collection |
| 4 | Reach 10K records | Days 7-14 | Intensive collection |
| 5 | ML training | Day 14+ | Start training delay prediction model |

---

## ⚠️ TROUBLESHOOTING

### "Cannot connect to server"
- ✅ Ensure Next.js dev server is running: `npm run dev`
- ✅ Check port 3000 is accessible

### "Database unhealthy"
```bash
# Check Redis
redis-cli ping

# Check SQLite
sqlite3 data/railsense.db ".tables"
```

### "0 Records in Status"
- Collection endpoints create tables automatically on first call
- Try collecting again: `POST /api/data-collection/ntes/train-status`
- Check server logs for errors

### "Real-time data not updating"
- NTES data is cached 5min (status), 1hr (routes), 10min (boards)
- Wait for cache TTL or restart server: `npm run dev`

---

## 📚 FULL DOCUMENTATION

See **NTES_INTEGRATION_GUIDE.md** for:
- Complete setup instructions
- Database schema details
- Automation scripts
- Advanced SQL queries
- ML training workflow

---

## 🚀 START HERE

1. **Verify health:** `GET /api/system/db-health`
2. **Collect sample:** `POST /api/data-collection/ntes/train-status` (12955)
3. **Check progress:** `GET /api/data-collection/ntes/status`
4. **Collect more:** Routes, station boards, additional trains/stations
5. **Automate:** Set up schedule once you see data flowing

---

**Last Updated:** March 2026 | **Status:** Ready to Deploy
