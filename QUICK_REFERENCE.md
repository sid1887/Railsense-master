# RailSense Quick Reference Guide
## Common Operations & Troubleshooting

---

## 🚀 Getting Started (5 Minutes)

### Installation & Setup
```bash
# 1. Install dependencies
npm install
npm install better-sqlite3

# 2. Initialize database
node scripts/initDb.js

# 3. Verify environment
cat .env.local
```

### Running the System (3 Terminals)

**Terminal 1 - Data Collection**
```bash
node scripts/stableCollector.js
# Expected output:
# > Collector started
# > Cycle 1: Processing 5 trains
# > Train 12955: 19.076°N, 72.878°E
```

**Terminal 2 - API Server**
```bash
npm run dev
# Expected output:
# > ▲ Next.js 14.0.0
# > - ready started server on localhost:3000
```

**Terminal 3 - Testing**
```bash
.\scripts\comprehensive-test.ps1
# Expected output:
# ✓ API Tests: 5/5 PASS
# ✓ Weather: PASS
# ✓ News: PASS
```

---

## 📡 API Endpoints

### Get Train Data (Complete)
```bash
# Includes: position, halt, weather, news, everything
curl http://localhost:3000/api/train/12955
```

### Extract Just Weather
```bash
curl http://localhost:3000/api/train/12955 | jq '.enrichment.weather'

# Output:
# {
#   "temperature": 28.5,
#   "condition": "Partly Cloudy",
#   "humidity": 65,
#   "wind_speed": 3.2,
#   "visibility_m": 10000,
#   "precipitation_mm": 0,
#   "impact": {
#     "severity": "none",
#     "affects": [],
#     "reason": "No significant weather impact"
#   }
# }
```

### Extract Just News
```bash
curl http://localhost:3000/api/train/12955 | jq '.enrichment.news'

# Output:
# [
#   {
#     "title": "Railway service updates",
#     "source": "Google News",
#     "link": "https://...",
#     "relevance": 0.85
#   }
# ]
```

### Check System Health
```bash
curl http://localhost:3000/api/admin/providers/status

# Output shows provider status, collector cycles, data quality
```

---

## 🔧 Configuration

### API Keys

**OpenWeatherMap**
```bash
# File: .env.local
OPENWEATHER_API_KEY=b6054a812f7c020b3c0de08c40783728
```

### Collection Settings
```bash
# File: .env.local

# Which trains to track
TRACKED_TRAINS=12955,12728,17015,12702,11039

# How often to collect (seconds)
COLLECT_INTERVAL=30

# Database location
DATABASE_PATH=data/history.db
```

### Data Retention
```bash
# In scripts/stableCollector.js
const RETENTION_DAYS = 7;  // Delete data older than 7 days
```

---

## 🧪 Testing

### Run Full Test Suite
```powershell
# Windows PowerShell
.\scripts\comprehensive-test.ps1

# Expected: 15+ tests, all PASS (100%)
```

### Manual API Test
```bash
# Check if API is responding
curl http://localhost:3000/api/train/12955
# Status: 200 OK

# Validate weather field exists
curl http://localhost:3000/api/train/12955 | jq '.enrichment.weather.temperature'
# Output: 28.5

# Validate news field exists
curl http://localhost:3000/api/train/12955 | jq '.enrichment.news | length'
# Output: 2-3
```

### Database Check
```bash
# Connect to database
sqlite3 data/history.db

# Count records
SELECT COUNT(*) FROM train_snapshots;

# Show latest 5 records
SELECT * FROM train_snapshots ORDER BY timestamp DESC LIMIT 5;

# Exit
.quit
```

---

## ⚠️ Troubleshooting

### "No data available" (404)

**Problem:** API returns no data
**Solution:**
```bash
# 1. Wait 30 seconds (first collection cycle)
# 2. Check collector is running (Terminal 1)
# 3. Check database exists
ls -la data/history.db

# 4. Reinitialize database
node scripts/initDb.js

# 5. Restart all services
# - Kill all terminals (Ctrl+C)
# - Start over with 3 terminal setup
```

---

### "Weather shows null"

