/**
 * Data Retention Service
 * Manages data retention policies and cleanup operations
 */

export interface RetentionPolicy {
  dataType: string;
  retentionDays: number;
  description: string;
  autoCleanup: boolean;
  notifyBefore?: number; // days before deletion
}

export interface DataAgeInfo {
  dataType: string;
  oldestRecord: number; // Unix timestamp
  newestRecord: number; // Unix timestamp
  totalRecords: number;
  sizeEstimateMB: number;
  retentionDays: number;
  willBeDeletedAt: number; // Unix timestamp
}

class DataRetentionService {
  private policies: Map<string, RetentionPolicy> = new Map();
  private lastCleanupTime: Map<string, number> = new Map();
  private cleanupInterval = 24 * 60 * 60 * 1000; // 24 hours

  constructor() {
    this.initializeDefaultPolicies();
  }

  /**
   * Initialize default retention policies
   */
  private initializeDefaultPolicies(): void {
    // Operational data - keep longer
    this.setPolicy('train_snapshots', {
      dataType: 'train_snapshots',
      retentionDays: 90,
      description: '90 days for train position snapshots (operational value)',
      autoCleanup: true,
      notifyBefore: 7,
    });

    this.setPolicy('halt_events', {
      dataType: 'halt_events',
      retentionDays: 180,
      description: '180 days for halt/delay events (analytics and patterns)',
      autoCleanup: true,
      notifyBefore: 14,
    });

    this.setPolicy('congestion_metrics', {
      dataType: 'congestion_metrics',
      retentionDays: 365,
      description: '365 days for traffic/congestion metrics (long-term analysis)',
      autoCleanup: true,
      notifyBefore: 30,
    });

    this.setPolicy('prediction_records', {
      dataType: 'prediction_records',
      retentionDays: 60,
      description: '60 days for prediction logs (model accuracy testing)',
      autoCleanup: true,
    });

    this.setPolicy('data_quality_logs', {
      dataType: 'data_quality_logs',
      retentionDays: 30,
      description: '30 days for data quality metrics (recent assessment)',
      autoCleanup: true,
    });

    this.setPolicy('user_sessions', {
      dataType: 'user_sessions',
      retentionDays: 7,
      description: '7 days for user session data (privacy)',
      autoCleanup: true,
      notifyBefore: 1,
    });

    this.setPolicy('error_logs', {
      dataType: 'error_logs',
      retentionDays: 30,
      description: '30 days for error logs (debugging)',
      autoCleanup: true,
    });

    this.setPolicy('api_audit_logs', {
      dataType: 'api_audit_logs',
      retentionDays: 90,
      description: '90 days for API audit trails (compliance)',
      autoCleanup: false, // Manual review recommended
      notifyBefore: 14,
    });
  }

  /**
   * Set or update a retention policy
   */
  setPolicy(dataType: string, policy: RetentionPolicy): void {
    this.policies.set(dataType, policy);
    console.log(`[DataRetention] Policy set for ${dataType}: ${policy.retentionDays} days`);
  }

  /**
   * Get a retention policy
   */
  getPolicy(dataType: string): RetentionPolicy | null {
    return this.policies.get(dataType) || null;
  }

  /**
   * Get all policies
   */
  getAllPolicies(): RetentionPolicy[] {
    return Array.from(this.policies.values());
  }

  /**
   * Calculate when data will be deleted based on its age
   */
  calculateDeletionDate(dataType: string, createdAt: number): number {
    const policy = this.getPolicy(dataType);
    if (!policy) return -1;

    return createdAt + policy.retentionDays * 24 * 60 * 60 * 1000;
  }

  /**
   * Get data age information
   */
  getDataAgeInfo(dataType: string, stats: {
    oldestRecord: number;
    newestRecord: number;
    totalRecords: number;
    sizeEstimateMB: number;
  }): DataAgeInfo {
    const policy = this.getPolicy(dataType);

    return {
      dataType,
      oldestRecord: stats.oldestRecord,
      newestRecord: stats.newestRecord,
      totalRecords: stats.totalRecords,
      sizeEstimateMB: stats.sizeEstimateMB,
      retentionDays: policy?.retentionDays || 0,
      willBeDeletedAt: this.calculateDeletionDate(dataType, stats.oldestRecord),
    };
  }

