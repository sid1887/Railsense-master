# RailSense v2.0 Deployment Guide

## 📌 Quick Start

**For normal NPM-based development and deployment:**
→ See [DEPLOYMENT_NPM.md](./DEPLOYMENT_NPM.md)

**Quick commands:**
```bash
npm install
npm run dev                    # Development
npm run build && npm start     # Production
```

---

## Complete System Architecture (March 2026)

This deployment guide covers the full-stack RailSense system including weather integration and real-time data enrichment.

### Note on Docker
Docker deployment is currently dormant/optional. For production, use npm-based deployment as documented in [DEPLOYMENT_NPM.md](./DEPLOYMENT_NPM.md).

## Prerequisites

- Node.js 18+
- npm or yarn
- SQLite 3
- Internet connection (for weather API and news feeds)
- OpenWeatherMap API key (provided: `b6054a812f7c020b3c0de08c40783728`)

## Step 1: Environment Setup

### 1.1 Install Dependencies
```bash
cd c:\Railsense
npm install
npm install better-sqlite3 --save
npm install ts-node --save-dev
```

### 1.2 Configure Environment Variables

The `.env.local` file already contains the necessary configuration:

```bash
# OpenWeatherMap API
OPENWEATHER_API_KEY=b6054a812f7c020b3c0de08c40783728

# Train Tracking
TRACKED_TRAINS=12955,12728,17015,12702,11039
COLLECT_INTERVAL=30

# Database
DB_PATH=data/history.db

# Server
NEXT_PUBLIC_API_BASE_URL=http://localhost:3000/api
```

## Step 2: Database Initialization

### 2.1 Create Data Directory
```bash
mkdir -p c:\Railsense\data
```

### 2.2 Initialize Database Schema
```bash
node scripts/initDb.js
```

Expected output:
```
[DB Init] ✓ train_snapshots table ready
[DB Init] ✓ Index: idx_train_timestamp
[DB Init] ✓ Index: idx_section_timestamp
[DB Init] ✓ Index: idx_timestamp
[DB Init] ✓ Database initialization complete
```

## Step 3: Start System Components

### 3.1 Terminal 1: Collector Worker
```bash
# Start the background data collection worker
node scripts/stableCollector.js
```

Expected output:
```
[Collector] Initializing database...
[Collector] Starting collection cycle every 30 seconds
[Collector] Tracking trains: 12955, 12728, 17015, 17015, 12702, 11039
[Collector] ✓ Cycle 1: 5/5 trains collected
[Collector] Cycle 1 stats: total=5, avg_speed=45.2, avg_delay=2.3
```

### 3.2 Terminal 2: Next.js Development Server
```bash
# Start the API and web server
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

### 3.3 Terminal 3: Validation (Optional)
```bash
# Verify all systems are operational
node scripts/validate.js
```

## Step 4: Verify Deployment

### 4.1 Quick Health Check
```powershell
# Run comprehensive system test
.\scripts\comprehensive-test.ps1
```

### 4.2 Manual API Tests
```bash
# Test train data endpoint
curl http://localhost:3000/api/train/12955 | jq .

# Check provider health
curl http://localhost:3000/api/admin/providers/status | jq .

# Verify weather integration
curl http://localhost:3000/api/train/12955 | jq '.enrichment.weather'

# Check news enrichment
curl http://localhost:3000/api/train/12955 | jq '.enrichment.news'
```

### 4.3 Test Individual Components

**Check Database:**
```bash
sqlite3 c:\Railsense\data\history.db "SELECT COUNT(*) FROM train_snapshots;"
```

**Check Collector Status:**
```bash
sqlite3 c:\Railsense\data\history.db "SELECT MAX(timestamp) as latest FROM train_snapshots;"
```

**Check Weather Service:**
```bash
# Should return actual weather data
curl "http://localhost:3000/api/train/12955" | jq '.enrichment.weather.temperature'
```

## Complete API Response Structure

The `/api/train/:trainNumber` endpoint returns comprehensive data:

```json
{
  "trainNumber": "12955",
  "timestamp": 1710156000000,

  "position": {
    "lat": 19.076,
    "lng": 72.878,
    "speed": 45.5,
    "accuracy_m": 85,
    "timestamp": 1710156000000
  },

  "section": {
    "section_id": null,
    "station_index": 5,
    "current_station": "Mumbai Central",
    "next_station": "Thane",
    "distance_to_next_m": 25000
  },

  "halt": {
    "detected": false,
    "duration_sec": 0,
    "is_scheduled": false,
    "confidence": 0.95,
    "reason_candidates": []
  },

  "nearby": {
    "count": 2,
    "trains": [
      {
        "trainNumber": "12625",
        "lat": 19.075,
        "lng": 72.879,
        "distance_m": 450,
        "speed": 38
      }
    ],
    "congestion_level": "MEDIUM"
  },

  "prediction": {
    "wait_time_min": { "min": 0, "max": 5 },
    "confidence": 0.85,
    "method": "moving-train"
  },

  "enrichment": {
    "weather": {
      "temperature": 28.5,
      "condition": "Partly Cloudy",
      "humidity": 65,
      "wind_speed": 3.2,
      "visibility_m": 10000,
      "precipitation_mm": 0,
      "impact": {
        "severity": "none",
        "affects": [],
        "reason": "No significant weather impact"
      }
    },
    "news": [
      {
        "title": "Mumbai-Pune corridor experiencing peak traffic",
        "source": "Google News",
        "link": "https://...",
        "relevance": 0.8
      }
    ]
  },

  "metadata": {
    "source": ["ntes", "railyatri"],
    "last_update_ago_sec": 3,
    "data_quality": "GOOD",
    "sample_count_1h": 120
  }
}
```

## Production Deployment

### Systemd Service (Linux)

Create `/etc/systemd/system/railsense-collector.service`:

```ini
[Unit]
Description=RailSense Snapshot Collector
After=network.target

