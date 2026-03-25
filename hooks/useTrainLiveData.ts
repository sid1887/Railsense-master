/**
 * useTrainLiveData Hook
 * Connects to WebSocket for real-time train updates
 * Falls back to HTTP polling if WebSocket unavailable
 */

import { useEffect, useState, useRef } from 'react';

interface TrainLiveUpdate {
  location: { latitude: number; longitude: number; timestamp: number };
  speed: number;
  delay: number;
  lastUpdated: number;
}

interface UseLiveDataReturn {
  data: TrainLiveUpdate | null;
  error: string | null;
  loading: boolean;
  isLive: boolean; // true if WebSocket, false if polling
  reconnect: () => void;
}

export function useTrainLiveData(
  trainNumber: string,
  fallbackPollingMs: number = process.env.NODE_ENV === 'development' ? 0 : 30000
): UseLiveDataReturn {
  const [data, setData] = useState<TrainLiveUpdate | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLive, setIsLive] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize WebSocket connection
  useEffect(() => {
    if (!trainNumber) return;

    let connectionTimeout: NodeJS.Timeout;

    const connectWebSocket = () => {
      try {
        // Construct WS URL (same host)
        const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${wsProtocol}//${window.location.host}`;

        const ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          setIsLive(true);
          setError(null);
          setLoading(false);

          // Subscribe to train
          ws.send(
            JSON.stringify({
              action: 'subscribe',
              trainNumber,
            })
          );

          // Clear any polling
          if (pollingRef.current) {
            clearInterval(pollingRef.current);
          }
        };

        ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);

            if (message.type === 'train-update') {
              setData(message.data);
            } else if (message.type === 'halt-alert' || message.type === 'traffic-alert') {
              // Could dispatch separate alert events
            }
          } catch (err) {
            console.error('Failed to parse WebSocket message:', err);
          }
        };

        ws.onerror = (event) => {
          console.error('WebSocket error:', event);
          setIsLive(false);
          startPolling();
        };

        ws.onclose = () => {
          setIsLive(false);
          wsRef.current = null;

          // Reconnect after delay
          connectionTimeout = setTimeout(() => {
            connectWebSocket();
          }, 3000);
        };

        wsRef.current = ws;
      } catch (err) {
        console.error('Failed to connect WebSocket:', err);
        setIsLive(false);
        startPolling();
      }
    };

    // Try WebSocket first
    connectWebSocket();

    return () => {
      clearTimeout(connectionTimeout);
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, [trainNumber]);

  // Polling fallback
  const startPolling = () => {
    if (pollingRef.current || fallbackPollingMs <= 0) {
      return; // Already polling or polling disabled
    }

    setIsLive(false);

    const poll = async () => {
      try {
        const response = await fetch(`/api/train-details?trainNumber=${trainNumber}`);
        const result = await response.json();

        if (result.trainData) {
          setData({
            location: result.trainData.currentLocation,
            speed: result.trainData.speed,
            delay: result.trainData.delay,
            lastUpdated: Date.now(),
          });

          setLoading(false);
          setError(null);
        }
      } catch (err) {
        setError(String(err));
      }
    };

    // Initial poll
    poll();

    // Set up polling interval
    pollingRef.current = setInterval(poll, fallbackPollingMs);
  };

  const reconnect = () => {
    if (wsRef.current) {
      wsRef.current.close();
    }
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
    }
    setData(null);
    setError(null);
    setLoading(true);
  };

  return {
    data,
    error,
    loading,
    isLive,
    reconnect,
  };
}