**Problem:** Weather data missing from response
**Solution:**
```bash
# 1. Check API key in .env.local
cat .env.local | grep OPENWEATHER

# 2. Test API key directly
curl "https://api.openweathermap.org/data/2.5/weather?lat=19.076&lon=72.878&appid=b6054a812f7c020b3c0de08c40783728&units=metric"

# 3. Check internet connectivity
ping api.openweathermap.org

# 4. Clear weather cache
# In Node REPL:
node -e "require('./services/weatherService').clearWeatherCache()"

# 5. Restart API server
# Kill Terminal 2, restart: npm run dev
```

---

### "High API latency" (>2 seconds)

**Problem:** API responses slower than 600ms
**Solution:**
```bash
# 1. Check database size
ls -lh data/history.db
# If > 500MB, archive old data

# 2. Archive old data
sqlite3 data/history.db "DELETE FROM train_snapshots WHERE timestamp < $(date +%s%3N) - 604800000;"

# 3. Optimize database
sqlite3 data/history.db VACUUM;

# 4. Check for slow queries
sqlite3 data/history.db ".mode line"
sqlite3 data/history.db "EXPLAIN QUERY PLAN SELECT * FROM train_snapshots WHERE train_number = '12955' ORDER BY timestamp DESC LIMIT 1;"

# 5. Restart collector (clear caches)
# Kill Terminal 1, restart: node scripts/stableCollector.js
```

---

### "Provider errors" in console

**Problem:** NTES/RailYatri API calls failing
**Solution:**
```bash
# 1. Check console output (Terminal 1)
# Should show: "Cycle X: Processing 5 trains"

# 2. Check specific provider
curl "https://ntes.indianrailways.gov.in/..." 2>&1

# 3. Verify internet
ping ntes.indianrailways.gov.in

# 4. Check .env.local for proxy settings
cat .env.local | grep -i proxy

# 5. Fallback is automatic (RailYatri → Real Schedule)
# Check /api/admin/providers/status to see which provider is active
```

---

### "News articles not showing"

**Problem:** News array is empty
**Solution:**
```bash
# 1. Check if news service can reach Google News
curl "https://news.google.com/rss" -v

# 2. Check news service log
# Look for "Fetching news for: [train]" in Terminal 2

# 3. Clear news cache
# (News cache is 1 hour TTL, clears automatically)

# 4. Try different train number
curl http://localhost:3000/api/train/12728

# 5. Check if query matches keyword filter
# 12955 is Central Railway, should match news
# If no articles, it's not a real train or no recent news
```

---

## 📈 Performance Tuning

### Faster Response Times
```bash
# Reduce weather cache TTL from 10 min to 5 min
# File: services/weatherService.ts
const WEATHER_CACHE_TTL = 300000;  // 5 minutes

# Reduce news cache TTL from 1 hour to 30 min
# File: services/newsService.ts
const NEWS_CACHE_TTL = 1800000;    // 30 minutes

# Increase collector interval from 30s to 60s
# File: .env.local
COLLECT_INTERVAL=60
```

### Reduce Database Size
```bash
# Keep only 3 days of data instead of 7
# File: scripts/stableCollector.js
const RETENTION_DAYS = 3;

# Or manually clean old data
sqlite3 data/history.db "DELETE FROM train_snapshots WHERE date(timestamp/1000, 'unixepoch') < date('now', '-3 days');"
```

### Batch Operations
```bash
# If you need to reset everything:
rm data/history.db
node scripts/initDb.js
# Then restart all 3 services
```

---

## 🐛 Debug Mode

### Enable Detailed Logging
```bash
# Terminal 2 (API Server)
DEBUG=* npm run dev

# Terminal 1 (Collector)
DEBUG=collector node scripts/stableCollector.js
```

### Check All Trains
```bash
# Get all 5 tracked trains
for train in 12955 12728 17015 12702 11039; do
  echo "=== Train $train ==="
  curl -s http://localhost:3000/api/train/$train | jq '.position.coords, .enrichment.weather.temperature'
done
```

