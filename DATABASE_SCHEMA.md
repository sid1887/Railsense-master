# SQLite Database Schema & Analysis Guide

## Database Location
```
./data/railsense.db
```

## Quick Access
```bash
# Open database in SQLite CLI
sqlite3 data/railsense.db

# View tables
.tables

# View schema
.schema train_status_snapshots
```

---

## Table Schemas

### 1. train_status_snapshots
Real-time snapshots of train running status

```sql
CREATE TABLE train_status_snapshots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  train_number TEXT NOT NULL,
  train_name TEXT,
  current_status TEXT,
  last_reported_station_code TEXT,
  last_reported_station_name TEXT,
  delay_minutes INTEGER DEFAULT 0,
  distance_covered INTEGER,
  distance_remaining INTEGER,
  scheduled_arrival TEXT,
  actual_arrival TEXT,
  scheduled_departure TEXT,
  actual_departure TEXT,
  next_station_code TEXT,
  next_station_name TEXT,
  next_station_scheduled_arrival TEXT,
  next_station_expected_arrival TEXT,
  platform_number TEXT,
  collected_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  day_of_journey TEXT
);

CREATE INDEX idx_train_status_train_number
  ON train_status_snapshots(train_number);
CREATE INDEX idx_train_status_collected_at
  ON train_status_snapshots(collected_at);
```

**Typical Record:**
```
train_number: "12955"
train_name: "Intercity Express"
current_status: "Running"
delay_minutes: 12
distance_covered: 45 km
last_reported_station_name: "Virar"
next_station_name: "Vasai Road"
platform_number: "3"
```

---

### 2. train_route_segments
Segment-by-segment breakdown of train routes

```sql
CREATE TABLE train_route_segments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  train_number TEXT NOT NULL,
  train_name TEXT,
  from_station_code TEXT NOT NULL,
  from_station_name TEXT,
  to_station_code TEXT NOT NULL,
  to_station_name TEXT,
  sequence_from INTEGER,
  sequence_to INTEGER,
  distance_from_source INTEGER,
  segment_distance INTEGER,
  scheduled_departure TEXT,
  actual_departure TEXT,
  scheduled_arrival TEXT,
  actual_arrival TEXT,
  delay_at_segment INTEGER DEFAULT 0,
  halt_time_scheduled INTEGER,
  halt_time_actual INTEGER,
  collected_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_route_segments_train
  ON train_route_segments(train_number);
CREATE INDEX idx_route_segments_from_station
  ON train_route_segments(from_station_code);
CREATE INDEX idx_route_segments_to_station
  ON train_route_segments(to_station_code);
```

**Typical Record:**
```
from_station: "MMCT" → "VR" (Mumbai Central → Virar)
segment_distance: 45 km
scheduled_arrival: "09:35:00"
actual_arrival: "09:40:00"
delay_at_segment: 5 minutes
```

---

### 3. station_board_snapshots
Arrival/departure board for stations

```sql
CREATE TABLE station_board_snapshots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  station_code TEXT NOT NULL,
  station_name TEXT NOT NULL,
  train_number TEXT NOT NULL,
  train_name TEXT,
  event_type TEXT NOT NULL,  -- 'arrival' or 'departure'
  origin_station TEXT,
  destination_station TEXT,
  scheduled_time TEXT,
  expected_time TEXT,
  delay_minutes INTEGER DEFAULT 0,
  platform_number TEXT,
  status TEXT,  -- 'on_time', 'delayed', 'cancelled'
  collected_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_station_board_station
  ON station_board_snapshots(station_code);
CREATE INDEX idx_station_board_train
  ON station_board_snapshots(train_number);
CREATE INDEX idx_station_board_event
  ON station_board_snapshots(event_type);
CREATE INDEX idx_station_board_collected
  ON station_board_snapshots(collected_at);
```

**Typical Record:**
```
station: "VR" (Virar)
event_type: "arrival"
train_number: "12955"
scheduled_time: "10:35:00"
expected_time: "10:47:00"
delay_minutes: 12
```

---

## Useful Queries for Data Analysis

### Query 1: Average Delay by Train
```sql
SELECT
  train_number,
  train_name,
  COUNT(*) as snapshots,
  AVG(delay_minutes) as avg_delay,
  MAX(delay_minutes) as max_delay,
  MIN(delay_minutes) as min_delay,
  ROUND(AVG(delay_minutes), 2) as variance
FROM train_status_snapshots
GROUP BY train_number
ORDER BY avg_delay DESC;
```

**Use Case:** Identify most problematic trains for priority monitoring

---

### Query 2: Delay Progression During Journey
```sql
SELECT
  train_number,
  from_station_name,
  to_station_name,
  sequence_from,
  segment_distance,
  ROUND(AVG(delay_at_segment), 2) as avg_delay,
  COUNT(*) as observations
FROM train_route_segments
WHERE train_number = '12955'
GROUP BY from_station_code, to_station_code
ORDER BY sequence_from;
```

