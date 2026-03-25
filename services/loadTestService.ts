/**
 * Load Test Service
 * Simulates high-volume load and measures performance metrics
 */

export interface LoadTestConfig {
  name: string;
  duration: number; // milliseconds
  requestsPerSecond: number;
  concurrentUsers: number;
  targetEndpoint: string;
  dataSize: 'small' | 'medium' | 'large'; // response size
}

export interface LoadTestResult {
  testName: string;
  duration: number;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  metrics: {
    avgResponseTime: number;
    p50ResponseTime: number;
    p95ResponseTime: number;
    p99ResponseTime: number;
    maxResponseTime: number;
    minResponseTime: number;
    throughput: number; // requests per second
    errorRate: number; // percentage
  };
  resourceUsage: {
    peakMemoryMB: number;
    avgCPUUsage: number;
  };
  timestamp: number;
}

interface RequestTiming {
  duration: number;
  success: boolean;
}

class LoadTestService {
  private activeTests: Map<string, LoadTestResult> = new Map();
  private testHistory: LoadTestResult[] = [];
  private maxHistory = 50;

  /**
   * Run a load test simulation
   */
  async runLoadTest(config: LoadTestConfig): Promise<LoadTestResult> {
    const startTime = Date.now();
    const requestTimings: RequestTiming[] = [];
    let successCount = 0;
    let failureCount = 0;

    console.log(`[LoadTest] Starting: ${config.name}`);
    console.log(`[LoadTest] Config:`, {
      duration: config.duration,
      rps: config.requestsPerSecond,
      concurrentUsers: config.concurrentUsers,
    });

    // Simulate load test
    const endTime = startTime + config.duration;
    let requestCount = 0;
    const targetRequestCount = Math.floor((config.duration / 1000) * config.requestsPerSecond);

    const batchSize = Math.ceil(config.concurrentUsers / 10);

    while (Date.now() < endTime && requestCount < targetRequestCount) {
      // Simulate batch of requests
      const batchRequests = Math.min(batchSize, targetRequestCount - requestCount);

      for (let i = 0; i < batchRequests; i++) {
        // Simulate request with realistic timing
        const baseTime = 50 + Math.random() * 150; // 50-200ms base
        const noise = (Math.random() - 0.5) * baseTime * 0.3; // ±15% variance
        const duration = Math.max(10, baseTime + noise);

        // Simulate occasional failures (0.5% error rate)
        const success = Math.random() > 0.005;
        if (success) {
          successCount++;
        } else {
          failureCount++;
        }

        requestTimings.push({ duration, success });
        requestCount++;
      }

      // Respect request rate
      const expectedBatchTime = (batchRequests / config.requestsPerSecond) * 1000;
      const actualBatchTime = Date.now() - startTime;
      const elapsedRequests = actualBatchTime / 1000 * config.requestsPerSecond;

      if (elapsedRequests < requestCount) {
        const delayNeeded = (requestCount - elapsedRequests) / config.requestsPerSecond * 1000;
        await this.sleep(Math.min(10, delayNeeded));
      }
    }

    const totalDuration = Date.now() - startTime;

    // Calculate metrics
    const successfulTimings = requestTimings.filter((r) => r.success).map((r) => r.duration);
    successfulTimings.sort((a, b) => a - b);

    const metrics = {
      avgResponseTime: successfulTimings.reduce((a, b) => a + b, 0) / successfulTimings.length,
      p50ResponseTime: this.percentile(successfulTimings, 50),
      p95ResponseTime: this.percentile(successfulTimings, 95),
      p99ResponseTime: this.percentile(successfulTimings, 99),
      maxResponseTime: Math.max(...successfulTimings),
      minResponseTime: Math.min(...successfulTimings),
      throughput: (requestCount / (totalDuration / 1000)),
      errorRate: (failureCount / requestCount) * 100,
    };

    // Simulate resource usage
    const peakMemory = 512 + (config.concurrentUsers * 15); // Rough estimate
    const avgCPU = 30 + (metrics.throughput / 10); // Rough estimate

    const result: LoadTestResult = {
      testName: config.name,
      duration: totalDuration,
      totalRequests: requestCount,
      successfulRequests: successCount,
      failedRequests: failureCount,
      metrics,
      resourceUsage: {
        peakMemoryMB: Math.round(peakMemory),
        avgCPUUsage: Math.round(avgCPU),
      },
      timestamp: Date.now(),
    };

    // Store result
    this.activeTests.set(config.name, result);
    this.testHistory.unshift(result);
    if (this.testHistory.length > this.maxHistory) {
      this.testHistory.pop();
    }

    console.log(`[LoadTest] Complete: ${config.name}`, { ...metrics });

    return result;
  }

