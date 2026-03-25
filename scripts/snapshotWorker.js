/**
 * Snapshot Worker (JavaScript version)
 * Collects periodic train snapshots and stores in SQLite database
 */

require('dotenv').config();
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Use dynamic import for ESM modules (trainDataService is ESM)
const getTrainDataAsync = async (trainNumber) => {
  // Since trainDataService is TypeScript/ESM, we'll use HTTP API instead
  const fetch = (await import('node-fetch')).default;
  try {
    const response = await fetch(`http://localhost:3000/api/train-details?trainNumber=${trainNumber}`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    return data.trainData;
  } catch (e) {
    console.error(`Failed to fetch ${trainNumber}:`, e.message);
    return null;
  }
};

// Configuration
const TRACKED = (process.env.TRACKED_TRAINS || '12728,12955,17015,12702,11039').split(',');
const COLLECT_INTERVAL = parseInt(process.env.COLLECT_INTERVAL || '30', 10) * 1000;
const DATA_DIR = path.join(process.cwd(), 'data');

// Ensure data directory
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_PATH = path.join(DATA_DIR, 'history.db');
let db = null;

async function initDb() {
  return new Promise((resolve, reject) => {
    db = new sqlite3.Database(DB_PATH, (err) => {
      if (err) {
        console.error('[DB] Init error:', err);
        reject(err);
        return;
      }

      // Enable WAL mode
      db.run('PRAGMA journal_mode = WAL', () => {
        db.run('PRAGMA foreign_keys = ON', () => {
          // Create table
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
          `, (err) => {
            if (err) {
              console.error('[DB] Create table error:', err);
              reject(err);
              return;
            }

            // Create indexes
            db.exec(`
              CREATE INDEX IF NOT EXISTS idx_train_ts ON train_snapshots(train_number, timestamp DESC);
              CREATE INDEX IF NOT EXISTS idx_ts ON train_snapshots(timestamp DESC);
            `, (err) => {
              if (err) console.warn('[DB] Index creation warning:', err);
              console.log('[DB] ✓ Initialized');
              resolve(db);
            });
          });
        });
      });
    });
  });
}

async function collectSnapshots() {
  if (!db) return;

  const timestamp = new Date().toISOString();
  console.log(`\n[${timestamp}] Starting snapshot collection (${TRACKED.length} trains)...`);

  let success = 0, fail = 0;

  for (const train of TRACKED) {
    const tn = train.trim();
    if (!tn) continue;

    try {
      const data = await getTrainDataAsync(tn);
      if (!data) {
        console.warn(`  ✗ ${tn} - No data`);
        fail++;
        continue;
      }

      const ts = Date.now();
      const lat = data.currentLocation?.latitude ?? null;
      const lng = data.currentLocation?.longitude ?? null;
      const speed = data.speed ?? 0;
      const delay = data.delay ?? 0;
      const source = data.source ?? 'unknown';

      db.run(`
        INSERT INTO train_snapshots (train_number, lat, lng, speed, delay, timestamp, source)
        VALUES (?,?,?,?,?,?,?)
      `, [tn, lat, lng, speed, delay, ts, source], (err) => {
        if (err) console.error(`  ✗ ${tn} - DB error:`, err.message);
        else console.log(`  ✓ ${tn} - delay=${delay}min, source=${source}`);
      });

      success++;
    } catch (e) {
      console.error(`  ✗ ${tn} - Error:`, e.message);
      fail++;
    }

    // Stagger requests
    await new Promise(r => setTimeout(r, 300));
  }

  console.log(`[Collection] Complete - Success: ${success}, Failed: ${fail}`);

  // Log DB stats
  if (db) {
    db.get('SELECT COUNT(*) as cnt FROM train_snapshots', (err, row) => {
      if (!err && row) {
        console.log(`[DB] Total snapshots: ${row.cnt}`);
      }
    });
  }
}

async function main() {
  try {
    console.log('=== Snapshot Worker Started ===');
    console.log(`Tracked trains: ${TRACKED.length}`);
    console.log(`Collection interval: ${COLLECT_INTERVAL / 1000}s`);
    console.log(`Database: ${DB_PATH}`);

    await initDb();

    // Initial collection
    await collectSnapshots();

    // Periodic collection
    setInterval(collectSnapshots, COLLECT_INTERVAL);
    console.log('✓ Periodic collection started');
    console.log('Worker running... (Ctrl+C to stop)\n');
  } catch (e) {
    console.error('Fatal error:', e.message);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n[Shutdown] Stopping worker...');
  if (db) db.close();
  process.exit(0);
});

main();
