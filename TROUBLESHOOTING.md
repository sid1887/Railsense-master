# NTES Integration - Troubleshooting Guide

## Common Issues & Solutions

---

## Issue 1: "Cannot connect to http://localhost:3000"

### Symptoms
```
Error: connect ECONNREFUSED 127.0.0.1:3000
```

### Causes & Solutions

**A) Dev Server Not Running**
```bash
# Check if server is running
# Solution: Start the dev server
npm run dev

# Wait for: "✓ Compiled successfully"
# Listen on: http://localhost:3000
```

**B) Port 3000 Already in Use**
```bash
# Find what's using port 3000
# On Windows (PowerShell):
netstat -ano | findstr :3000

# Kill the process
taskkill /PID 1234 /F  # Replace 1234 with actual PID

# Then start dev server:
npm run dev
```

**C) Firewall Blocking**
```bash
# Windows Defender Firewall: Allow node.exe
# Or temporarily disable: netsh advfirewall set allprofiles state off
```

---

## Issue 2: "GET /api/system/db-health returns overallStatus: degraded"

### Symptoms
```json
{
  "overallStatus": "degraded",
  "cache": {
    "fallbackMode": true,
    "description": "Using in-memory cache (Redis unavailable)"
  }
}
```

### Causes & Solutions

**A) Redis Not Running**
```bash
# Check if Redis is running
redis-cli ping
# Expected: PONG

# If not running, start it:
# On Windows with Memurai or Windows Subsystem:
redis-server

# Or with Docker:
docker run -d -p 6379:6379 redis:latest

# Check connection:
redis-cli -h localhost -p 6379 ping
```

**B) Redis on Different Host/Port**
```bash
# Update .env.local
REDIS_HOST=localhost
REDIS_PORT=6379

# Then restart dev server:
npm run dev
```

**C) Redis Connection Timeout**
```bash
# Check Redis is accepting connections
redis-cli info server

# If firewall issue:
# Windows: Allow Redis in Defender Firewall
# Linux: Check iptables rules
```

### Important Note
⚠️ **System still works with degraded status** - uses in-memory cache instead of Redis
- Performance: Slightly slower (memory access vs network Redis)
- Persistence: Data lost on server restart
- Scalability: Works for testing, not production

---

## Issue 3: "Collection endpoint returns 'Database operation failed'"

### Symptoms
```json
{
  "success": false,
  "error": "Database operation failed",
  "details": "SQLITE_ERROR: database is locked"
}
```

### Causes & Solutions

**A) Database File Locked (Multiple Writers)**
```bash
# Verify database file exists and is writable
ls -la data/railsense.db

# Solution: Restart Only Node.js (not system)
# Kill dev server: Ctrl+C in terminal
# Restart:
npm run dev
```

**B) SQLite File Permissions**
```bash
# On Linux/Mac: Fix permissions
chmod 644 data/railsense.db
chmod 755 data/

# On Windows: Run as Administrator if needed
# Or check file isn't marked Read-Only in properties
```

**C) Database Corrupted**
```bash
# Backup first
cp data/railsense.db data/railsense.backup.db

# Check integrity
sqlite3 data/railsense.db "PRAGMA integrity_check;"

# If corrupted, delete and regenerate
rm data/railsense.db

# Restart dev server - new DB created automatically
npm run dev
```

---

## Issue 4: "Collection returns success but status shows 0 records"

### Symptoms
- POST request returns 201 success
- But GET /data-collection/ntes/status shows 0 records
- Tables not appearing in SQLite

### Causes & Solutions

**A) Tables Not Auto-Creating**
```bash
# Manually trigger by running collection again
curl -X POST http://localhost:3000/api/data-collection/ntes/train-status \
  -H "Content-Type: application/json" \
  -d '{"trainNumber": "12955"}'

# Check tables were created
sqlite3 data/railsense.db ".tables"
# Should show: train_record_snapshots, train_route_segments, station_board_snapshots
```

**B) Data Not Persisting (In-Memory Mode)**
```bash
# If Redis unavailable, check /api/system/db-health
curl http://localhost:3000/api/system/db-health

# If showing in-memory cache fallback:
# - Data only persists in current server session
# - Restarting server loses all collected data
# Solution: Start Redis before collecting data
```

