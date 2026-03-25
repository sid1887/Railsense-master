/**
 * Real Halt Detection Algorithm
 * Detects unexpected halts using historical data and predictive patterns
 *
 * A "Halt" is when a train stops between scheduled stations for > 10 minutes
 */

const trainTracker = require('./trainPositionTracker');

class HaltDetectionEngine {
  constructor() {
    this.historyBuffer = new Map(); // Store recent position history per train
    this.minHaltDuration = 600; // 10 minutes in seconds
    this.historyRetention = 3600 * 1000; // Keep 1 hour of history
  }

  /**
   * Check if a train is experiencing an unexpected halt
   * Uses multiple detection methods for higher confidence
   */
  detectHalt(trainNumber, currentData) {
    if (!currentData) {
      return {
        isHalted: false,
        confidence: 0,
        haltDuration: 0,
        reason: "No position data",
        type: "unknown",
      };
    }

    // Method 1: Speed-based detection (speed = 0 for duration)
    const speedHalt = this.detectSpeedBasedHalt(trainNumber, currentData);

    // Method 2: Location-based detection (same location over time)
    const locationHalt = this.detectLocationBasedHalt(trainNumber, currentData);

    // Method 3: Schedule-based detection (early stopping)
    const scheduleHalt = this.detectScheduleDeviation(trainNumber, currentData);

    // Combine evidence
    const allMethods = [speedHalt, locationHalt, scheduleHalt];
    const haltedCount = allMethods.filter(m => m.isHalted).length;
    const avgConfidence = allMethods.reduce((sum, m) => sum + m.confidence, 0) / 3;

    const finalResult = {
      isHalted: haltedCount >= 2, // Need at least 2 methods to confirm
      confidence: Math.min(1, avgConfidence),
      haltDuration: Math.max(speedHalt.haltDuration, locationHalt.haltDuration),
      reason: this.getReason(speedHalt, locationHalt, scheduleHalt),
      type: this.getHaltType(currentData, speedHalt, locationHalt, scheduleHalt),
      details: {
        speedBased: speedHalt,
        locationBased: locationHalt,
        scheduleBased: scheduleHalt,
      }
    };

    return finalResult;
  }

  /**
   * Detect halt based on speed: if speed is 0 for sustained duration
   */
  detectSpeedBasedHalt(trainNumber, currentData) {
    const history = this.getHistory(trainNumber);

    if (currentData.speed > 2) {
      // Train is moving
      return { isHalted: false, confidence: 0, haltDuration: 0 };
    }

    // Train shows zero speed
    // Check if it's been stationary
    let stationaryDuration = 0;
    const now = new Date().getTime();

    for (let i = history.length - 1; i >= 0; i--) {
      const entry = history[i];
      if (entry.speed <= 2) {
        stationaryDuration = now - entry.timestamp;
      } else {
        break;
      }
    }

    const isHalted = stationaryDuration >= this.minHaltDuration;
    const confidence = Math.min(1, stationaryDuration / (this.minHaltDuration * 2));

    return {
      isHalted,
      confidence,
      haltDuration: Math.floor(stationaryDuration / 60), // in minutes
    };
  }

  /**
   * Detect halt based on location: if train stays at same location
   */
  detectLocationBasedHalt(trainNumber, currentData) {
    const history = this.getHistory(trainNumber);

    if (history.length < 3) {
      return { isHalted: false, confidence: 0, haltDuration: 0 };
    }

    // Check if last N readings are from same location (within 100m)
    const threshold = 0.001; // ~100meters at equator
    let sameLocationCount = 0;

    for (let i = Math.max(0, history.length - 5); i < history.length; i++) {
      const latDiff = Math.abs(history[i].lat - currentData.lat);
      const lngDiff = Math.abs(history[i].lng - currentData.lng);

      if (latDiff < threshold && lngDiff < threshold) {
        sameLocationCount++;
      }
    }

    const isHaltingAtSameLocation = sameLocationCount >= 3;

    // Calculate duration
    let haltDuration = 0;
    if (isHaltingAtSameLocation && history.length > 0) {
      const oldestSameLoc = history.find(h => {
        const latDiff = Math.abs(h.lat - currentData.lat);
        const lngDiff = Math.abs(h.lng - currentData.lng);
        return latDiff < threshold && lngDiff < threshold;
      });

      if (oldestSameLoc) {
        haltDuration = Math.floor((new Date().getTime() - oldestSameLoc.timestamp) / 60000);
      }
    }

    return {
      isHalted: isHaltingAtSameLocation && haltDuration >= 10,
      confidence: isHaltingAtSameLocation ? 0.8 : 0,
      haltDuration: haltDuration,
    };
  }

