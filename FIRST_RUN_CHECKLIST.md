# 🎯 NTES Integration - First Run Checklist

Complete these steps in order for your first data collection.

---

## ✅ PRE-FLIGHT CHECKS (5 minutes)

### Step 1: Ensure Dev Server is Running
```bash
npm run dev
```

Expected output:
```
✓ Compiled successfully
Listen on: http://localhost:3000
```

**Status:** Did you see ✓ Compiled successfully?
- [ ] Yes, continue to Step 2
- [ ] No, troubleshoot at [TROUBLESHOOTING.md#Issue-1](TROUBLESHOOTING.md)

---

### Step 2: Check Redis is Available (Optional but Recommended)

**Windows PowerShell:**
```powershell
# Try to connect to Redis
$redisPort = Test-NetConnection -ComputerName localhost -Port 6379
if ($redisPort.TcpTestSucceeded) {
  Write-Host "✅ Redis is accessible on port 6379"
} else {
  Write-Host "⚠️ Redis not found, using in-memory cache (slower)"
}
```

**Or simply start Redis:**
```bash
# Option A: If you have Redis installed locally
redis-server

# Option B: Using Docker (recommended)
docker run -d -p 6379:6379 --name railsense-redis redis:latest

# Verify it's running
redis-cli ping
# Should return: PONG
```

**Status:** Redis available?
- [ ] Yes (redis-cli ping returns PONG)
- [ ] No, that's okay (in-memory mode will work, just slower)

---

### Step 3: Create data/ Directory (if Not Present)

```bash
# Ensure the data directory exists
mkdir -p data

# Verify
ls -la data/
```

**Status:** data/ directory exists?
- [ ] Yes
- [ ] No - Create it manually in your project root

---

## 🚀 FIRST CONNECTION (2 minutes)

### Step 4: Test Database Health

**Using Terminal/PowerShell:**
```bash
curl http://localhost:3000/api/system/db-health
```

**Using Browser:**
```
http://localhost:3000/api/system/db-health
```

**Expected Response:**
```json
{
  "overallStatus": "healthy",
  "redis": { "available": true },
  "sqlite": { "available": true }
}
```

**Status:** Response indicates healthy?
- [ ] Healthy ✅
- [ ] Degraded (Redis unavailable, using in-memory)
- [ ] Error - See [TROUBLESHOOTING.md](TROUBLESHOOTING.md)

---

## 💾 DATA COLLECTION (10 minutes)

### Step 5: Collect Your First Train Status

**Using Terminal/PowerShell:**
```powershell
$body = @{ trainNumber = "12955" } | ConvertTo-Json
Invoke-WebRequest -Method POST `
  -Uri "http://localhost:3000/api/data-collection/ntes/train-status" `
  -Headers @{"Content-Type"="application/json"} `
  -Body $body | ConvertFrom-Json | fl
```

**Using curl (Git Bash / WSL):**
```bash
curl -X POST http://localhost:3000/api/data-collection/ntes/train-status \
  -H "Content-Type: application/json" \
  -d '{"trainNumber": "12955"}'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Train status collected for 12955",
  "data": {
    "trainNumber": "12955",
    "currentStatus": "Running",
    "delayMinutes": 12,
    "collectedAt": "2026-03-21T10:30:00Z"
  }
}
```

**Status:** Successful collection?
- [ ] Yes, success: true ✅
- [ ] No, error message shown - See [TROUBLESHOOTING.md](TROUBLESHOOTING.md)

---

### Step 6: Collect Second Train

```powershell
$body = @{ trainNumber = "13345" } | ConvertTo-Json
Invoke-WebRequest -Method POST `
  -Uri "http://localhost:3000/api/data-collection/ntes/train-status" `
  -Headers @{"Content-Type"="application/json"} `
  -Body $body | ConvertFrom-Json | fl
```

**Status:** Collected successfully?
- [ ] Yes ✅

---

### Step 7: Collect Train Route

```powershell
$body = @{ trainNumber = "12955" } | ConvertTo-Json
Invoke-WebRequest -Method POST `
  -Uri "http://localhost:3000/api/data-collection/ntes/train-routes" `
  -Headers @{"Content-Type"="application/json"} `
  -Body $body | ConvertFrom-Json | fl
```

**Expected:** Shows stationsCount, segmentStored, totalDistance

**Status:** Route collected?
- [ ] Yes ✅

---

### Step 8: Collect Station Board

```powershell
$body = @{ stationCode = "VR" } | ConvertTo-Json
Invoke-WebRequest -Method POST `
  -Uri "http://localhost:3000/api/data-collection/ntes/station-boards" `
  -Headers @{"Content-Type"="application/json"} `
  -Body $body | ConvertFrom-Json | fl
```

**Expected:** Shows arrivalTrainsCount, departureTrainsCount

**Status:** Station board collected?
- [ ] Yes ✅

---

## 📊 CHECK PROGRESS (2 minutes)

### Step 9: View Collection Progress

```bash
curl http://localhost:3000/api/data-collection/ntes/status
```