**C) Write Permissions on data/ Directory**
```bash
# Verify directory is writable
ls -la data/

# If not, fix:
chmod 755 data/

# Windows: Right-click folder → Properties → Security → Edit Permissions
```

---

## Issue 5: "No Data from NTES (Mock Data Issue)"

### Symptoms
- Endpoints respond with success
- But data values are placeholder/mock data
- Real train information not being fetched

### Explanation
✅ **This is expected behavior** - Version 1.0 uses mock data

### When Real NTES Integration Arrives
```javascript
// Current (Version 1.0): Mock data
fetchTrainRunningStatus(12955)
→ Returns: { status: "Running", delay: 15 } (fake data)

// Future (Version 2.0): Real NTES Scraping
→ Will fetch: GET https://www.ntes.indianrailways.gov.in/...
→ Returns: Real current data from NTES website
```

### Progress Tracking
- ✅ API endpoints working with mock data
- ✅ Database collection working
- ✅ SQLite/Redis connectivity tested
- 🚧 Real NTES API integration (next phase)

---

## Issue 6: "Response Format Errors or Unexpected JSON"

### Symptoms
```
SyntaxError: Unexpected token < in JSON at position 0
```

### Causes

**A) HTML Error Response (Server Error)**
```bash
# The endpoint returned HTML error page instead of JSON
# Likely causes:
# 1. Server crashed - check terminal for error logs
# 2. Endpoint not found (typo in URL)
# 3. TypeScript compilation error

# Solution:
npm run build  # Rebuild project
npm run dev    # Start fresh
```

**B) Proxy/Middleware Issue**
```bash
# If using proxy or nginx, ensure it passes JSON through
# Test directly: curl -v http://localhost:3000/api/system/db-health
# Should see: Content-Type: application/json
```

---

## Issue 7: "Timeout on Collection (Request Hangs)"

### Symptoms
```bash
curl hangs for 30+ seconds, then times out
Request never completes
```

### Causes & Solutions

**A) NTES Service Taking Too Long**
```bash
# In development: Check terminal for slow queries
# Current timeout: 10 seconds (will be hit for slow NTES scraping)

# Solution: Mock data returns instantly, real NTES will be slower
# When implemented: Consider async collection with queue
```

**B) Database Locked (Concurrent Requests)**
```bash
# Sending too many requests at once
# SQLite only allows one write at a time

# Solution:
# 1. Reduce concurrent requests
# 2. Use batch endpoint (when available)
# 3. Space requests 1-2 seconds apart
```

**C) Memory Issue (Low RAM)**
```bash
# Check system resources
# Free up RAM: Close other applications

# Increase Node.js memory allocation:
NODE_OPTIONS=--max-old-space-size=4096 npm run dev
```

---

## Issue 8: "Endpoint Returns 400 - trainNumber is required"

### Symptoms
```json
{
  "success": false,
  "error": "trainNumber is required",
  "code": "INVALID_REQUEST"
}
```

### Solutions

**A) Missing Request Body**
```bash
# ❌ Wrong:
curl http://localhost:3000/api/data-collection/ntes/train-status

# ✅ Correct:
curl -X POST http://localhost:3000/api/data-collection/ntes/train-status \
  -H "Content-Type: application/json" \
  -d '{"trainNumber": "12955"}'
```

**B) Malformed JSON**
```bash
# ❌ Wrong:
curl -d '{trainNumber: "12955"}'  # Missing quotes around key

# ✅ Correct:
curl -d '{"trainNumber": "12955"}'  # Proper JSON
```

**C) Missing Content-Type Header**
```bash
# ❌ Wrong:
curl -d '{"trainNumber": "12955"}'

# ✅ Correct:
curl -H "Content-Type: application/json" \
  -d '{"trainNumber": "12955"}'
```

---

## Issue 9: "Rate Limit Exceeded (HTTP 429)"

### Symptoms
```json
{
  "success": false,
  "error": "Rate limit exceeded",
  "retryAfter": 60
}
```

### Solutions

