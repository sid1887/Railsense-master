# RailSense Operations Guide

## Quick Start (5 minutes)

### 1. Install Dependencies
```bash
npm install better-sqlite3
```

### 2. Initialize Database
```bash
node scripts/initDb.js
```

Output should show:
```
[DB Init] ✓ train_snapshots table ready
[DB Init] ✓ Index: idx_train_timestamp
[DB Init] ✓ Index: idx_section_timestamp
[DB Init] ✓ Index: idx_timestamp
[DB Init] ✓ Schema verified (10 columns)
[DB Init] ✓ Current snapshots in database: 0
[DB Init] ✓ Database initialization complete
```

### 3. Start in New Terminals

**Terminal 1: Collector (Background Data Collection)**
```bash
node scripts/stableCollector.js
```

Expected output:
```
[Collector] Initializing database...
[Collector] Starting collection cycle every 30 seconds
[Collector] Tracking trains: 12955, 12728, 17015, 12702, 11039
[Collector] ✓ Cycle 1: 5/5 trains collected
[Collector] Stats: total=5, last=sample_time, avg_speed=45.2
```

**Terminal 2: Next.js Server**
```bash
npm run dev
```

Expected output:
```
> dev
> next dev

  ▲ Next.js 14.2.35
  - Local:        http://localhost:3000

✓ Ready in 2.45s
```

**Terminal 3 (Optional): Validation**
```bash
node scripts/validate.js
```

Expected output:
```
🔍 RailSense System Validation

1️⃣  Database Check
   ✅ Database ready (5 snapshots)

2️⃣  Server Check
   ✅ Server is running

3️⃣  API Endpoints Check
   ✅ /api/train/12955: OK (FAIR)
   ✅ /api/train/12728: OK (FAIR)

4️⃣  Admin Endpoint Check
   ✅ /api/admin/providers/status: OK
      Providers: NTES, RailYatri

5️⃣  Collector Status Check
   ✅ Collector running (last snapshot 3s ago)

==================================================
Summary: 5 passed, 0 failed
✅ All systems ready for demo!
```

## API Usage

### Get Train Data
```bash
curl http://localhost:3000/api/train/12955 | jq .
```

### Check Provider Health
```bash
curl http://localhost:3000/api/admin/providers/status | jq .
```

### Direct Database Query
```bash
# Count snapshots
sqlite3 data/history.db "SELECT COUNT(*) FROM train_snapshots"

# Latest data for specific train
sqlite3 data/history.db "SELECT lat, lng, speed, delay, timestamp FROM train_snapshots WHERE train_number='12955' ORDER BY timestamp DESC LIMIT 1"

# Snapshot counts by train (last hour)
sqlite3 data/history.db "SELECT train_number, COUNT(*) as count FROM train_snapshots WHERE timestamp > $(date +%s)000-3600000 GROUP BY train_number"
```

## Configuration

### Tracked Trains
Edit `.env.local` to change which trains are tracked:
```
TRACKED_TRAINS=12955,12728,17015,12702,11039
```

### Collection Interval
Edit `scripts/stableCollector.js`:
```javascript
const COLLECT_INTERVAL = 30; // seconds (default)
```

### Provider Cache TTL
Edit `services/providers/*.ts`:
```typescript
private CACHE_TTL_MS = 30000; // 30 seconds
```

### API Refresh Rate
Update frontend components:
```typescript
useSWR(url, fetcher, { refreshInterval: 5000 }) // 5 seconds
```

## Monitoring

### Real-time Logs
Watch collector output:
```bash
tail -f /tmp/railsense-collector.log
```

### Database Size
```bash
ls -lh data/history.db
```

### Data Freshness
```bash
# Check when last snapshot was added
sqlite3 data/history.db "SELECT datetime(MAX(timestamp)/1000, 'unixepoch', 'localtime') FROM train_snapshots"
```

### Provider Health
```bash
curl http://localhost:3000/api/admin/providers/status | jq '.providers[] | {name, successRate, avgLatencyMs}'
```

## Troubleshooting