  /**
   * Check if data is approaching deletion deadline
   */
  isApproachingDeletion(dataType: string, createdAt: number, daysWarning?: number): boolean {
    const policy = this.getPolicy(dataType);
    if (!policy) return false;

    const warningDays = daysWarning || policy.notifyBefore || 7;
    const deletionDate = this.calculateDeletionDate(dataType, createdAt);
    const warningDate = deletionDate - warningDays * 24 * 60 * 60 * 1000;

    return Date.now() >= warningDate;
  }

  /**
   * Check if data is expired
   */
  isExpired(dataType: string, createdAt: number): boolean {
    const deletionDate = this.calculateDeletionDate(dataType, createdAt);
    return Date.now() >= deletionDate;
  }

  /**
   * Get deletion deadline for a record
   */
  getDeletionDeadline(dataType: string, createdAt: number): Date {
    return new Date(this.calculateDeletionDate(dataType, createdAt));
  }

  /**
   * Get days remaining before deletion
   */
  getDaysRemaining(dataType: string, createdAt: number): number {
    const deletionDate = this.calculateDeletionDate(dataType, createdAt);
    const daysRemaining = (deletionDate - Date.now()) / (24 * 60 * 60 * 1000);
    return Math.max(0, Math.ceil(daysRemaining));
  }

  /**
   * Calculate cleanup schedule
   */
  getCleanupSchedule(): Array<{
    dataType: string;
    lastCleanup: Date | null;
    nextCleanup: Date;
    intervalDisplay: string;
  }> {
    return this.getAllPolicies().map((policy) => {
      const lastCleanup = this.lastCleanupTime.get(policy.dataType);
      const nextCleanupTime = lastCleanup
        ? lastCleanup + this.cleanupInterval
        : Date.now() + this.cleanupInterval;

      return {
        dataType: policy.dataType,
        lastCleanup: lastCleanup ? new Date(lastCleanup) : null,
        nextCleanup: new Date(nextCleanupTime),
        intervalDisplay: this.formatInterval(this.cleanupInterval),
      };
    });
  }

  /**
   * Record cleanup execution
   */
  recordCleanup(dataType: string, recordsDeleted: number): void {
    this.lastCleanupTime.set(dataType, Date.now());
    console.log(
      `[DataRetention] Cleanup executed for ${dataType}: ${recordsDeleted} records deleted`
    );
  }

  /**
   * Get storage impact report
   */
  getStorageImpactReport(
    dataAges: DataAgeInfo[]
  ): {
    totalSizeMB: number;
    willBeFreeedMB: number;
    percentageToFree: number;
    breakdownByType: Array<{
      dataType: string;
      currentSizeMB: number;
      daysUntilDeletion: number;
      willFree: boolean;
    }>;
  } {
    let totalSize = 0;
    let willBeFreed = 0;

    const breakdown = dataAges.map((data) => {
      const daysRemaining = this.getDaysRemaining(data.dataType, data.oldestRecord);
      const willFree = daysRemaining === 0;

      totalSize += data.sizeEstimateMB;
      if (willFree) {
        willBeFreed += data.sizeEstimateMB;
      }

      return {
        dataType: data.dataType,
        currentSizeMB: data.sizeEstimateMB,
        daysUntilDeletion: daysRemaining,
        willFree,
      };
    });

    return {
      totalSizeMB: totalSize,
      willBeFreeedMB: willBeFreed,
      percentageToFree: totalSize > 0 ? (willBeFreed / totalSize) * 100 : 0,
      breakdownByType: breakdown,
    };
  }

  /**
   * Format interval for display
   */
  private formatInterval(ms: number): string {
    const days = ms / (24 * 60 * 60 * 1000);
    if (days >= 1) return `Every ${Math.ceil(days)} days`;
    const hours = ms / (60 * 60 * 1000);
    return `Every ${Math.ceil(hours)} hours`;
  }

  /**
   * Export policies as JSON
   */
  exportPolicies(): string {
    const policies = this.getAllPolicies();
    return JSON.stringify(policies, null, 2);
  }

  /**
   * Import policies from JSON
   */
  importPolicies(jsonStr: string): void {
    try {
      const policies = JSON.parse(jsonStr) as RetentionPolicy[];
      policies.forEach((policy) => {
        this.setPolicy(policy.dataType, policy);
      });
      console.log(`[DataRetention] Imported ${policies.length} policies`);
    } catch (error) {
      console.error('[DataRetention] Failed to import policies:', error);
    }
  }
}

// Export singleton
export const dataRetentionService = new DataRetentionService();
