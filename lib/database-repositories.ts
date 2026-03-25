/**
 * Database Repository Layer
 * CRUD operations for all entities
 */

import { dbGet, dbAll, dbRun } from '@/lib/database';

export interface User {
  id?: number;
  email: string;
  password_hash?: string;
  name?: string;
  role?: 'admin' | 'user';
  preferences?: string;
  created_at?: string;
  last_login?: string;
}

export interface TrainSnapshot {
  id?: number;
  train_number: string;
  train_name?: string;
  latitude: number;
  longitude: number;
  current_station?: string;
  status?: string;
  delay_minutes?: number;
  speed_kmph?: number;
  progress_percent?: number;
  source?: string;
  created_at?: string;
}

export interface Prediction {
  id?: number;
  train_number: string;
  prediction_type: string;
  target_value: string;
  predicted_value: number;
  confidence: number;
  model_version?: string;
  created_at?: string;
}

export interface Alert {
  id?: number;
  user_id: number;
  train_number: string;
  alert_type: string;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  read?: boolean;
  delivery_status?: string;
  created_at?: string;
}

export interface AuditLog {
  id?: number;
  user_id?: number;
  action: string;
  resource?: string;
  resource_id?: string;
  old_value?: string;
  new_value?: string;
  ip_address?: string;
  user_agent?: string;
  created_at?: string;
}

export interface Station {
  id?: number;
  code: string;
  name: string;
  latitude: number;
  longitude: number;
  state?: string;
  region?: string;
  type?: string;
}

// ============ USERS REPOSITORY ============
export const usersRepo = {
  async create(user: User) {
    const result = await dbRun(
      `INSERT INTO users (email, password_hash, name, role) VALUES (?, ?, ?, ?)`,
      [user.email, user.password_hash, user.name, user.role || 'user']
    );
    return result.id;
  },

  async findByEmail(email: string): Promise<User | undefined> {
    return dbGet<User>(
      `SELECT * FROM users WHERE email = ?`,
      [email]
    );
  },

  async findById(id: number): Promise<User | undefined> {
    return dbGet<User>(
      `SELECT id, email, name, role, created_at, last_login FROM users WHERE id = ?`,
      [id]
    );
  },

  async updateLastLogin(id: number) {
    return dbRun(
      `UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?`,
      [id]
    );
  },

  async updateProfile(id: number, updates: Partial<User>) {
    const fields = Object.keys(updates)
      .filter(k => k !== 'id' && k !== 'password_hash')
      .map(k => `${k} = ?`)
      .join(', ');
    const values = Object.values(updates).filter((_, i) => {
      const key = Object.keys(updates)[i];
      return key !== 'id' && key !== 'password_hash';
    });

    return dbRun(
      `UPDATE users SET ${fields} WHERE id = ?`,
      [...values, id]
    );
  }
};

// ============ TRAIN SNAPSHOTS REPOSITORY ============
export const trainSnapshotsRepo = {
  async insert(snapshot: TrainSnapshot) {
    return dbRun(
      `INSERT INTO train_snapshots (train_number, train_name, latitude, longitude, current_station, status, delay_minutes, speed_kmph, progress_percent, source)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        snapshot.train_number,
        snapshot.train_name,
        snapshot.latitude,
        snapshot.longitude,
        snapshot.current_station,
        snapshot.status,
        snapshot.delay_minutes,
        snapshot.speed_kmph,
        snapshot.progress_percent,
        snapshot.source
      ]
    );
  },

  async getLatest(trainNumber: string): Promise<TrainSnapshot | undefined> {
    return dbGet<TrainSnapshot>(
      `SELECT * FROM train_snapshots WHERE train_number = ? ORDER BY created_at DESC LIMIT 1`,
      [trainNumber]
    );
  },

  async getHistory(trainNumber: string, hours: number = 24): Promise<TrainSnapshot[]> {
    return dbAll<TrainSnapshot>(
      `SELECT * FROM train_snapshots
       WHERE train_number = ? AND created_at > datetime('now', '-' || ? || ' hours')
       ORDER BY created_at DESC`,
      [trainNumber, hours]
    );
  },

  async cleanup(daysOld: number = 30) {
    return dbRun(
      `DELETE FROM train_snapshots WHERE created_at < datetime('now', '-' || ? || ' days')`,
      [daysOld]
    );
  }
};

// ============ PREDICTIONS REPOSITORY ============
export const predictionsRepo = {
  async insert(prediction: Prediction) {
    return dbRun(
      `INSERT INTO predictions (train_number, prediction_type, target_value, predicted_value, confidence, model_version)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        prediction.train_number,
        prediction.prediction_type,
        prediction.target_value,
        prediction.predicted_value,
        prediction.confidence,
        prediction.model_version
      ]
    );
  },

  async getLatest(trainNumber: string, type: string): Promise<Prediction | undefined> {
    return dbGet<Prediction>(
      `SELECT * FROM predictions WHERE train_number = ? AND prediction_type = ? ORDER BY created_at DESC LIMIT 1`,
      [trainNumber, type]
    );
  },

  async getAccuracy(type: string, days: number = 7): Promise<number> {
    const result = await dbGet<{ avg_confidence: number }>(
      `SELECT AVG(confidence) as avg_confidence FROM predictions
       WHERE prediction_type = ? AND created_at > datetime('now', '-' || ? || ' days')`,
      [type, days]
    );
    return result?.avg_confidence || 0;
  }
};