**Use Case:** See how delays accumulate/recover across segments

---

### Query 3: Station Congestion Level
```sql
SELECT
  station_code,
  station_name,
  COUNT(*) as total_trains,
  SUM(CASE WHEN event_type='arrival' THEN 1 ELSE 0 END) as arrivals,
  SUM(CASE WHEN event_type='departure' THEN 1 ELSE 0 END) as departures,
  ROUND(AVG(delay_minutes), 2) as avg_delay,
  SUM(CASE WHEN delay_minutes > 0 THEN 1 ELSE 0 END) as delayed_trains
FROM station_board_snapshots
GROUP BY station_code
ORDER BY total_trains DESC;
```

**Use Case:** Identify busy stations and congestion hotspots

---

### Query 4: Peak Hours at a Station
```sql
SELECT
  station_code,
  station_name,
  strftime('%H', collected_at) as hour,
  COUNT(*) as train_count,
  ROUND(AVG(delay_minutes), 1) as avg_delay
FROM station_board_snapshots
GROUP BY station_code, hour
ORDER BY train_count DESC;
```

**Use Case:** Understand busiest times and plan platform allocation

---

### Query 5: Segment Performance Analysis
```sql
SELECT
  from_station_name || ' → ' || to_station_name as segment,
  segment_distance as distance_km,
  COUNT(*) as trips,
  ROUND(AVG(CAST((julianday(actual_arrival) - julianday(actual_departure)) * 24 * 60 AS FLOAT)), 1) as actual_time_minutes,
  ROUND(AVG(CAST((julianday(scheduled_arrival) - julianday(scheduled_departure)) * 24 * 60 AS FLOAT)), 1) as scheduled_time_minutes,
  ROUND(AVG(delay_at_segment), 1) as avg_delay
FROM train_route_segments
GROUP BY from_station_code, to_station_code
HAVING COUNT(*) > 5
ORDER BY avg_delay DESC;
```

**Use Case:** Find bottleneck segments, optimize railways management

---

### Query 6: Train Classification by Reliability
```sql
WITH train_stats AS (
  SELECT
    train_number,
    train_name,
    COUNT(*) as total_snapshots,
    ROUND(AVG(delay_minutes), 2) as avg_delay,
    ROUND(STDDEV_POP(delay_minutes), 2) as delay_std_dev
  FROM train_status_snapshots
  GROUP BY train_number
)
SELECT
  train_number,
  train_name,
  CASE
    WHEN avg_delay < 5 AND delay_std_dev < 3 THEN 'Reliable'
    WHEN avg_delay < 10 AND delay_std_dev < 8 THEN 'Predictable'
    WHEN avg_delay >= 10 THEN 'Problematic'
    ELSE 'Unusual'
  END as reliability_class,
  total_snapshots,
  avg_delay,
  delay_std_dev
FROM train_stats
ORDER BY reliability_class;
```

**Use Case:** Classify trains for ML model training prioritization

---

### Query 7: Data Collection Progress
```sql
SELECT
  'train_status_snapshots' as table_name,
  COUNT(*) as total_records,
  COUNT(DISTINCT train_number) as unique_trains,
  MIN(collected_at) as first_record,
  MAX(collected_at) as latest_record,
  CAST(julianday('now') - julianday(MAX(collected_at)) AS INTEGER) as hours_since_latest
FROM train_status_snapshots

UNION ALL

SELECT
  'train_route_segments',
  COUNT(*),
  COUNT(DISTINCT train_number),
  MIN(collected_at),
  MAX(collected_at),
  CAST(julianday('now') - julianday(MAX(collected_at)) AS INTEGER)
FROM train_route_segments

UNION ALL

SELECT
  'station_board_snapshots',
  COUNT(*),
  COUNT(DISTINCT station_code),
  MIN(collected_at),
  MAX(collected_at),
  CAST(julianday('now') - julianday(MAX(collected_at)) AS INTEGER)
FROM station_board_snapshots;
```

**Use Case:** Monitor data collection pipeline health

---

### Query 8: ML Training Data Quality Check
```sql
SELECT
  'train_status' as data_type,
  COUNT(*) as total_records,
  COUNT(DISTINCT train_number) as unique_trains,
  SUM(CASE WHEN delay_minutes IS NULL THEN 1 ELSE 0 END) as null_counts,
  ROUND(100.0 * SUM(CASE WHEN delay_minutes IS NULL THEN 1 ELSE 0 END) / COUNT(*), 2) as null_percentage,
  ROUND(AVG(delay_minutes), 2) as avg_delay,
  ROUND(STDDEV_POP(delay_minutes), 2) as delay_variance
FROM train_status_snapshots

UNION ALL

SELECT
  'route_segments',
  COUNT(*),
  COUNT(DISTINCT train_number),
  SUM(CASE WHEN delay_at_segment IS NULL THEN 1 ELSE 0 END),
  ROUND(100.0 * SUM(CASE WHEN delay_at_segment IS NULL THEN 1 ELSE 0 END) / COUNT(*), 2),
  ROUND(AVG(delay_at_segment), 2),
  ROUND(STDDEV_POP(delay_at_segment), 2)
FROM train_route_segments

UNION ALL

SELECT
  'station_boards',
  COUNT(*),
  COUNT(DISTINCT station_code),
  SUM(CASE WHEN delay_minutes IS NULL THEN 1 ELSE 0 END),
  ROUND(100.0 * SUM(CASE WHEN delay_minutes IS NULL THEN 1 ELSE 0 END) / COUNT(*), 2),
  ROUND(AVG(delay_minutes), 2),
  ROUND(STDDEV_POP(delay_minutes), 2)
FROM station_board_snapshots;
```

