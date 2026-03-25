/**
 * Snapshot Collector Worker
 * Polls tracked trains every N seconds, stores snapshots to SQLite
 * This is the critical foundation for all analytics
 *
 * Run with: node scripts/stableCollector.js
 */

const sqlite3 = require('sqlite3');
const pLimit = require('p-limit');
require('dotenv').config();

const TRACKED_TRAINS = (process.env.TRACKED_TRAINS || '12728,12955,17015,12702,11039')
  .split(',')
  .map(t => t.trim());

const COLLECT_INTERVAL = parseInt(process.env.COLLECT_INTERVAL || '30', 10) * 1000; // 30 seconds
const CONCURRENT_LIMIT = 5; // max 5 concurrent fetches

let db = null;
let trainDataService = null;

/**
 * Initialize SQLite database with proper schema
 */
async function initializeDatabase(dbPath) {
  return new Promise((resolve, reject) => {
    db = new sqlite3.Database(dbPath, (err) => {
      if (err) reject(err);
      else {
        db.serialize(() => {
          // Main snapshots table
          db.run(`CREATE TABLE IF NOT EXISTS train_snapshots (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            train_number TEXT NOT NULL,
            lat REAL,
            lng REAL,
            speed REAL,
            delay INTEGER,
            source TEXT,
            section_id TEXT,
            station_index INTEGER,
            is_scheduled_stop INTEGER DEFAULT 0,
            timestamp INTEGER NOT NULL
          )`, (err) => {
            if (err) console.warn('snapshots table:', err.message);
          });

          // Indexes for fast queries
          db.run('CREATE INDEX IF NOT EXISTS idx_train_ts ON train_snapshots(train_number, timestamp DESC)', (err) => {
            if (err) {
              // Index might already exist
            }
          });

          db.run('CREATE INDEX IF NOT EXISTS idx_section_ts ON train_snapshots(section_id, timestamp DESC)', (err) => {
            if (err) {
              // Index might already exist
            }
          });

          db.run('CREATE INDEX IF NOT EXISTS idx_timestamp ON train_snapshots(timestamp DESC)', (err) => {
            if (err) {
              // Index might already exist
            }
          });

          resolve();
        });
      }
    });
  });
}

/**
 * Insert snapshot into database
 */