// ============ ALERTS REPOSITORY ============
export const alertsRepo = {
  async create(alert: Alert) {
    return dbRun(
      `INSERT INTO alerts (user_id, train_number, alert_type, message, severity)
       VALUES (?, ?, ?, ?, ?)`,
      [alert.user_id, alert.train_number, alert.alert_type, alert.message, alert.severity]
    );
  },

  async getUserAlerts(userId: number, unreadOnly: boolean = false): Promise<Alert[]> {
    let sql = `SELECT * FROM alerts WHERE user_id = ?`;
    const params: any[] = [userId];

    if (unreadOnly) {
      sql += ` AND read = 0`;
    }

    sql += ` ORDER BY created_at DESC`;

    return dbAll<Alert>(sql, params);
  },

  async markAsRead(id: number) {
    return dbRun(`UPDATE alerts SET read = 1 WHERE id = ?`, [id]);
  },

  async updateDeliveryStatus(id: number, status: string) {
    return dbRun(`UPDATE alerts SET delivery_status = ? WHERE id = ?`, [status, id]);
  },

  async cleanup(daysOld: number = 90) {
    return dbRun(
      `DELETE FROM alerts WHERE created_at < datetime('now', '-' || ? || ' days') AND read = 1`,
      [daysOld]
    );
  }
};

// ============ AUDIT LOGS REPOSITORY ============
export const auditLogsRepo = {
  async log(log: AuditLog) {
    return dbRun(
      `INSERT INTO audit_logs (user_id, action, resource, resource_id, old_value, new_value, ip_address, user_agent)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [log.user_id, log.action, log.resource, log.resource_id, log.old_value, log.new_value, log.ip_address, log.user_agent]
    );
  },

  async getByUser(userId: number, limit: number = 100): Promise<AuditLog[]> {
    return dbAll<AuditLog>(
      `SELECT * FROM audit_logs WHERE user_id = ? ORDER BY created_at DESC LIMIT ?`,
      [userId, limit]
    );
  },

  async getByResource(resource: string, resourceId: string): Promise<AuditLog[]> {
    return dbAll<AuditLog>(
      `SELECT * FROM audit_logs WHERE resource = ? AND resource_id = ? ORDER BY created_at DESC`,
      [resource, resourceId]
    );
  },

  async cleanup(daysOld: number = 365) {
    return dbRun(
      `DELETE FROM audit_logs WHERE created_at < datetime('now', '-' || ? || ' days')`,
      [daysOld]
    );
  }
};

// ============ STATIONS REPOSITORY ============
export const stationsRepo = {
  async upsert(station: Station) {
    return dbRun(
      `INSERT INTO stations (code, name, latitude, longitude, state, region, type)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(code) DO UPDATE SET
       name = excluded.name,
       latitude = excluded.latitude,
       longitude = excluded.longitude,
       state = excluded.state,
       region = excluded.region,
       type = excluded.type`,
      [station.code, station.name, station.latitude, station.longitude, station.state, station.region, station.type]
    );
  },

  async findByCode(code: string): Promise<Station | undefined> {
    return dbGet<Station>(
      `SELECT * FROM stations WHERE code = ?`,
      [code]
    );
  },

  async findNearby(latitude: number, longitude: number, radiusKm: number = 50): Promise<Station[]> {
    return dbAll<Station>(
      `SELECT *,
              (6371 * acos(cos(radians(?)) * cos(radians(latitude)) * cos(radians(longitude) - radians(?)) + sin(radians(?)) * sin(radians(latitude)))) as distance
       FROM stations
       HAVING distance < ?
       ORDER BY distance`,
      [latitude, longitude, latitude, radiusKm]
    );
  },

  async getAll(): Promise<Station[]> {
    return dbAll<Station>(`SELECT * FROM stations ORDER BY name`);
  }
};

// ============ PERFORMANCE METRICS REPOSITORY ============
export const metricsRepo = {
  async record(endpoint: string, method: string, responseTimeMs: number, statusCode: number, userAgent?: string) {
    return dbRun(
      `INSERT INTO performance_metrics (endpoint, method, response_time_ms, status_code, user_agent)
       VALUES (?, ?, ?, ?, ?)`,
      [endpoint, method, responseTimeMs, statusCode, userAgent]
    );
  },

  async getStats(endpoint: string, days: number = 7): Promise<any> {
    return dbGet(
      `SELECT
        endpoint,
        COUNT(*) as total_requests,
        AVG(response_time_ms) as avg_response_time,
        MAX(response_time_ms) as max_response_time,
        MIN(response_time_ms) as min_response_time,
        SUM(CASE WHEN status_code = 200 THEN 1 ELSE 0 END) as success_count,
        SUM(CASE WHEN status_code >= 400 THEN 1 ELSE 0 END) as error_count
       FROM performance_metrics
       WHERE endpoint = ? AND created_at > datetime('now', '-' || ? || ' days')
       GROUP BY endpoint`,
      [endpoint, days]
    );
  },

  async cleanup(daysOld: number = 30) {
    return dbRun(
      `DELETE FROM performance_metrics WHERE created_at < datetime('now', '-' || ? || ' days')`,
      [daysOld]
    );
  }
};
