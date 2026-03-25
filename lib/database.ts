/**
 * SQLite Database Setup & Connection
 * Initializes database with all required schemas
 */

import sqlite3 from 'sqlite3';
import path from 'path';
import fs from 'fs';

const DB_PATH = path.join(process.cwd(), 'data', 'railsense.db');
const DATA_DIR = path.join(process.cwd(), 'data');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

let db: sqlite3.Database | null = null;

/**
 * Initialize and return database connection
 */
export function getDatabase(): sqlite3.Database {
  if (db) return db;

  db = new (sqlite3.verbose()).Database(DB_PATH, (err) => {
    if (err) {
      console.error('[DB] Connection error:', err);
    } else {
      console.log('[DB] Connected to SQLite database at', DB_PATH);
      initializeSchema();
    }
  });

  db.configure('busyTimeout', 30000);
  return db;
}

/**
 * Initialize database schema on startup
 */
function initializeSchema() {
  if (!db) return;

  const schemas = [
    // Users table
    `CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT,
      role TEXT DEFAULT 'user',
      preferences TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_login DATETIME
    )`,

    // Train snapshots for historical tracking
    `CREATE TABLE IF NOT EXISTS train_snapshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      train_number TEXT NOT NULL,
      train_name TEXT,
      latitude REAL,
      longitude REAL,
      current_station TEXT,
      status TEXT,
      delay_minutes INTEGER,
      speed_kmph REAL,
      progress_percent INTEGER,
      source TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (train_number) REFERENCES trains(train_number)
    )`,

    // Predictions storage
    `CREATE TABLE IF NOT EXISTS predictions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      train_number TEXT NOT NULL,
      prediction_type TEXT,
      target_value TEXT,
      predicted_value REAL,
      confidence REAL,
      model_version TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (train_number) REFERENCES trains(train_number)
    )`,

    // User alerts
    `CREATE TABLE IF NOT EXISTS alerts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      train_number TEXT,
      alert_type TEXT,
      message TEXT,
      severity TEXT,
      read BOOLEAN DEFAULT 0,
      delivery_status TEXT DEFAULT 'pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (train_number) REFERENCES trains(train_number)
    )`,

    // Audit logs for compliance
    `CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      action TEXT NOT NULL,
      resource TEXT,
      resource_id TEXT,
      old_value TEXT,
      new_value TEXT,
      ip_address TEXT,
      user_agent TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )`,

    // Static station data
    `CREATE TABLE IF NOT EXISTS stations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      latitude REAL,
      longitude REAL,
      state TEXT,
      region TEXT,
      type TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,

    // Performance metrics
    `CREATE TABLE IF NOT EXISTS performance_metrics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      endpoint TEXT,
      method TEXT,
      response_time_ms INTEGER,
      status_code INTEGER,
      user_agent TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,

    // Trains master data
    `CREATE TABLE IF NOT EXISTS trains (
      train_number TEXT PRIMARY KEY,
      train_name TEXT NOT NULL,
      source TEXT,
      destination TEXT,
      source_code TEXT,
      destination_code TEXT,
      classification TEXT,
      last_updated DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,

    // User preferences
    `CREATE TABLE IF NOT EXISTS user_preferences (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER UNIQUE,
      favorite_trains TEXT,
      alert_frequency TEXT,
      notification_enabled BOOLEAN DEFAULT 1,
      email_enabled BOOLEAN DEFAULT 1,
      push_enabled BOOLEAN DEFAULT 1,
      theme TEXT DEFAULT 'dark',
      language TEXT DEFAULT 'en',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )`,

    // API usage tracking
    `CREATE TABLE IF NOT EXISTS api_usage (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      api_key TEXT,
      endpoint TEXT,
      requests_count INTEGER DEFAULT 1,
      reset_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )`,

    // Saved trains/bookmarks
    `CREATE TABLE IF NOT EXISTS saved_trains (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      train_number TEXT NOT NULL,
      train_name TEXT,
      from_station TEXT,
      to_station TEXT,
      saved_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, train_number),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )`,

    // User activity history
    `CREATE TABLE IF NOT EXISTS user_activity (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      activity_type TEXT NOT NULL,
      train_number TEXT,
      details TEXT,
      ip_address TEXT,
      user_agent TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )`,

    // User notifications
    `CREATE TABLE IF NOT EXISTS user_notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      notification_type TEXT NOT NULL,
      title TEXT,
      message TEXT,
      train_number TEXT,
      is_read BOOLEAN DEFAULT 0,
      delivery_method TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )`,

    // User reviews/ratings
    `CREATE TABLE IF NOT EXISTS user_reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      train_number TEXT NOT NULL,
      rating INTEGER,
      review_text TEXT,
      cleanliness INTEGER,
      comfort INTEGER,
      punctuality INTEGER,
      staff_behavior INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, train_number),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )`
  ];

  // Execute all schemas
  db.serialize(() => {
    schemas.forEach(schema => {
      db!.run(schema, (err) => {
        if (err) {
          console.error('[DB] Schema creation error:', err);
        }
      });
    });
  });

  // Create indices for performance
  const indices = [
    'CREATE INDEX IF NOT EXISTS idx_train_snapshots_train ON train_snapshots(train_number)',
    'CREATE INDEX IF NOT EXISTS idx_train_snapshots_created ON train_snapshots(created_at)',
    'CREATE INDEX IF NOT EXISTS idx_alerts_user ON alerts(user_id)',
    'CREATE INDEX IF NOT EXISTS idx_alerts_train ON alerts(train_number)',
    'CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id)',
    'CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at)',
    'CREATE INDEX IF NOT EXISTS idx_performance_metrics_endpoint ON performance_metrics(endpoint)',
    'CREATE INDEX IF NOT EXISTS idx_predictions_train ON predictions(train_number)',
    'CREATE INDEX IF NOT EXISTS idx_api_usage_user ON api_usage(user_id)',
    'CREATE INDEX IF NOT EXISTS idx_saved_trains_user ON saved_trains(user_id)',
    'CREATE INDEX IF NOT EXISTS idx_user_activity_user ON user_activity(user_id)',
    'CREATE INDEX IF NOT EXISTS idx_user_activity_train ON user_activity(train_number)',
    'CREATE INDEX IF NOT EXISTS idx_user_notifications_user ON user_notifications(user_id)',
    'CREATE INDEX IF NOT EXISTS idx_user_reviews_user ON user_reviews(user_id)',
    'CREATE INDEX IF NOT EXISTS idx_user_reviews_train ON user_reviews(train_number)',
  ];

  indices.forEach(index => {
    db!.run(index);
  });

  console.log('[DB] Schema initialization complete');
}

/**
 * Run a query (single result)
 */
export function dbGet<T = any>(sql: string, params: any[] = []): Promise<T | undefined> {
  return new Promise((resolve, reject) => {
    getDatabase().get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row as T | undefined);
    });
  });
}

/**
 * Run a query (multiple results)
 */
export function dbAll<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  return new Promise((resolve, reject) => {
    getDatabase().all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve((rows || []) as T[]);
    });
  });
}

/**
 * Run an insert/update/delete query
 */
export function dbRun(sql: string, params: any[] = []): Promise<{ id: number; changes: number }> {
  return new Promise((resolve, reject) => {
    getDatabase().run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ id: this.lastID, changes: this.changes });
    });
  });
}

/**
 * Close database connection
 */
export function closeDatabase() {
  if (db) {
    db.close((err) => {
      if (err) console.error('[DB] Close error:', err);
      else console.log('[DB] Connection closed');
      db = null;
    });
  }
}

// Initialize on import
getDatabase();

/**
 * Seed demo user if it doesn't exist
 */
export async function seedDemoUser() {
  try {
    const { hashPassword } = await import('@/lib/jwt');

    // Check if demo user already exists
    const existingUser = await dbGet(
      'SELECT id FROM users WHERE email = ?',
      ['demo@railsense.com']
    );

    if (existingUser) {
      console.log('[DB] Demo user already exists');
      return;
    }

    // Hash the demo password
    const passwordHash = await hashPassword('demo123456');

    // Create demo user
    const result = await dbRun(
      `INSERT INTO users (email, password_hash, name, role) VALUES (?, ?, ?, ?)`,
      ['demo@railsense.com', passwordHash, 'Demo User', 'user']
    );

    console.log('[DB] Demo user created with ID:', result.id);
  } catch (error) {
    console.error('[DB] Error seeding demo user:', error);
  }
}
