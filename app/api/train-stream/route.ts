/**
 * API Route: /api/train-stream
 * Server-Sent Events endpoint for real-time train status updates
 * Provides continuous stream of train updates to connected clients
 *
 * Usage:
 * const eventSource = new EventSource('/api/train-stream?trainNumber=12728');
 * eventSource.onmessage = (event) => {
 *   const trainData = JSON.parse(event.data);
 * };
 */

import { NextRequest, NextResponse } from 'next/server';
import { getTrainData } from '@/services/trainDataService';

// Store active connections for monitoring
const activeConnections = new Map<string, NodeJS.Timeout>();

export async function GET(request: NextRequest) {
  const trainNumber = request.nextUrl.searchParams.get('trainNumber');

  if (!trainNumber) {
    return NextResponse.json(
      { error: 'Train number is required' },
      { status: 400 }
    );
  }

  // Create response with SSE headers
  const responseStream = new ReadableStream({
    async start(controller) {
      const connectionId = `${trainNumber}_${Date.now()}_${Math.random()}`;
      let intervalId: NodeJS.Timeout | null = null;

      try {
        // Send initial data
        const initialData = await getTrainData(trainNumber);
        if (initialData) {
          controller.enqueue(
            `data: ${JSON.stringify({
              type: 'initial',
              data: initialData,
              timestamp: Date.now()
            })}\n\n`
          );
        }

        // Set up interval for periodic updates (every 5 seconds)
        intervalId = setInterval(async () => {
          try {
            const trainData = await getTrainData(trainNumber);
            if (trainData) {
              controller.enqueue(
                `data: ${JSON.stringify({
                  type: 'update',
                  data: trainData,
                  timestamp: Date.now()
                })}\n\n`
              );
            }
          } catch (err) {
            console.error('[SSE] Error fetching train data:', err);
            controller.enqueue(`event: error\ndata: ${JSON.stringify({ error: 'Failed to fetch train data' })}\n\n`);
          }
        }, 5000);

        activeConnections.set(connectionId, intervalId);
        console.log(`[SSE] Client connected for train ${trainNumber} (${activeConnections.size} active)`);

        // Clean up on close
        request.signal.addEventListener('abort', () => {
          if (intervalId) clearInterval(intervalId);
          activeConnections.delete(connectionId);
          controller.close();
          console.log(`[SSE] Client disconnected for train ${trainNumber} (${activeConnections.size} active)`);
        });
      } catch (error) {
        console.error('[SSE] Stream error:', error);
        controller.enqueue(`event: error\ndata: ${JSON.stringify({ error: 'Stream error' })}\n\n`);
        controller.close();
      }
    }
  });

  return new NextResponse(responseStream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    },
  });
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  });
}

/**
 * Get statistics about active connections
 * Called from monitoring/debug endpoints
 */
function getStreamStats() {
  return {
    activeConnections: activeConnections.size,
    monitoredTrains: new Set(
      Array.from(activeConnections.keys()).map(id => id.split('_')[0])
    ).size
  };
}
