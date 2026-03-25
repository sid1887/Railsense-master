/**
 * API Route: /api/system/stats
 * Returns comprehensive statistics about the backend services
 * Shows cache performance, NTES service health, and stream status
 */

import { NextRequest, NextResponse } from 'next/server';

// Track system metrics
const metrics = {
  startTime: Date.now(),
  totalRequests: 0,
  cacheHits: 0,
  ntesRequests: 0,
  ntesSuccesses: 0,
  errors: 0,
  avgResponseTime: 0,
  responseTimes: [] as number[],
  ntesWebScrapingIssues: 0
};

/**
 * Record a request metric
 */
function recordRequest(
  source: 'cache' | 'ntes' | 'api',
  success: boolean,
  responseTime: number
) {
  metrics.totalRequests++;
  if (source === 'cache') metrics.cacheHits++;
  if (source === 'ntes') metrics.ntesRequests++;
  if (success && source === 'ntes') metrics.ntesSuccesses++;
  if (!success) metrics.errors++;

  // Track average response time (keep last 100)
  metrics.responseTimes.push(responseTime);
  if (metrics.responseTimes.length > 100) {
    metrics.responseTimes.shift();
  }
  metrics.avgResponseTime =
    metrics.responseTimes.reduce((a, b) => a + b, 0) / metrics.responseTimes.length;
}

export async function GET(request: NextRequest) {
  try {
    const uptime = Date.now() - metrics.startTime;
    const cacheHitRate = metrics.totalRequests > 0
      ? ((metrics.cacheHits / metrics.totalRequests) * 100).toFixed(2)
      : '0';
    const ntesSuccessRate = metrics.ntesRequests > 0
      ? ((metrics.ntesSuccesses / metrics.ntesRequests) * 100).toFixed(2)
      : '0';

    const stats = {
      status: 'operational',
      uptime: {
        seconds: Math.floor(uptime / 1000),
        minutes: Math.floor(uptime / 1000 / 60),
        hours: Math.floor(uptime / 1000 / 60 / 60),
        formatted: formatUptime(uptime)
      },
      performance: {
        totalRequests: metrics.totalRequests,
        cacheHits: metrics.cacheHits,
        cacheHitRate: `${cacheHitRate}%`,
        avgResponseTime: `${metrics.avgResponseTime.toFixed(2)}ms`,
        p95ResponseTime: getPercentile(95),
        p99ResponseTime: getPercentile(99)
      },
      ntes: {
        totalRequests: metrics.ntesRequests,
        successfulRequests: metrics.ntesSuccesses,
        successRate: `${ntesSuccessRate}%`,
        failureRate: `${(100 - parseFloat(ntesSuccessRate)).toFixed(2)}%`
      },
      errors: {
        total: metrics.errors,
        errorRate: metrics.totalRequests > 0
          ? `${((metrics.errors / metrics.totalRequests) * 100).toFixed(2)}%`
          : '0%'
      },
      services: {
        cache: {
          status: metrics.cacheHits > 0 ? 'active' : 'inactive',
          hitRate: `${cacheHitRate}%`,
          description: 'In-memory cache with 5-minute TTL'
        },
        ntes: {
          status: metrics.ntesRequests > 0 ? 'active' : 'inactive',
          successRate: `${ntesSuccessRate}%`,
          description: 'NTES web scraping service with Puppeteer'
        },
        sse: {
          status: 'active',
          description: 'Server-Sent Events for real-time updates',
          updateInterval: '5 seconds'
        },
        mock: {
          status: 'fallback',
          description: 'Mock data fallback system for reliability'
        }
      },
      lastUpdate: new Date().toISOString(),
      recommendations: generateRecommendations()
    };

    const response = NextResponse.json(stats);
    response.headers.set('Cache-Control', 'no-cache');
    return response;
  } catch (error: any) {
    console.error('Stats error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get stats' },
      { status: 500 }
    );
  }
}

/**
 * Format uptime in human-readable format
 */
function formatUptime(ms: number): string {
  const hours = Math.floor(ms / 1000 / 60 / 60);
  const minutes = Math.floor((ms / 1000 / 60) % 60);
  const seconds = Math.floor((ms / 1000) % 60);

  if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

/**
 * Get percentile response time
 */
function getPercentile(percentile: number): string {
  if (metrics.responseTimes.length === 0) return '0ms';

  const sorted = [...metrics.responseTimes].sort((a, b) => a - b);
  const index = Math.ceil((percentile / 100) * sorted.length) - 1;
  return `${sorted[Math.max(0, index)].toFixed(2)}ms`;
}

/**
 * Generate recommendations based on current metrics
 */
function generateRecommendations(): string[] {
  const recommendations: string[] = [];
  const cacheHitRate = metrics.totalRequests > 0
    ? (metrics.cacheHits / metrics.totalRequests) * 100
    : 0;
  const errorRate = metrics.totalRequests > 0
    ? (metrics.errors / metrics.totalRequests) * 100
    : 0;

  if (cacheHitRate > 80) {
    recommendations.push('✅ Excellent cache hit rate - system is operating efficiently');
  } else if (cacheHitRate > 50) {
    recommendations.push('⚠️ Cache hit rate could be improved - consider longer TTL');
  } else if (cacheHitRate >= 0) {
    recommendations.push('❌ Low cache hit rate - consider optimizing cache strategy');
  }

  if (metrics.avgResponseTime > 5000) {
    recommendations.push('⚠️ Average response time is high - consider optimizing NTES queries');
  }

  if (errorRate > 5) {
    recommendations.push('❌ Error rate is elevated - investigate NTES service reliability');
  } else if (errorRate === 0 && metrics.totalRequests > 0) {
    recommendations.push('✅ Zero errors detected - system is stable');
  }

  if (metrics.ntesWebScrapingIssues === undefined) {
    recommendations.push('ℹ️ NTES web scraping may need real data extraction optimization');
  }

  return recommendations.length > 0
    ? recommendations
    : ['✅ System operating normally with no issues detected'];
}