[Service]
Type=simple
User=railsense
WorkingDirectory=/opt/railsense
ExecStart=/usr/bin/node scripts/stableCollector.js
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Start service:
```bash
sudo systemctl start railsense-collector
sudo systemctl enable railsense-collector
```

### PM2 Process Manager (All Platforms)

Install PM2:
```bash
npm install -g pm2
```

Create `ecosystem.config.js`:
```javascript
module.exports = {
  apps: [
    {
      name: 'railsense-collector',
      script: 'scripts/stableCollector.js',
      instances: 1,
      exec_mode: 'fork',
      error_file: 'logs/collector-error.log',
      out_file: 'logs/collector-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      env: {
        NODE_ENV: 'production'
      }
    },
    {
      name: 'railsense-api',
      script: 'npm',
      args: 'run start',
      instances: 'max',
      exec_mode: 'cluster',
      error_file: 'logs/api-error.log',
      out_file: 'logs/api-out.log',
      env: {
        NODE_ENV: 'production'
      }
    }
  ]
};
```

Start with PM2:
```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

## Monitoring & Maintenance

### Daily Health Checks

```bash
# Check collector activity
sqlite3 data/history.db "SELECT COUNT(*) as snapshots_24h FROM train_snapshots WHERE timestamp > $(date +%s%3N) - 86400000;"

# Check data quality
curl http://localhost:3000/api/admin/providers/status | jq '.dataQuality'

# Monitor database size
ls -lh data/history.db
```

### Weekly Maintenance

```bash
# Archive old snapshots (older than 7 days)
sqlite3 data/history.db "DELETE FROM train_snapshots WHERE timestamp < $(date +%s%3N) - 604800000;"

# Optimize database
sqlite3 data/history.db "VACUUM;"

# Backup database
cp data/history.db "data/backup-$(date +%Y%m%d).db"
```

### Weather Service Troubleshooting

If weather data is unavailable:

1. Verify API key is correct
2. Check network connectivity
3. Test API directly:
   ```bash
   curl "https://api.openweathermap.org/data/2.5/weather?lat=19.076&lon=72.878&appid=KEY&units=metric"
   ```
4. Check rate limits (free tier: 60 calls/min)

### News Service Troubleshooting

If news articles aren't showing:

1. Check internet connection
2. Verify Google News RSS is accessible
3. Check for URL encoding issues
4. Review news service logs

## Configuration Tuning

### For Higher Accuracy
- Reduce `COLLECT_INTERVAL` from 30s to 15s
- Increase providers if available
- Add more halt detection window size (default 8 samples)

### For Lower Resource Usage
- Increase `COLLECT_INTERVAL` to 60s
- Reduce weather cache TTL from 10min to 1min (less responsive but saves API calls)
- Limit news fetch frequency

### For Better Performance
- Add database indexes: `CREATE INDEX idx_performance ON train_snapshots(train_number, timestamp DESC);`
- Enable query caching in application
- Use connection pooling for database

## Security Notes

- Restrict API access with authentication if exposed publicly
- Rotate API keys regularly
- Implement rate limiting on endpoints
- Use HTTPS in production
- Sanitize user inputs for train numbers

## Rollback Procedure

If issues occur:

```bash
# Stop all services
killall node
npm run kill

# Restore database from backup
cp data/backup-20260310.db data/history.db

# Restart with fresh state
node scripts/initDb.js
npm run dev
```

## Support & Troubleshooting

For detailed troubleshooting, see:
- `ARCHITECTURE.md` - System design and data flow
- `OPERATIONS.md` - Runtime management
- `FRONTEND_INTEGRATION.md` - UI integration

## Performance Baseline

Expected metrics when properly deployed:

| Metric | Value |
|--------|-------|
| API Response Time | 400-600ms |
| Weather API Call | 200-500ms |
| News Fetch | 1-3 seconds |
| Database Query | 20-50ms |
| Provider Latency | 100-300ms |
| Collector Cycle Time | 30 seconds |
| Data Freshness | <30 seconds |
| System Uptime | >99.5% |

## Next Steps

1. ✅ Deploy system
2. ✅ Run comprehensive tests
3. ✅ Verify all integrations
4. ⏳ Configure monitoring alerts
5. ⏳ Set up log aggregation
6. ⏳ Prepare for scale-out

---

**Deployment Status:** Ready for Production
**Last Updated:** March 11, 2026
**Tested Components:** All endpoints + weather + news enrichment