**Expected Response:**
```json
{
  "collectionProgress": {
    "trainStatusSnapshots": 2,
    "routeSegments": 21,
    "stationBoardSnapshots": 24,
    "totalRecords": 47
  },
  "mlTrainingReadiness": {
    "minRequiredRecords": 10000,
    "currentRecords": 47,
    "percentComplete": 0.47,
    "isReadyForTraining": false
  },
  "recommendations": [
    "[YELLOW] Early stage (0.47% complete). Continue collecting data."
  ]
}
```

**Status:** Check the figures:
- [ ] totalRecords > 0 (You collected data!)
- [ ] percentComplete shows progress toward 10000

---

## 🔄 CONTINUOUS COLLECTION (Optional)

### Step 10: Collect More Trains & Stations

**All Reference Trains:**

```powershell
$trains = @("12955", "13345", "14645", "15906")

foreach ($train in $trains) {
  $body = @{ trainNumber = $train } | ConvertTo-Json
  Write-Host "Collecting $train..."
  Invoke-WebRequest -Method POST `
    -Uri "http://localhost:3000/api/data-collection/ntes/train-status" `
    -Headers @{"Content-Type"="application/json"} `
    -Body $body | Out-Null
  Start-Sleep -Seconds 1
}

Write-Host "Done collecting all reference trains"
```

**All Major Stations:**

```powershell
$stations = @("MMCT", "VR", "VST", "NG", "NDLS", "JBP", "BPL", "SBC")

foreach ($station in $stations) {
  $body = @{ stationCode = $station } | ConvertTo-Json
  Write-Host "Collecting board for $station..."
  Invoke-WebRequest -Method POST `
    -Uri "http://localhost:3000/api/data-collection/ntes/station-boards" `
    -Headers @{"Content-Type"="application/json"} `
    -Body $body | Out-Null
  Start-Sleep -Seconds 1
}

Write-Host "Done collecting all station boards"
```

**Status:** Collections completed?
- [ ] Yes, all requests returned success: true

---

### Step 11: Check Updated Progress

```bash
curl http://localhost:3000/api/data-collection/ntes/status
```

**Expected:** totalRecords should be much higher now

**Status:** Progress updated?
- [ ] Yes, totalRecords increased ✅

---

## 🎯 SUCCESS CRITERIA

Your setup is working if:

```
✅ GET /api/system/db-health returns "overallStatus": "healthy"
✅ POST /api/data-collection/ntes/train-status returns "success": true
✅ POST /api/data-collection/ntes/train-routes returns "success": true
✅ POST /api/data-collection/ntes/station-boards returns "success": true
✅ GET /api/data-collection/ntes/status shows totalRecords > 0
```

If all checkmarks ✅ are satisfied:
## 🎉 Congratulations! System is operational!

---

## 📈 Next Steps

### Immediate (Day 1-2)
1. ✅ Run through this checklist (done!)
2. ✅ Collect initial data from all trains and stations (done!)
3. [ ] Run collection multiple times to accumulate data
4. [ ] Monitor progress: `GET /api/data-collection/ntes/status`

### Short-term (Day 3-7)
- [ ] Increase collection frequency to 2-3x daily
- [ ] Add 5-10 more trains to collection list
- [ ] Set up automated collection script (batch)

### Medium-term (Day 7-14)
- [ ] Reach 1,000 records milestone (status shows 10%)
- [ ] Reach 5,000 records milestone (status shows 50%)
- [ ] Reach 10,000 records milestone ⭐ (Ready for ML training!)

### Long-term (Day 14+)
- [ ] Begin ML model training on collected data
- [ ] Implement real NTES API scraping (replace mock data)
- [ ] Deploy to production

---

## 📞 Quick Troubleshooting

| Issue | Solution |
|-------|----------|
| "Cannot connect to server" | Run `npm run dev` |
| "Database unhealthy" | Check SQLite file permissions |
| "0 records collected" | Check database tables created: `sqlite3 data/railsense.db ".tables"` |
| "Requests timing out" | Reduce collection rate or check Redis |
| "CORS error" | Ensure frontend and backend on same localhost:3000 |

See [TROUBLESHOOTING.md](TROUBLESHOOTING.md) for detailed solutions.

---

## 📚 Documentation Structure

- **[QUICK_START.md](QUICK_START.md)** - 5-minute overview with endpoints
- **[API_REFERENCE.md](API_REFERENCE.md)** - Detailed endpoint documentation
- **[NTES_INTEGRATION_GUIDE.md](NTES_INTEGRATION_GUIDE.md)** - Complete guide with examples
- **[DATABASE_SCHEMA.md](DATABASE_SCHEMA.md)** - SQL queries and analysis
- **[TROUBLESHOOTING.md](TROUBLESHOOTING.md)** - Common issues and fixes

---

## 🎓 Learning Path

### For Users
1. Start: This checklist
2. Reference: [QUICK_START.md](QUICK_START.md)
3. Details: [API_REFERENCE.md](API_REFERENCE.md)
4. Analysis: [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md)

### For Developers
1. Architecture: [NTES_INTEGRATION_GUIDE.md](NTES_INTEGRATION_GUIDE.md)
2. Code: `services/ntes-service.ts`
3. Endpoints: `app/api/data-collection/ntes/`
4. Schema: [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md)

---

**Last Updated:** March 2026 | **Time to Complete:** ~30 minutes | **Difficulty:** Beginner
