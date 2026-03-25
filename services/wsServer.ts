/**
 * WebSocket Server for Real-Time Train Updates
 * Broadcasts live train data to connected clients
 * Reduces polling overhead, enables instant updates
 */

import { Server as HTTPServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { logger } from './logger';
import { getTrainData } from './trainDataService';

interface TrainSubscription {
  trainNumber: string;
  clientId: string;
  socket: WebSocket;
}

interface BroadcastMessage {
  type: 'train-update' | 'halt-alert' | 'traffic-alert' | 'prediction';
  trainNumber: string;
  data: any;
  timestamp: number;
}

const subscriptions = new Map<string, TrainSubscription[]>();
const updateIntervals = new Map<string, NodeJS.Timeout>();
const UPDATE_INTERVAL_MS = 5000; // 5 seconds

/**
 * Initialize WebSocket server
 */
export function initializeWebSocketServer(httpServer: HTTPServer) {
  const wss = new WebSocketServer({ server: httpServer });

  wss.on('connection', (ws: WebSocket, req: any) => {
    const clientId = `client-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    logger.info('WebSocket client connected', { clientId });

    // Handle messages from client
    ws.on('message', (message: string) => {
      try {
        const { action, trainNumber } = JSON.parse(message);

        if (action === 'subscribe') {
          subscribe(clientId, trainNumber, ws);
        } else if (action === 'unsubscribe') {
          unsubscribe(clientId, trainNumber);
        }
      } catch (err) {
        logger.debug('WebSocket message error:', err);
      }
    });

    // Handle client disconnect
    ws.on('close', () => {
      logger.info('WebSocket client disconnected', { clientId });
      cleanup(clientId);
    });

    ws.on('error', (err: Error) => {
      logger.error('WebSocket error:', err);
    });
  });

  return wss;
}

/**
 * Subscribe a client to train updates
 */
function subscribe(clientId: string, trainNumber: string, ws: WebSocket) {
  const key = trainNumber.toUpperCase();

  if (!subscriptions.has(key)) {
    subscriptions.set(key, []);
    startTrainUpdates(key);
  }

  const subs = subscriptions.get(key)!;

  // Prevent duplicates
  if (!subs.find((s) => s.clientId === clientId)) {
    subs.push({ trainNumber: key, clientId, socket: ws });
    logger.debug(`Client ${clientId} subscribed to ${trainNumber}`);

    // Send immediate confirmation
    ws.send(
      JSON.stringify({
        type: 'subscription-confirmed',
        trainNumber: key,
        clientId,
      })
    );
  }
}

/**
 * Unsubscribe a client from train updates
 */
function unsubscribe(clientId: string, trainNumber: string) {
  const key = trainNumber.toUpperCase();
  const subs = subscriptions.get(key);

  if (subs) {
    const index = subs.findIndex((s) => s.clientId === clientId);
    if (index > -1) {
      subs.splice(index, 1);
      logger.debug(`Client ${clientId} unsubscribed from ${trainNumber}`);
    }

    // Stop updates if no more subscribers
    if (subs.length === 0) {
      subscriptions.delete(key);
      stopTrainUpdates(key);
    }
  }
}

/**
 * Clean up all subscriptions for a client
 */
function cleanup(clientId: string) {
  for (const [trainNumber, subs] of subscriptions.entries()) {
    const index = subs.findIndex((s) => s.clientId === clientId);
    if (index > -1) {
      subs.splice(index, 1);
    }

    if (subs.length === 0) {
      subscriptions.delete(trainNumber);
      stopTrainUpdates(trainNumber);
    }
  }
}

/**
 * Start periodic updates for a train
 */
function startTrainUpdates(trainNumber: string) {
  if (updateIntervals.has(trainNumber)) {
    return; // Already running
  }

  logger.debug(`Starting updates for train ${trainNumber}`);

  const interval = setInterval(() => {
    updateTrainData(trainNumber);
  }, UPDATE_INTERVAL_MS);

  updateIntervals.set(trainNumber, interval);
}

/**
 * Stop updates for a train
 */
function stopTrainUpdates(trainNumber: string) {
  const interval = updateIntervals.get(trainNumber);
  if (interval) {
    clearInterval(interval);
    updateIntervals.delete(trainNumber);
    logger.debug(`Stopped updates for train ${trainNumber}`);
  }
}

/**
 * Fetch and broadcast train data to all subscribers
 */
async function updateTrainData(trainNumber: string) {
  try {
    const trainData = await getTrainData(trainNumber);

    if (!trainData) {
      return;
    }

    const subs = subscriptions.get(trainNumber);
    if (!subs || subs.length === 0) {
      return;
    }

    const message: BroadcastMessage = {
      type: 'train-update',
      trainNumber,
      data: {
        location: trainData.currentLocation,
        speed: trainData.speed,
        delay: trainData.delay,
        lastUpdated: Date.now(),
      },
      timestamp: Date.now(),
    };

    const messageStr = JSON.stringify(message);

    // Broadcast to all connected subscribers
    for (const sub of subs) {
      if (sub.socket.readyState === WebSocket.OPEN) {
        sub.socket.send(messageStr);
      }
    }
  } catch (err) {
    logger.debug(`Error updating train ${trainNumber}:`, err);
  }
}

/**
 * Broadcast alert to all subscribers
 */
export function broadcastAlert(
  trainNumber: string,
  alertType: 'halt' | 'traffic' | 'prediction',
  data: any
) {
  const subs = subscriptions.get(trainNumber.toUpperCase());
  if (!subs || subs.length === 0) {
    return;
  }

  const message: BroadcastMessage = {
    type: `${alertType}-alert` as any,
    trainNumber: trainNumber.toUpperCase(),
    data,
    timestamp: Date.now(),
  };

  const messageStr = JSON.stringify(message);

  for (const sub of subs) {
    if (sub.socket.readyState === WebSocket.OPEN) {
      sub.socket.send(messageStr);
    }
  }
}

/**
 * Get subscriber count for train
 */
export function getSubscriberCount(trainNumber: string): number {
  return subscriptions.get(trainNumber.toUpperCase())?.length || 0;
}

/**
 * Get all active subscriptions
 */
export function getActiveSubscriptions() {
  return Array.from(subscriptions.entries()).map(([train, subs]) => ({
    trainNumber: train,
    subscriberCount: subs.length,
  }));
}
