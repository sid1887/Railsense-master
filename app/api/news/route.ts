/**
 * API Route: /api/news
 * Fetches relevant railway news articles for context
 * Query params: query (search query), region (country code, default IN)
 */

import { NextRequest, NextResponse } from 'next/server';
import type { NewsResponse } from '@/services/newsService';
import { fetchNews } from '@/services/newsService';
import { logger } from '@/services/logger';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const query = request.nextUrl.searchParams.get('query') || 'Indian railway';
    const region = request.nextUrl.searchParams.get('region') || 'IN';

    logger.info('News API called', { query, region });

    const newsData = await fetchNews(query, region);

    const response = NextResponse.json(newsData);
    // Cache for 30 minutes
    response.headers.set('Cache-Control', 'public, max-age=1800');
    return response;
  } catch (error: any) {
    logger.error('API Error - news:', { error: String(error) });

    return NextResponse.json(
      { error: error.message || 'Failed to fetch news articles', articles: [] },
      { status: 200 } // Return 200 even on error to prevent UI crashes
    );
  }
}