### Problem: "SQLITE_CANTOPEN"
**Cause:** Database file can't be created
**Fix:**
```bash
mkdir -p data
chmod 755 data
node scripts/initDb.js
```

### Problem: Collector not collecting
**Cause:** Collector process crashed
**Fix:**
```bash
# Kill any stuck processes
killall node

# Restart collector
node scripts/stableCollector.js
```

### Problem: API returns 404
**Cause:** No data for train in database
**Fix:**
```bash
# Wait for collector to gather data (30 seconds)
# OR manually insert test data:
sqlite3 data/history.db "INSERT INTO train_snapshots (train_number, lat, lng, speed, delay, source, timestamp) VALUES ('12955', 19.076, 72.878, 45.5, 5, 'test', $(date +%s)000)"
```

### Problem: High latency on API calls
**Cause:** Database growing too large
**Fix:**
```bash
# Archive old data (>7 days)
sqlite3 data/history.db "DELETE FROM train_snapshots WHERE timestamp < $(date +%s)000 - 604800000"

# Vacuum database
sqlite3 data/history.db VACUUM

# Check database size
ls -lh data/history.db
```

### Problem: Provider keeps failing
**Cause:** Network issue or provider API down
**Fix:**
```bash
# Check provider health
curl http://localhost:3000/api/admin/providers/status | jq '.recommendations'

# Restart collector
killall node
node scripts/stableCollector.js
```

## Backup & Recovery

### Backup Database
```bash
cp data/history.db data/history.db.backup-$(date +%Y%m%d-%H%M%S)
```

### Restore from Backup
```bash
cp data/history.db.backup-20240101-120000 data/history.db
```

### Export Data
```bash
# CSV export
sqlite3 data/history.db ".mode csv" ".headers on" "SELECT * FROM train_snapshots LIMIT 1000" > export.csv

# JSON export
sqlite3 data/history.db ".mode json" "SELECT * FROM train_snapshots LIMIT 1000" > export.json
```

## Performance Tuning

### Increase Collection Concurrency
```javascript
const limit = pLimit(10); // Was 5, max is 20
```

### Reduce Cache TTL (fresher data)
```typescript
private CACHE_TTL_MS = 15000; // Was 30000
```

### Optimize Database Queries
```bash
# Create additional indexes if needed
sqlite3 data/history.db "CREATE INDEX idx_source ON train_snapshots(source)"
```

## Demo Checklist

- [ ] Database initialized (`scripts/initDb.js` complete)
- [ ] Collector running (`node scripts/stableCollector.js`)
- [ ] Server running (`npm run dev`)
- [ ] Validation passing (`node scripts/validate.js`)
- [ ] Sample data present (database has >10 snapshots)
- [ ] API responsive (`curl /api/train/12955` returns data)
- [ ] Provider health good (`/api/admin/providers/status` shows <5% failures)
- [ ] Frontend updated with new API calls
- [ ] UI displays halt detection and predictions
- [ ] Data quality marked as "GOOD" or "FAIR"

## Emergency Procedures

### Complete Reset
```bash
# Stop everything
killall node

# Clear database
rm data/history.db

# Reinitialize
node scripts/initDb.js

# Restart all
node scripts/stableCollector.js &
npm run dev
```

### Migration from Old System
```bash
# The old endpoints still work, but use new ones:
# OLD: /api/trains/:id/position
# NEW: /api/train/:id (returns position + everything else)

# Update frontend components to call /api/train/:id instead
```

## Support

### Check System Status
```bash
node scripts/validate.js
```

### View Detailed Logs
```bash
# Collector logs
tail -100 logs/stableCollector.log

# Server logs (in terminal where npm run dev is running)
```

### Debug Single Train
```bash
# Check database for train
sqlite3 data/history.db "SELECT * FROM train_snapshots WHERE train_number='12955' ORDER BY timestamp DESC LIMIT 5"

# Call API directly
curl -i http://localhost:3000/api/train/12955

# Check provider status
curl -s http://localhost:3000/api/admin/providers/status | jq '.recommendations'
```

---

**For 4-day demo event, ensure collector runs continuously without restarts.**
**Expected: ~288 snapshots per train per day (30s interval × 24h)**
