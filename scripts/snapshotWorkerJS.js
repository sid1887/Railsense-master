#!/usr/bin/env node
/**
 * Snapshot Worker (JavaScript version)
 * Collects train data and stores in SQLite for heatmap/analysis
 * Run: node scripts/snapshotWorkerJS.js
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const https = require('https');

// Configuration
const TRACKED_TRAINS = (process.env.TRACKED_TRAINS || '12728,12955,17015,12702,11039').split(',');
const COLLECT_INTERVAL = parseInt(process.env.COLLECT_INTERVAL || '30', 10) * 1000;
const DATA_DIR = path.join(__dirname, '../data');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_PATH = path.join(DATA_DIR, 'history.db');
let db = null;

// Initialize database
function initDB() {
  return new Promise((resolve, reject) => {
    db = new sqlite3.Database(DB_PATH, (err) => {
      if (err) {
        console.error('[DB] Error:', err);
        reject(err);
      } else {
        console.log('[DB] Connected to', DB_PATH);

        // Enable WAL mode
        db.run('PRAGMA journal_mode = WAL', (err) => {
          if (err) console.warn('[DB] WAL mode error:', err);

          // Create tables
          db.exec(`
            CREATE TABLE IF NOT EXISTS train_snapshots (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              train_number TEXT NOT NULL,
              lat REAL,
              lng REAL,
              speed REAL,
              delay REAL,
              timestamp INTEGER NOT NULL,
              source TEXT,
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE INDEX IF NOT EXISTS idx_train_ts
            ON train_snapshots(train_number, timestamp DESC);

            CREATE INDEX IF NOT EXISTS idx_ts
            ON train_snapshots(timestamp DESC);
          `, (err) => {
            if (err) console.warn('[DB] Schema error:', err);
            console.log('[DB] ✓ Schema ready');
            resolve(db);
          });
        });
      }
    });
  });
}

// Fetch data from local API
function fetchTrainData(trainNumber) {
  return new Promise((resolve) => {
    const apiUrl = `http://localhost:3000/api/train-details?trainNumber=${trainNumber}`;
    let responseData = '';

    // Try HTTP first (dev server typically on HTTP)
    const protocol = require('http');

    try {
      const req = protocol.get(apiUrl, { timeout: 8000 }, (res) => {
        res.on('data', chunk => responseData += chunk);
        res.on('end', () => {
          try {
            const json = JSON.parse(responseData);
            if (json && json.trainData) {
              resolve({
                trainNumber,
                lat: json.trainData.currentLocation?.latitude,
                lng: json.trainData.currentLocation?.longitude,
                speed: json.trainData.speed || 0,
                delay: json.trainData.delay || 0,
                source: json.trainData.source || 'unknown'
              });
            } else {
              resolve(null);
            }
          } catch (e) {
            console.warn(`[API] Parse error for ${trainNumber}:`, e.message);
            resolve(null);
          }
        });
      });

      req.on('error', (err) => {
        console.warn(`[API] Error fetching ${trainNumber}:`, err.message);
        resolve(null);
      });

      req.on('timeout', () => {
        req.destroy();
        console.warn(`[API] Timeout for ${trainNumber}`);
        resolve(null);
      });
    } catch (err) {
      console.warn(`[API] Request error for ${trainNumber}:`, err.message);
      resolve(null);
    }
  });
}

// Insert snapshot into DB
function insertSnapshot(data) {
  return new Promise((resolve) => {
    if (!db || !data) {
      resolve(false);
      return;
    }

    const sql = `
      INSERT INTO train_snapshots
      (train_number, lat, lng, speed, delay, timestamp, source)
      VALUES (?,?,?,?,?,?,?)
    `;

    db.run(sql, [
      data.trainNumber,
      data.lat || null,
      data.lng || null,
      data.speed || 0,
      data.delay || 0,
      Date.now(),
      data.source || 'unknown'
    ], function(err) {
      if (err) {
        console.error(`[DB] Insert error for ${data.trainNumber}:`, err.message);
        resolve(false);
      } else {
        resolve(true);
      }
    });
  });
}

// Collect one cycle
async function collectCycle() {
  console.log(`\n[${new Date().toISOString()}] Starting collection for ${TRACKED_TRAINS.length} trains...`);

  let successCount = 0;
  let failCount = 0;

  for (const trainNumber of TRACKED_TRAINS) {
    const tn = trainNumber.trim();
    if (!tn) continue;

    try {
      const data = await fetchTrainData(tn);
      if (data) {
        const inserted = await insertSnapshot(data);
        if (inserted) {
          console.log(`  ✓ ${tn} - lat=${data.lat?.toFixed(2)}, delay=${data.delay}min, source=${data.source}`);
          successCount++;
        } else {
          failCount++;
        }
      } else {
        console.warn(`  ✗ ${tn} - No data`);
        failCount++;
      }
    } catch (err) {
      console.error(`  ✗ ${tn} - Error:`, err.message || err);
      failCount++;
    }

    // Small delay between requests
    await new Promise(r => setTimeout(r, 300));
  }

  console.log(`[Collection] Complete - Success: ${successCount}, Failed: ${failCount}`);

  // Log stats
  if (db) {
    db.get('SELECT COUNT(*) as cnt FROM train_snapshots', (err, row) => {
      if (!err && row) {
        console.log(`[DB Stats] Total snapshots: ${row.cnt}`);
      }
    });
  }
}

// Main loop
async function main() {
  console.log('=== Snapshot Worker (JavaScript) ===');
  console.log(`Tracked trains: ${TRACKED_TRAINS.join(', ')}`);
  console.log(`Collection interval: ${COLLECT_INTERVAL / 1000}s`);

  try {
    await initDB();

    // Initial collection
    await collectCycle();

    // Set up interval
    setInterval(collectCycle, COLLECT_INTERVAL);
    console.log(`\n✓ Worker running... (Ctrl+C to stop)`);
  } catch (err) {
    console.error('Fatal error:', err);
    process.exit(1);
  }
}

// Handle shutdown
process.on('SIGINT', () => {
  console.log('\n[Shutdown] Closing worker...');
  if (db) {
    db.close((err) => {
      if (err) console.error('DB close error:', err);
      console.log('[Shutdown] Complete');
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
});

// Start
main().catch(err => {
  console.error('Worker failed:', err);
  process.exit(1);
});