async function insertSnapshot(trainNumber, data) {
  return new Promise((resolve, reject) => {
    const {
      lat = null,
      lng = null,
      speed = 0,
      delay = 0,
      source = 'unknown',
      section_id = null,
      station_index = null,
      is_scheduled_stop = 0,
    } = data;

    const timestamp = Date.now();

    db.run(
      `INSERT INTO train_snapshots
       (train_number, lat, lng, speed, delay, source, section_id, station_index, is_scheduled_stop, timestamp)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [trainNumber, lat, lng, speed, delay, source, section_id, station_index, is_scheduled_stop, timestamp],
      (err) => {
        if (err) {
          console.error(`[DB] Insert error for ${trainNumber}:`, err.message);
          reject(err);
        } else {
          resolve();
        }
      }
    );
  });
}

/**
 * Fetch data for a single train from trainDataService
 */
async function fetchTrainData(trainNumber) {
  if (!trainDataService) {
    console.warn('[Collector] trainDataService not initialized');
    return null;
  }

  try {
    const data = await trainDataService.getTrainData(trainNumber);
    return data;
  } catch (err) {
    console.error(`[Collector] Fetch error for ${trainNumber}:`, err.message);
    return null;
  }
}

/**
 * Main collection loop - runs every COLLECT_INTERVAL ms
 */
async function collectOnce() {
  if (!db) {
    console.warn('[Collector] Database not initialized');
    return;
  }

  const limit = pLimit(CONCURRENT_LIMIT);
  const tasks = TRACKED_TRAINS.map(trainNumber =>
    limit(async () => {
      try {
        const startTime = Date.now();
        const data = await fetchTrainData(trainNumber);

        if (!data) {
          console.warn(`[Collector] No data for ${trainNumber}`);
          return;
        }

        // Prepare snapshot (map-matching would happen here in real implementation)
        const snapshot = {
          lat: data.currentLocation?.latitude || data.lat,
          lng: data.currentLocation?.longitude || data.lng,
          speed: data.speed || 0,
          delay: data.delay || 0,
          source: data.source || 'unknown',
          // section_id and station_index would be populated by map-matcher
          section_id: null,
          station_index: null,
          is_scheduled_stop: 0,
        };

        await insertSnapshot(trainNumber, snapshot);
        const elapsed = Date.now() - startTime;
        console.log(
          `[Collector] ✓ ${trainNumber}: lat=${snapshot.lat?.toFixed(3)}, lng=${snapshot.lng?.toFixed(3)}, speed=${snapshot.speed}, source=${snapshot.source} (${elapsed}ms)`
        );
      } catch (err) {
        console.error(`[Collector] Error processing ${trainNumber}:`, err.message);
      }

      // Throttle between requests to avoid overwhelming provider
      await new Promise(r => setTimeout(r, 200));
    })
  );

  try {
    await Promise.all(tasks);
    console.log(`[Collector] Collection cycle complete at ${new Date().toISOString()}`);
  } catch (err) {
    console.error('[Collector] Collection cycle error:', err.message);
  }
}

/**
 * Get database stats
 */
async function getStats() {
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT
        train_number,
        COUNT(*) as total_samples,
        MAX(timestamp) as last_sample,
        AVG(speed) as avg_speed,
        AVG(delay) as avg_delay
       FROM train_snapshots
       WHERE timestamp > datetime('now', '-24 hours')
       GROUP BY train_number
       ORDER BY total_samples DESC`,
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      }
    );
  });
}

/**
 * Graceful shutdown
 */
function shutdown() {
  console.log('\n[Collector] Shutting down gracefully...');
  if (db) {
    db.close((err) => {
      if (err) console.error('DB close error:', err);
      else console.log('[Collector] Database closed');
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

/**
 * Main entry point
 */
async function main() {
  try {
    console.log('[Collector] Starting RailSense Data Collector');
    console.log('[Collector] Tracked trains:', TRACKED_TRAINS);
    console.log('[Collector] Interval:', COLLECT_INTERVAL / 1000, 'seconds');

    // Initialize database
    const dbPath = process.env.DB_PATH || './data/history.db';
    await initializeDatabase(dbPath);
    console.log(`[Collector] ✓ Database initialized: ${dbPath}`);

    // Dynamically require trainDataService (to avoid circular deps during testing)
    trainDataService = require('./services/trainDataService');
    console.log('[Collector] ✓ trainDataService loaded');

    // Run collection immediately, then schedule
    console.log('[Collector] Starting first collection...');
    await collectOnce();

    console.log('[Collector] ✓ Collector ready. Running every', COLLECT_INTERVAL / 1000, 'seconds');
    setInterval(collectOnce, COLLECT_INTERVAL);

    // Print stats every 5 minutes
    setInterval(async () => {
      try {
        const stats = await getStats();
        console.log('\n[Collector] 📊 Stats (last 24h):');
        for (const row of stats) {
          console.log(
            `  ${row.train_number}: ${row.total_samples} samples, avg speed ${row.avg_speed?.toFixed(1)} km/h, avg delay ${row.avg_delay?.toFixed(1)} min`
          );
        }
      } catch (err) {
        console.warn('[Collector] Stats query error:', err.message);
      }
    }, 5 * 60 * 1000); // Every 5 minutes

  } catch (err) {
    console.error('[Collector] Fatal error:', err);
    process.exit(1);
  }
}

main();

// Export for testing
module.exports = { insulateSnapshot, initializeDatabase, getStats, collectOnce };