  /**
   * Detect halt based on schedule deviation
   */
  detectScheduleDeviation(trainNumber, currentData) {
    const trainInfo = trainTracker.getTrainInfo(trainNumber);
    if (!trainInfo) {
      return { isHalted: false, confidence: 0, haltDuration: 0 };
    }

    // Check if train is significantly behind schedule
    const expectedProgress = this.getExpectedProgress(trainNumber);
    const actualProgress = currentData.progress || 0;
    const progressDeviation = expectedProgress - actualProgress;

    // If train is more than 20% behind expected progress and stopped
    if (progressDeviation > 20 && currentData.speed < 2) {
      const delayMinutes = (progressDeviation / 100) * trainInfo.duration;

      return {
        isHalted: delayMinutes > 10,
        confidence: Math.min(1, delayMinutes / 60),
        haltDuration: Math.floor(delayMinutes),
      };
    }

    return {
      isHalted: false,
      confidence: 0,
      haltDuration: 0,
    };
  }

  /**
   * Get expected progress based on current time and schedule
   */
  getExpectedProgress(trainNumber) {
    const now = new Date();
    const trainInfo = trainTracker.getTrainInfo(trainNumber);

    if (!trainInfo) return 0;

    const [depHour, depMin] = trainInfo.departurTime.split(':').map(Number);
    const depTime = new Date();
    depTime.setHours(depHour, depMin, 0, 0);

    if (now < depTime) return 0;

    const elapsedMinutes = (now.getTime() - depTime.getTime()) / (1000 * 60);
    const progress = (elapsedMinutes / trainInfo.duration) * 100;

    return Math.min(100, progress);
  }

  getReason(speedBased, locationBased, scheduleBased) {
    if (speedBased.isHalted && speedBased.haltDuration > 45) {
      return "Unexpected halt: Train stopped for " + speedBased.haltDuration + " minutes";
    }
    if (locationBased.isHalted) {
      return "Station halt: Train at " + "station for " + locationBased.haltDuration + " minutes";
    }
    if (scheduleBased.isHalted) {
      return "Schedule deviation: Train " + scheduleBased.haltDuration + " minutes behind schedule";
    }
    return "Train running on schedule";
  }

  getHaltType(currentData, speedBased, locationBased, scheduleBased) {
    if (!speedBased.isHalted && !locationBased.isHalted && !scheduleBased.isHalted) {
      return "normal";
    }
    if (scheduleBased.isHalted && scheduleBased.haltDuration > 60) {
      return "unexpected-major";
    }
    if (scheduleBased.haltDuration > 30) {
      return "unexpected-minor";
    }
    return "scheduled";
  }

  /**
   * Record position history for a train
   */
  recordPosition(trainNumber, positionData) {
    if (!this.historyBuffer.has(trainNumber)) {
      this.historyBuffer.set(trainNumber, []);
    }

    const history = this.historyBuffer.get(trainNumber);
    history.push({
      ...positionData,
      timestamp: new Date().getTime(),
    });

    // Keep only recent history
    const cutoffTime = new Date().getTime() - this.historyRetention;
    while (history.length > 0 && history[0].timestamp < cutoffTime) {
      history.shift();
    }
  }

  /**
   * Get position history for a train
   */
  getHistory(trainNumber) {
    return this.historyBuffer.get(trainNumber) || [];
  }

  clearHistory(trainNumber) {
    this.historyBuffer.delete(trainNumber);
  }
}

module.exports = new HaltDetectionEngine();
