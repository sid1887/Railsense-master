/**
 * Background Crawler Control Endpoint
 *
 * GET /api/crawler?action=...
 *
 * Actions:
 * - start: Start the background crawler
 * - stop: Stop the crawler
 * - status: Get crawler status
 * - force-crawl?train=12345: Crawl a specific train immediately
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  startBackgroundCrawler,
  stopBackgroundCrawler,
  getCrawlerStatus,
  getUncrawledTrains,
  forceCrawlTrain,
} from '@/services/backgroundRailwayCrawler';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const action = request.nextUrl.searchParams.get('action');
    const trainParam = request.nextUrl.searchParams.get('train');

    if (action === 'start') {
      const trainsPerInterval = parseInt(
        request.nextUrl.searchParams.get('trainsPer') || '5'
      );
      const intervalSeconds = parseInt(
        request.nextUrl.searchParams.get('interval') || '30'
      );

      startBackgroundCrawler(trainsPerInterval, intervalSeconds * 1000);

      return NextResponse.json({
        status: 'success',
        message: 'Background crawler started',
        config: {
          trainsPerInterval,
          intervalSeconds,
        },
      });
    }

    if (action === 'stop') {
      stopBackgroundCrawler();
      return NextResponse.json({
        status: 'success',
        message: 'Background crawler stopped',
      });
    }

    if (action === 'status') {
      const status = getCrawlerStatus();
      return NextResponse.json({
        status: 'success',
        data: status,
      });
    }

    if (action === 'uncrawled') {
      const uncrawled = getUncrawledTrains();
      return NextResponse.json({
        status: 'success',
        total: uncrawled.length,
        trains: uncrawled,
      });
    }

    if (action === 'force-crawl' && trainParam) {
      const result = await forceCrawlTrain(trainParam);
      return NextResponse.json({
        status: 'success',
        message: `Train ${trainParam} crawled`,
        data: result,
      });
    }

    // Default: return help
    return NextResponse.json({
      status: 'success',
      message: 'Background Crawler Control API',
      endpoints: {
        start: '/api/crawler?action=start&trainsPer=5&interval=30',
        stop: '/api/crawler?action=stop',
        status: '/api/crawler?action=status',
        uncrawled: '/api/crawler?action=uncrawled',
        'force-crawl': '/api/crawler?action=force-crawl&train=12955',
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error: error.message || 'Crawler operation failed',
      },
      { status: 500 }
    );
  }
}