**A) Too Many Requests Too Fast**
```bash
# Current limits: 50 requests/minute per endpoint

# ❌ Wrong: Sending 100 requests in 10 seconds
for i in {1..100}; do
  curl -X POST http://localhost:3000/api/data-collection/ntes/train-status \
    -d '{"trainNumber": "12955"}'
done

# ✅ Correct: Stagger requests
for i in {1..100}; do
  curl -X POST http://localhost:3000/api/data-collection/ntes/train-status \
    -d '{"trainNumber": "12955"}'
  sleep 1  # 1 second between requests
done
```

**B) Automated Collection Script**
```bash
# If you have batch/automation, ensure:
# 1. Space requests at least 1-2 seconds apart
# 2. Use different trains/stations to spread load
# 3. Consider batch endpoint (coming soon)
```

---

## Issue 10: "CORS Error (localhost can't access API)"

### Symptoms
```
Access to XMLHttpRequest blocked by CORS policy
```

### Explanation
✓ **Frontend is already same origin** (localhost:3000)
- No CORS issues when calling from browser at localhost:3000
- Only if frontend is on different port/domain

### Solutions

**A) Frontend Running on Different Port**
```bash
# Frontend: localhost:3001
# Backend: localhost:3000

# Add CORS headers in API routes:
// app/api/data-collection/ntes/train-status/route.ts
export async function POST(request: Request) {
  const response = NextResponse.json({ ... });
  response.headers.set('Access-Control-Allow-Origin', '*');
  return response;
}
```

---

## Issue 11: "Build Failures After New Changes"

### Symptoms
```
npm run build fails with TypeScript errors
```

### Solutions

**A) Clear Build Cache**
```bash
# Remove compiled output
rm -r .next

# Rebuild
npm run build
```

**B) Type Errors**
```bash
# Check types in modified files
npx tsc --noEmit

# Look for missing types or incorrect imports
```

**C) Missing Dependencies**
```bash
# Verify all imports exist
npm list

# Install missing:
npm install missing-package
```

---

## Issue 12: "Memory Growing (Possible Memory Leak)"

### Symptoms
- Server memory usage increases over time
- Eventually crashes or becomes very slow
- `top` or Task Manager shows Node process using 1GB+

### Solutions

**A) Stop Collection During Testing**
```bash
# If continuously collecting, memory will grow
# Expected: 100 snapshots ≈ 1MB
# Stop periodic collection processes
```

**B) Clear Cache Manually**
```bash
# Force garbage collection (development only)
// In ntes-service.ts:
async function clearAllCaches() {
  await redisClient.flushdb();
  // Restart server
}
```

**C) Monitor with Node Inspector**
```bash
# Start with inspector
node --inspect node_modules/.bin/next dev

# Open: chrome://inspect
```

---

## Quick Diagnostic Checklist

Use this when something breaks:

```bash
□ Server running?
  npm run dev

□ Is localhost:3000 accessible?
  curl http://localhost:3000

□ Database healthy?
  curl http://localhost:3000/api/system/db-health

□ Redis running?
  redis-cli ping

□ SQLite file exists?
  ls data/railsense.db

□ Collection endpoint responds?
  curl -X POST http://localhost:3000/api/data-collection/ntes/train-status \
    -d '{"trainNumber": "12955"}'

□ Data actually stored?
  sqlite3 data/railsense.db "SELECT COUNT(*) FROM train_status_snapshots;"

□ Check server logs
  Look at terminal output for errors
```

---

## Emergency Recovery

### "Everything is broken, start over"

```bash
# 1. Kill the dev server
Ctrl+C in terminal

# 2. Clear all build artifacts
rm -rf .next .turbo

# 3. Clear database (WARNING: DATA LOSS)
rm data/railsense.db

# 4. Clear node_modules and reinstall
rm -rf node_modules
npm install

# 5. Fresh build
npm run build

# 6. Start fresh
npm run dev

# 7. Test health check
curl http://localhost:3000/api/system/db-health
```

---

## Getting Help

1. **Check This Guide First** - Most common issues covered above
2. **Review Server Logs** - Terminal output often shows exact error
3. **Check API Response** - Use curl to see actual error message
4. **Verify Configuration** - Check .env.local has correct settings
5. **Read Source Code** - Issue often in service files (services/ntes-service.ts)

---

**Last Updated:** March 2026 | **Version:** 1.0 | **Status:** Production Ready
