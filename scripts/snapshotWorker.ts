import { getTrainData } from '../services/trainDataService';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config();

// Get tracked trains from environment or default to test trains
const TRACKED = (process.env.TRACKED_TRAINS || '12728,12955,17015,12702,11039').split(',');
const COLLECT_INTERVAL = parseInt(process.env.COLLECT_INTERVAL || '30', 10) * 1000; // 30s default
const DATA_DIR = path.join(__dirname, '../data');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

async function ensureDb() {
  const db = await open({
    filename: path.join(DATA_DIR, 'history.db'),
    driver: sqlite3.Database
  });

  // Enable foreign keys and WAL mode for better concurrency
  await db.exec('PRAGMA journal_mode = WAL;');
  await db.exec('PRAGMA foreign_keys = ON;');

  await db.exec(`
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
  `);

  // Add indexes for efficient queries
  await db.exec(`
    CREATE INDEX IF NOT EXISTS idx_train_ts
    ON train_snapshots(train_number, timestamp DESC);
  `);

  await db.exec(`
    CREATE INDEX IF NOT EXISTS idx_ts
    ON train_snapshots(timestamp DESC);
  `);

  return db;
}

async function collectSnapshots(db: any) {
  console.log(`\n[${new Date().toISOString()}] Starting snapshot collection for ${TRACKED.length} trains...`);

  let successCount = 0;
  let failCount = 0;

  for (const trainNumber of TRACKED) {
    const tn = trainNumber.trim();
    if (!tn) continue;

    try {
      const data = await getTrainData(tn);

      if (!data) {
        console.warn(`  ✗ ${tn} - No data returned`);
        failCount++;
        continue;
      }

      const ts = Date.now();
      const lat = data.currentLocation?.latitude ?? null;
      const lng = data.currentLocation?.longitude ?? null;
      const speed = data.speed ?? 0;
      const delay = data.delay ?? 0;
      const source = data.source ?? 'unknown';

      await db.run(`
        INSERT INTO train_snapshots
        (train_number, lat, lng, speed, delay, timestamp, source)
        VALUES (?,?,?,?,?,?,?)
      `, [tn, lat, lng, speed, delay, ts, source]);

      console.log(`  ✓ ${tn} - lat=${lat?.toFixed(2)}, delay=${delay}min, source=${source}`);
      successCount++;
    } catch (e) {
      console.error(`  ✗ ${tn} - Error:`, (e as any).message || e);
      failCount++;
    }

    // Small sleep to avoid burst requests
    await new Promise(r => setTimeout(r, 300));
  }

  console.log(`[Collection] Complete - Success: ${successCount}, Failed: ${failCount}`);

  // Log DB stats
  try {
    const count = await db.get('SELECT COUNT(*) as cnt FROM train_snapshots');
    const oldest = await db.get('SELECT timestamp FROM train_snapshots ORDER BY timestamp ASC LIMIT 1');
    const newest = await db.get('SELECT timestamp FROM train_snapshots ORDER BY timestamp DESC LIMIT 1');

    if (count && count.cnt > 0) {
      const ageMinutes = ((Date.now() - (oldest?.timestamp || 0)) / 1000 / 60).toFixed(1);
      console.log(`[DB Stats] Total snapshots: ${count.cnt}, Age: ${ageMinutes}min`);
    }
  } catch (e) {
    // ignore stats errors
  }
}

async function main() {
  console.log('=== Snapshot Worker Started ===');
  console.log(`Tracked trains: ${TRACKED.length}`);
  console.log(`Collection interval: ${COLLECT_INTERVAL / 1000}s`);
  console.log(`Data directory: ${DATA_DIR}`);

  let db: any;
  try {
    db = await ensureDb();
    console.log('✓ Database initialized');

    // Initial collection
    await collectSnapshots(db);

    // Set up interval
    setInterval(() => collectSnapshots(db), COLLECT_INTERVAL);
    console.log('✓ Periodic collection started');

    // Keep process alive
    console.log('Worker running... (Ctrl+C to stop)');
  } catch (e) {
    console.error('Fatal error:', e);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n[Shutdown] Stopping worker...');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n[Shutdown] Stopping worker...');
  process.exit(0);
});

main().catch(e => {
  console.error('Worker error:', e);
  process.exit(1);
});