**Use Case:** Validate data quality before ML training (check for NULL values, variance)

---

## Advanced Analysis Queries

### Query 9: Predict Next Delay (ML Feature Engineering)
```sql
SELECT
  t1.train_number,
  t1.train_name,
  t1.last_reported_station_name as current_station,
  t1.delay_minutes as current_delay,
  LAG(t1.delay_minutes) OVER (
    PARTITION BY t1.train_number
    ORDER BY t1.collected_at
  ) as previous_delay,
  LEAD(t1.delay_minutes) OVER (
    PARTITION BY t1.train_number
    ORDER BY t1.collected_at
  ) as next_delay,
  ROUND(AVG(t1.delay_minutes) OVER (
    PARTITION BY t1.train_number
    ORDER BY t1.collected_at
    ROWS BETWEEN 2 PRECEDING AND CURRENT ROW
  ), 2) as moving_avg_delay
FROM train_status_snapshots t1
ORDER BY t1.train_number, t1.collected_at DESC;
```

**Use Case:** Create lagged features for time-series ML models

---

### Query 10: Station Dwell Time Analysis
```sql
SELECT
  station_code,
  station_name,
  train_number,
  COUNT(*) as events,
  GROUP_CONCAT(DISTINCT event_type) as event_types,
  ROUND(AVG(CAST((julianday(expected_time) - julianday(scheduled_time)) * 24 * 60 AS FLOAT)), 1) as avg_expected_vs_scheduled_minutes
FROM station_board_snapshots
GROUP BY station_code, train_number
HAVING COUNT(*) >= 2
ORDER BY avg_expected_vs_scheduled_minutes DESC;
```

**Use Case:** Analyze how long trains stay at stations

---

## Data Export for ML

### Export Training Data to CSV
```sql
-- For delay prediction models
SELECT
  ts.train_number,
  ts.train_name,
  ts.delay_minutes as target,
  ts.distance_covered,
  ts.distance_remaining,
  ts.platform_number,
  strftime('%H', ts.collected_at) as hour_of_day,
  strftime('%w', ts.collected_at) as day_of_week,
  (SELECT COUNT(*) FROM station_board_snapshots
   WHERE station_code = ts.last_reported_station_code) as station_popularity
FROM train_status_snapshots ts
WHERE ts.delay_minutes IS NOT NULL
ORDER BY RANDOM()
LIMIT 10000;
-- Export as CSV using: .mode csv > train_data.csv
```

---

## Database Maintenance

### Check Database Health
```sql
-- Check for corruption
PRAGMA integrity_check;

-- Table sizes
SELECT
  name,
  (SELECT COUNT(*) FROM train_status_snapshots) as train_status_count,
  (SELECT COUNT(*) FROM train_route_segments) as route_segment_count,
  (SELECT COUNT(*) FROM station_board_snapshots) as station_board_count;
```

### Backup Database
```bash
cp data/railsense.db data/railsense.backup.$(date +%Y%m%d_%H%M%S).db
```

### Optimize Database
```sql
VACUUM;  -- Reclaim unused space
ANALYZE;  -- Update statistics for query optimizer
REINDEX;  -- Rebuild all indexes
```

### Archive Old Data (Optional - 90+ days)
```sql
-- Archive old train status to separate table
CREATE TABLE train_status_archived AS
SELECT * FROM train_status_snapshots
WHERE collected_at < date('now', '-90 days');

DELETE FROM train_status_snapshots
WHERE collected_at < date('now', '-90 days');
```

---

## Troubleshooting

### "database is locked" Error
```sql
-- Kill long-running queries
-- Solution: Restart Node.js application
-- npm run dev
```

### Query Slow Performance
```sql
-- Rebuild indexes
REINDEX;

-- Update statistics
ANALYZE;

-- Check query plan
EXPLAIN QUERY PLAN SELECT ...;
```

### Disk Space Issues
```bash
# Check database file size
ls -lh data/railsense.db

# Clean up old data
sqlite3 data/railsense.db "DELETE FROM train_status_snapshots WHERE collected_at < date('now', '-30 days');"
```

---

**Last Updated:** March 2026 | **Version:** 1.0
