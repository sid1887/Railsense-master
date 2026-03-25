/**
 * Database Initialization Script
 * Sets up SQLite schema for train snapshots
 * Run once before starting the collector
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_PATH = path.join(DATA_DIR, 'history.db');

console.log('[DB Init] Setting up database...');

// Create data directory if it doesn't exist
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  console.log(`[DB Init] Created directory: ${DATA_DIR}`);
}

// Create or open database
const db = new Database(DB_PATH);
console.log(`[DB Init] Database: ${DB_PATH}`);

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Create train_snapshots table if it doesn't exist
const createTableSQL = `
CREATE TABLE IF NOT EXISTS train_snapshots (
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
);
`;

db.exec(createTableSQL);
console.log('[DB Init] ✓ train_snapshots table ready');

// Create indexes for performance
const indexes = [
  {
    name: 'idx_train_timestamp',
    sql: `CREATE INDEX IF NOT EXISTS idx_train_timestamp
          ON train_snapshots(train_number, timestamp DESC);`,
  },
  {
    name: 'idx_section_timestamp',
    sql: `CREATE INDEX IF NOT EXISTS idx_section_timestamp
          ON train_snapshots(section_id, timestamp DESC);`,
  },
  {
    name: 'idx_timestamp',
    sql: `CREATE INDEX IF NOT EXISTS idx_timestamp
          ON train_snapshots(timestamp DESC);`,
  },
];

for (const idx of indexes) {
  db.exec(idx.sql);
  console.log(`[DB Init] ✓ Index: ${idx.name}`);
}

// Verify schema
const tableInfo = db.prepare(`PRAGMA table_info(train_snapshots)`).all();
console.log(`[DB Init] ✓ Schema verified (${tableInfo.length} columns)`);

// Get current counts
const counts = db.prepare(`SELECT COUNT(*) as count FROM train_snapshots`).get() as any;
console.log(`[DB Init] ✓ Current snapshots in database: ${counts.count}`);

// Print database statistics
const stats = db.prepare(`
  SELECT
    COUNT(DISTINCT train_number) as unique_trains,
    COUNT(*) as total_snapshots,
    MIN(timestamp) as oldest_snapshot,
    MAX(timestamp) as newest_snapshot
  FROM train_snapshots
`).get() as any;

if (stats.total_snapshots > 0) {
  const oldestDate = new Date(stats.oldest_snapshot);
  const newestDate = new Date(stats.newest_snapshot);
  const ageHours = (stats.newest_snapshot - stats.oldest_snapshot) / (1000 * 3600);

  console.log(`
[DB Init] Database Statistics:
  - Unique trains: ${stats.unique_trains}
  - Total snapshots: ${stats.total_snapshots}
  - Age: ${ageHours.toFixed(1)} hours
  - Range: ${oldestDate.toISOString()} → ${newestDate.toISOString()}
  `);
}

// Close and exit
db.close();
console.log('[DB Init] ✓ Database initialization complete\n');