  /**
   * Calculate percentile
   */
  private percentile(arr: number[], p: number): number {
    const index = Math.ceil((p / 100) * arr.length) - 1;
    return arr[Math.max(0, index)];
  }

  /**
   * Sleep helper
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get active test
   */
  getActiveTest(name: string): LoadTestResult | null {
    return this.activeTests.get(name) || null;
  }

  /**
   * Get all test results
   */
  getAllTestResults(): LoadTestResult[] {
    return Array.from(this.activeTests.values());
  }

  /**
   * Get test history
   */
  getTestHistory(): LoadTestResult[] {
    return this.testHistory;
  }

  /**
   * Compare two test results
   */
  compareResults(
    test1: LoadTestResult,
    test2: LoadTestResult
  ): {
    throughputChange: number; // percentage
    responseTimeChange: number; // percentage
    errorRateChange: number; // percentage
  } {
    return {
      throughputChange: ((test2.metrics.throughput - test1.metrics.throughput) / test1.metrics.throughput) * 100,
      responseTimeChange:
        ((test2.metrics.avgResponseTime - test1.metrics.avgResponseTime) / test1.metrics.avgResponseTime) * 100,
      errorRateChange: test2.metrics.errorRate - test1.metrics.errorRate,
    };
  }

  /**
   * Generate performance report
   */
  generateReport(): {
    summary: string;
    recommendations: string[];
    passFailStatus: {
      throughput: boolean;
      latency: boolean;
      errorRate: boolean;
    };
  } {
    const latestTests = this.testHistory.slice(0, 3);
    if (latestTests.length === 0) {
      return {
        summary: 'No tests run yet',
        recommendations: ['Run a load test to generate performance report'],
        passFailStatus: { throughput: false, latency: false, errorRate: false },
      };
    }

    const latestTest = latestTests[0];
    const m = latestTest.metrics;

    const recommendations: string[] = [];
    const passFailStatus = {
      throughput: m.throughput > 1000, // > 1000 RPS
      latency: m.p95ResponseTime < 500, // < 500ms p95
      errorRate: m.errorRate < 1, // < 1% error rate
    };

    if (!passFailStatus.throughput) {
      recommendations.push(`Increase throughput: Currently ${Math.round(m.throughput)} RPS, target 1000+ RPS`);
    }
    if (!passFailStatus.latency) {
      recommendations.push(
        `Reduce P95 latency: Currently ${Math.round(m.p95ResponseTime)}ms, target < 500ms`
      );
    }
    if (!passFailStatus.errorRate) {
      recommendations.push(
        `Reduce error rate: Currently ${m.errorRate.toFixed(2)}%, target < 1%`
      );
    }

    const allPass = Object.values(passFailStatus).every((s) => s);
    const summary = allPass
      ? 'βœ… System passed all load tests'
      : '⚠️ System needs optimization';

    return { summary, recommendations, passFailStatus };
  }

  /**
   * Clear test history
   */
  clearHistory(): void {
    this.activeTests.clear();
    this.testHistory = [];
  }
}

// Export singleton
export const loadTestService = new LoadTestService();
