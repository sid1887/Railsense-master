/**
 * Comprehensive Database Health Check Endpoint
 * STEP 1: Verify Redis and SQLite connectivity
 * Tests both primary cache and persistent storage layers
 *
 * Usage: GET /api/system/db-health
 * Response includes detailed status of all database systems
 */

import { NextRequest, NextResponse } from 'next/server';
import { isRedisAvailable, getRedisClient } from '@/lib/redis';
import { dbGet } from '@/lib/database';
import { log } from '@/lib/logger';

interface DatabaseHealthStatus {
  timestamp: string;
  overallStatus: 'healthy' | 'degraded' | 'unhealthy';
  responseTimeMs: number;
  redis: {
    available: boolean;
    connected: boolean;
    responseTimeMs: number;
    error?: string;
    info?: {
      version?: string;
      connectedClients?: number;
      usedMemory?: string;
    };
  };
  sqlite: {
    available: boolean;
    responseTimeMs: number;
    error?: string;
    dbInfo?: {
      userCount?: number;
      queryResponseTime?: number;
    };
  };
  cache: {
    status: 'operational' | 'degraded' | 'unchanged';
    fallbackMode: boolean;
    description: string;
  };
  recommendations: string[];
}

async function checkRedisHealth(): Promise<any> {
  const startTime = Date.now();
  const result: any = {
    available: false,
    connected: false,
    responseTimeMs: 0,
    error: undefined,
    info: undefined
  };

  try {
    // Check if Redis is available
    result.available = await isRedisAvailable();

    if (result.available) {
      try {
        const client = await getRedisClient();
        const pingStart = Date.now();
        const pong = await client.ping();
        result.responseTimeMs = Date.now() - pingStart;
        result.connected = pong === 'PONG';

        if (result.connected) {
          // Get Redis info for diagnostics
          try {
            const info = await client.info('server');
            const lines = info.split('\r\n');
            const infoObj: any = {};
            lines.forEach(line => {
              if (line && !line.startsWith('#')) {
                const [key, value] = line.split(':');
                if (key && value) infoObj[key] = value;
              }
            });
            result.info = {
              version: infoObj['redis_version'],
              connectedClients: infoObj['connected_clients'],
              usedMemory: infoObj['used_memory_human']
            };
          } catch (e) {
            // Info gathering is optional
          }
        }
      } catch (e) {
        result.error = e instanceof Error ? e.message : 'Unknown Redis error';
      }
    } else {
      result.error = 'Redis not available (in-memory fallback active)';
    }
  } catch (error) {
    result.error = error instanceof Error ? error.message : 'Redis check failed';
    result.available = false;
  }

  result.responseTimeMs = Date.now() - startTime;
  return result;
}

async function checkSQLiteHealth(): Promise<any> {
  const startTime = Date.now();
  const result: any = {
    available: false,
    responseTimeMs: 0,
    error: undefined,
    dbInfo: undefined
  };

  try {
    // Test SQLite connectivity with simple query
    const userCount = await dbGet<{ count: number }>(
      'SELECT COUNT(*) as count FROM users'
    );

    const queryTime = Date.now() - startTime;
    result.responseTimeMs = queryTime;
    result.available = true;

    if (userCount) {
      result.dbInfo = {
        userCount: userCount.count || 0,
        queryResponseTime: queryTime
      };
    }
  } catch (error) {
    result.error = error instanceof Error ? error.message : 'SQLite check failed';
    result.available = false;
  }

  return result;
}

export async function GET(req: NextRequest) {
  const startTime = Date.now();
  const recommendations: string[] = [];

  try {
    const [redisStatus, sqliteStatus] = await Promise.all([
      checkRedisHealth(),
      checkSQLiteHealth()
    ]);

    // Determine overall status
    const redisHealthy = redisStatus.connected;
    const sqliteHealthy = sqliteStatus.available;

    let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

    if (!sqliteHealthy) {
      overallStatus = 'unhealthy';
      recommendations.push('[ERROR] SQLite database is not responding. Check database file and permissions.');
    } else if (!redisHealthy) {
      overallStatus = 'degraded';
      recommendations.push('[WARNING] Redis is unavailable. System is using in-memory fallback (performance may be impacted).');
      recommendations.push('[INFO] Consider starting Redis service: redis-server (Linux/Mac) or check Docker Redis');
    }

    if (redisStatus.responseTimeMs > 100) {
      recommendations.push(`[WARNING] Redis response time is ${redisStatus.responseTimeMs}ms (higher than ideal 50ms)`);
    }

    if (sqliteStatus.responseTimeMs > 500) {
      recommendations.push(`[WARNING] SQLite response time is ${sqliteStatus.responseTimeMs}ms (higher than ideal 100ms)`);
    }

    if (sqliteHealthy && redisHealthy) {
      recommendations.push('[OK] All database systems operational. Ready for data integration.');
    }

    const health: DatabaseHealthStatus = {
      timestamp: new Date().toISOString(),
      overallStatus,
      responseTimeMs: Date.now() - startTime,
      redis: redisStatus,
      sqlite: sqliteStatus,
      cache: {
        status: redisHealthy ? 'operational' : (sqliteHealthy ? 'degraded' : 'unchanged'),
        fallbackMode: !redisHealthy,
        description: redisHealthy
          ? 'Redis cache operational'
          : 'Using in-memory cache (Redis unavailable)'
      },
      recommendations
    };

    // Log health status
    if (overallStatus === 'unhealthy') {
      console.error('[DB Health] System unhealthy:', health);
    } else if (overallStatus === 'degraded') {
      console.warn('[DB Health] System degraded:', health);
    } else {
      console.log('[DB Health] System healthy');
    }

    return NextResponse.json(health, {
      status: overallStatus === 'unhealthy' ? 503 : 200
    });
  } catch (error) {
    console.error('[DB Health] Fatal error:', error);

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      overallStatus: 'unhealthy',
      responseTimeMs: Date.now() - startTime,
      redis: { available: false, connected: false, responseTimeMs: 0, error: 'Check failed' },
      sqlite: { available: false, responseTimeMs: 0, error: 'Check failed' },
      cache: {
        status: 'unchanged',
        fallbackMode: true,
        description: 'All systems failed'
      },
      recommendations: ['Contact system administrator. All database systems failed.']
    }, { status: 503 });
  }
}
