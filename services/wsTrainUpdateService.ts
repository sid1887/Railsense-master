/**
 * WebSocket Train Update Service
 * Manages real-time train status updates via WebSocket
 * Handles connections, broadcasting, and subscription management
 */

interface TrainSubscriber {
  trainNumber: string;
  callback: (data: any) => void;
}

interface WSClient {
  send(data: string): void;
  close(): void;
}

interface TrainStatusUpdate {
  trainNumber: string;
  status: string;
  delay: number;
  speed: number;
  currentStation: string;
  timestamp: number;
}

/**
 * Service for managing WebSocket connections and train updates
 */
class TrainUpdateService {
  private clients: Set<WSClient> = new Set();
  private subscribers: Map<string, TrainSubscriber[]> = new Map();
  private updateIntervals: Map<string, NodeJS.Timeout> = new Map();
  private trainStates: Map<string, TrainStatusUpdate> = new Map();

  /**
   * Register a client connection
   */
  registerClient(client: WSClient): string {
    const clientId = `client_${Date.now()}_${Math.random()}`;
    this.clients.add(client);

    // Set up ping/pong to keep connection alive
    const interval = setInterval(() => {
      try {
        client.send(JSON.stringify({ type: 'ping' }));
      } catch (e) {
        this.removeClient(client);
        clearInterval(interval);
      }
    }, 30000); // Ping every 30 seconds

    console.log(`[WS] Client ${clientId} connected. Total clients: ${this.clients.size}`);
    return clientId;
  }

  /**
   * Remove a client connection
   */
  removeClient(client: WSClient): void {
    this.clients.delete(client);
    console.log(`[WS] Client disconnected. Total clients: ${this.clients.size}`);
  }

  /**
   * Subscribe client to train updates
   */
  subscribe(client: WSClient, trainNumber: string): void {
    if (!this.subscribers.has(trainNumber)) {
      this.subscribers.set(trainNumber, []);
    }

    const subscriber: TrainSubscriber = {
      trainNumber,
      callback: (data) => {
        try {
          client.send(JSON.stringify({
            type: 'train_update',
            data
          }));
        } catch (e) {
          this.removeClient(client);
        }
      }
    };

    this.subscribers.get(trainNumber)?.push(subscriber);

    // Start polling for this train if not already started
    if (!this.updateIntervals.has(trainNumber)) {
      this.startTrainUpdates(trainNumber);
    }

    console.log(`[WS] Client subscribed to train ${trainNumber}`);
  }

  /**
   * Unsubscribe client from train updates
   */
  unsubscribe(client: WSClient, trainNumber: string): void {
    const subscribers = this.subscribers.get(trainNumber) || [];
    this.subscribers.set(
      trainNumber,
      subscribers.filter(s => s.callback.toString() !== 'undefined')
    );

    if (subscribers.length === 0) {
      this.stopTrainUpdates(trainNumber);
    }

    console.log(`[WS] Client unsubscribed from train ${trainNumber}`);
  }

  /**
   * Start polling for train updates
   */
  private startTrainUpdates(trainNumber: string): void {
    // Poll every 5 seconds for real-time updates
    const interval = setInterval(async () => {
      try {
        // Simulate fetching new train data
        const update = await this.fetchTrainUpdate(trainNumber);
        this.broadcastUpdate(trainNumber, update);
      } catch (e) {
        console.error(`[WS] Error fetching update for train ${trainNumber}:`, e);
      }
    }, 5000);

    this.updateIntervals.set(trainNumber, interval);
    console.log(`[WS] Started polling updates for train ${trainNumber}`);
  }

  /**
   * Stop polling for a train
   */
  private stopTrainUpdates(trainNumber: string): void {
    const interval = this.updateIntervals.get(trainNumber);
    if (interval) {
      clearInterval(interval);
      this.updateIntervals.delete(trainNumber);
      console.log(`[WS] Stopped polling updates for train ${trainNumber}`);
    }
  }

  /**
   * Fetch latest train update
   * In production, this would call the NTES service
   */
  private async fetchTrainUpdate(trainNumber: string): Promise<TrainStatusUpdate> {
    // Simulate realistic train movement
    const cached = this.trainStates.get(trainNumber);

    const update: TrainStatusUpdate = {
      trainNumber,
      status: cached?.status || 'Running',
      delay: (cached?.delay || 0) + (Math.random() > 0.7 ? 1 : -0.5),
      speed: Math.max(0, (cached?.speed || 55) + (Math.random() - 0.5) * 10),
      currentStation: cached?.currentStation || 'En Route',
      timestamp: Date.now()
    };

    // Keep delay non-negative
    update.delay = Math.max(0, update.delay);

    this.trainStates.set(trainNumber, update);
    return update;
  }

  /**
   * Broadcast update to all subscribers
   */
  private broadcastUpdate(trainNumber: string, update: TrainStatusUpdate): void {
    const subscribers = this.subscribers.get(trainNumber) || [];
    subscribers.forEach(subscriber => {
      try {
        subscriber.callback(update);
      } catch (e) {
        console.error(`[WS] Error broadcasting to subscriber:`, e);
      }
    });
  }

  /**
   * Send message to all connected clients
   */
  broadcastToAll(message: any): void {
    const payload = JSON.stringify(message);
    this.clients.forEach(client => {
      try {
        client.send(payload);
      } catch (e) {
        this.removeClient(client);
      }
    });
  }

  /**
   * Get service statistics
   */
  getStats() {
    return {
      totalClients: this.clients.size,
      monitoredTrains: this.subscribers.size,
      activePollIntervals: this.updateIntervals.size,
      trainStates: Array.from(this.trainStates.entries()).map(([train, state]) => ({
        train,
        lastUpdate: new Date(state.timestamp).toISOString(),
        delay: state.delay,
        speed: state.speed
      }))
    };
  }
}

// Export singleton instance
export const trainUpdateService = new TrainUpdateService();