### Database Debug
```bash
# Show all data types
sqlite3 data/history.db ".schema"

# Show indexes
sqlite3 data/history.db ".indices"

# Check database integrity
sqlite3 data/history.db "PRAGMA integrity_check;"

# Export to CSV
sqlite3 data/history.db ".mode csv"
sqlite3 data/history.db "SELECT * FROM train_snapshots;" > export.csv
```

---

## 🔄 Common Tasks

### Restart Everything
```bash
# 1. Kill all terminals (Ctrl+C)
# 2. Start fresh
npm install
node scripts/stableCollector.js  # Terminal 1
npm run dev                       # Terminal 2
.\scripts\comprehensive-test.ps1  # Terminal 3 (run once)
```

### Reset Database
```bash
# Clean slate
rm data/history.db
node scripts/initDb.js

# Or just clear old data
sqlite3 data/history.db "DELETE FROM train_snapshots WHERE timestamp < (SELECT MAX(timestamp) FROM train_snapshots) - 86400000;"
```

### Change Tracked Trains
```bash
# Edit .env.local
TRACKED_TRAINS=12955,12728,17015,12702,11039

# Restart collector (Terminal 1)
# Ctrl+C then: node scripts/stableCollector.js
```

### Deploy to Production
```bash
# Follow DEPLOYMENT.md:
# 1. Install PM2
npm install -g pm2

# 2. Use PM2 config (or create new one)
pm2 start ecosystem.config.js

# 3. Monitor
pm2 logs
pm2 status
pm2 monit
```

---

## 📚 Key Files

| File | Purpose | Edit? |
|------|---------|-------|
| `.env.local` | Configuration | ✏️ Yes |
| `services/weatherService.ts` | Weather API | Read only |
| `services/newsService.ts` | News API | Read only |
| `app/api/train/[trainNumber]/route.ts` | Main endpoint | Read only |
| `scripts/stableCollector.js` | Data collection | ✏️ Advanced |
| `scripts/initDb.js` | DB setup | Read only |
| `data/history.db` | Database | Don't edit |

---

## 🎯 Key Metrics to Monitor

**Every Startup:**
- [ ] Collector shows "Cycle 1, 2, 3..." (collecting data)
- [ ] API server shows "ready started server on localhost:3000"
- [ ] Test script shows "STATUS: OPERATIONAL"

**Every Hour:**
- [ ] No errors in Terminal 1 or 2 logs
- [ ] All 5 trains returning data
- [ ] Weather data is current (within 10 minutes)
- [ ] News articles are recent (within 24 hours)

**Daily:**
- [ ] Database size reasonable (< 100MB)
- [ ] API response times < 1 second
- [ ] No provider failures (or auto-recovery)
- [ ] Data quality rating is "GOOD"

---

## 📞 Quick Help

**Something not working?**
1. Check console output (look for errors)
2. Run test suite: `.\scripts\comprehensive-test.ps1`
3. Check health: `curl http://localhost:3000/api/admin/providers/status`
4. Check logs: Look above for "Troubleshooting" section
5. Reset: `rm data/history.db && node scripts/initDb.js && npm install`

**Need more help?**
- Read: [DEPLOYMENT.md](DEPLOYMENT.md) (complete guide)
- Read: [QUICKSTART.md](QUICKSTART.md) (setup guide)
- Read: [ARCHITECTURE.md](ARCHITECTURE.md) (system design)
- Check: [STATUS_REPORT.md](STATUS_REPORT.md) (system status)

---

## 🚀 Quick Command Reference

```bash
# Start everything (run in 3 separate terminals)
node scripts/stableCollector.js        # T1
npm run dev                            # T2
.\scripts\comprehensive-test.ps1       # T3

# API calls
curl http://localhost:3000/api/train/12955           # All data
curl http://localhost:3000/api/admin/providers/status # Health

# Database
node scripts/initDb.js                 # Reset DB
sqlite3 data/history.db                # Access DB

# Tests
.\scripts\comprehensive-test.ps1       # Full test

# Clean
rm -r node_modules && npm install      # Clean install
rm data/history.db                     # Reset data
```

---

**Last Updated:** March 11, 2026
**Status:** Production Ready
**Questions?** Check the documentation files
