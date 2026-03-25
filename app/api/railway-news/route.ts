/**
 * API Route: /api/railway-news
 * PHASE 9: Returns latest railway news from Google News RSS feed
 * Includes categorization, severity assessment, and train/route linking
 */

import { NextRequest, NextResponse } from 'next/server';
import { railwayNewsService } from '@/services/railwayNewsService';
import { buildApiResponse, SOURCE_QUALITY } from '@/services/apiResponseWrapper';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const category = searchParams.get('category');
    const trainNumber = searchParams.get('trainNumber');
    const critical = searchParams.get('critical');

    let newsData: any = null;
    let description = '';

    if (critical === 'true') {
      // Get only critical/high severity news
      newsData = await railwayNewsService.getCriticalNews();
      description = 'Critical railway news';
    } else if (trainNumber) {
      // Get news for specific train
      newsData = await railwayNewsService.getNewsForTrain(trainNumber);
      description = `News for train ${trainNumber}`;
    } else if (category) {
      // Get news by category
      newsData = await railwayNewsService.getNewsByCategory(
        category as 'delay' | 'accident' | 'incident' | 'safety' | 'maintenance' | 'other'
      );
      description = `${category} news`;
    } else {
      // Get latest news
      newsData = await railwayNewsService.getLatestNews();
      description = 'Latest railway news';
    }

    const response = NextResponse.json(
      buildApiResponse(
        {
          news: newsData,
          count: newsData.length,
          categories: {
            delay: newsData.filter((n: any) => n.category === 'delay').length,
            accident: newsData.filter((n: any) => n.category === 'accident').length,
            incident: newsData.filter((n: any) => n.category === 'incident').length,
            safety: newsData.filter((n: any) => n.category === 'safety').length,
            maintenance: newsData.filter((n: any) => n.category === 'maintenance').length,
          },
        },
        {
          overall: 75,
          location: 0,
          delay: 80,
          halt: 0,
          crowdLevel: 0,
          sources: [
            {
              name: 'google-news-rss',
              qualityScore: 85,
              lastUpdated: Date.now(),
              isCached: true,
              cacheTTLSeconds: 1800,
            },
          ],
        },
        true
      )
    );

    // Cache for 30 minutes (news updates less frequently)
    response.headers.set('Cache-Control', 'public, max-age=1800');
    response.headers.set('Content-Type', 'application/json');

    return response;
  } catch (error) {
    console.error('[railway-news API] Error:', error);
    return NextResponse.json(
      buildApiResponse(
        null,
        {
          overall: 0,
          location: 0,
          delay: 0,
          halt: 0,
          crowdLevel: 0,
          sources: [],
        },
        false,
        'Failed to fetch railway news'
      ),
      { status: 500 }
    );
  }
}
