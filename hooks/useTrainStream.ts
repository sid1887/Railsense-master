/**
 * useTrainStream Hook
 * Connects to Server-Sent Events endpoint for real-time train status updates
 * Handles automatic reconnection and error recovery
 *
 * Usage:
 * const { data, status, error } = useTrainStream('12728');
 */

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { TrainData } from '@/types/train';

interface UseTrainStreamOptions {
  onError?: (error: Error) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  retryAttempts?: number;
  retryDelay?: number;
}

type StreamStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

interface UseTrainStreamResult {
  data: TrainData | null;
  status: StreamStatus;
  error: Error | null;
  reconnect: () => void;
}

export function useTrainStream(
  trainNumber: string | null,
  options: UseTrainStreamOptions = {}
): UseTrainStreamResult {
  const {
    onError,
    onConnect,
    onDisconnect,
    retryAttempts = 3,
    retryDelay = 3000
  } = options;

  const [data, setData] = useState<TrainData | null>(null);
  const [status, setStatus] = useState<StreamStatus>('connecting');
  const [error, setError] = useState<Error | null>(null);

  const eventSourceRef = useRef<EventSource | null>(null);
  const retryCountRef = useRef<number>(0);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef<boolean>(true);

  const connect = useCallback(() => {
    if (!trainNumber || !isMountedRef.current) return;
    if (eventSourceRef.current) return; // Already connecting or connected

    console.log(`[Stream] Connecting to train ${trainNumber}...`);
    setStatus('connecting');

    try {
      const eventSource = new EventSource(`/api/train-stream?trainNumber=${trainNumber}`);

      eventSource.addEventListener('error', (event) => {
        console.error('[Stream] Connection error:', event);

        if (eventSource.readyState === EventSource.CLOSED) {
          eventSource.close();
          eventSourceRef.current = null;

          if (isMountedRef.current) {
            setStatus('disconnected');
            onDisconnect?.();

            // Attempt reconnection with exponential backoff
            if (retryCountRef.current < retryAttempts) {
              retryCountRef.current++;
              const delay = retryDelay * Math.pow(1.5, retryCountRef.current - 1);
              console.log(`[Stream] Reconnecting in ${delay}ms (attempt ${retryCountRef.current}/${retryAttempts})`);

              retryTimeoutRef.current = setTimeout(() => {
                connect();
              }, delay);
            } else {
              const retryError = new Error(`Failed to connect after ${retryAttempts} attempts`);
              setError(retryError);
              setStatus('error');
              onError?.(retryError);
            }
          }
        }
      });

      eventSource.addEventListener('message', (event) => {
        if (!isMountedRef.current) return;

        try {
          const message = JSON.parse(event.data);

          if (message.type === 'initial' || message.type === 'update') {
            setData(message.data);
            setError(null);

            // Reset retry counter on successful connection
            if (status !== 'connected') {
              retryCountRef.current = 0;
              setStatus('connected');
              onConnect?.();
            }
          }
        } catch (err) {
          console.error('[Stream] Error parsing message:', err);
        }
      });

      eventSourceRef.current = eventSource;
    } catch (err) {
      const connectError = err instanceof Error ? err : new Error(String(err));
      console.error('[Stream] Connection failed:', connectError);
      setError(connectError);
      setStatus('error');
      onError?.(connectError);
    }
  }, [trainNumber, status, onError, onConnect, onDisconnect, retryAttempts, retryDelay]);

  const disconnect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
    retryCountRef.current = 0;
    setStatus('disconnected');
  }, []);

  // Connect on mount or when trainNumber changes
  useEffect(() => {
    isMountedRef.current = true;

    if (trainNumber) {
      connect();
    } else {
      disconnect();
    }

    return () => {
      isMountedRef.current = false;
      disconnect();
    };
  }, [trainNumber, connect, disconnect]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, []);

  return {
    data,
    status,
    error,
    reconnect: connect
  };
}

/**
 * useTrainStreamUpdates Hook
 * Higher-level hook that combines polling with streaming for best performance
 * Falls back to polling if streaming fails
 */
export function useTrainStreamUpdates(
  trainNumber: string,
  options: UseTrainStreamOptions & { pollInterval?: number } = {}
) {
  const { pollInterval = process.env.NODE_ENV === 'development' ? 0 : 30000, ...streamOptions } = options;

  const [data, setData] = useState<TrainData | null>(null);
  const [status, setStatus] = useState<StreamStatus>('connecting');
  const [error, setError] = useState<Error | null>(null);
  const [usingStream, setUsingStream] = useState(true);

  const streamResult = useTrainStream(trainNumber, {
    ...streamOptions,
    onError: (err) => {
      console.log('[Updates] Stream failed, falling back to polling');
      setUsingStream(false);
      streamOptions.onError?.(err);
    }
  });

  // Polling fallback
  useEffect(() => {
    if (usingStream || !trainNumber || status === 'connected' || pollInterval <= 0) {
      return; // Using stream, skip polling, or polling disabled
    }

    const pollTrainData = async () => {
      try {
        const response = await fetch(`/api/train-details?trainNumber=${trainNumber}`);
        if (response.ok) {
          const insightData = await response.json();
          setData(insightData.trainData);
          setError(null);
        }
      } catch (err) {
        const pollError = err instanceof Error ? err : new Error(String(err));
        setError(pollError);
      }
    };

    // Poll immediately
    pollTrainData();

    // Then set up interval
    const interval = setInterval(pollTrainData, pollInterval);

    return () => clearInterval(interval);
  }, [usingStream, trainNumber, status, pollInterval]);

  // Use stream data when available
  useEffect(() => {
    if (streamResult.data) {
      setData(streamResult.data);
      setStatus(streamResult.status);
      setError(streamResult.error);
      setUsingStream(true);
    } else if (streamResult.status === 'error') {
      setStatus(streamResult.status);
      setError(streamResult.error);
    }
  }, [streamResult.data, streamResult.status, streamResult.error]);

  return {
    data,
    status,
    error,
    isStreaming: usingStream && status === 'connected',
    reconnect: streamResult.reconnect
  };
}
