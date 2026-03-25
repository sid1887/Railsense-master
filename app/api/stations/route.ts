import { NextRequest, NextResponse } from 'next/server';
import { getTimetableDataset } from '@/services/timetableScraper';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const forceRefresh = request.nextUrl.searchParams.get('refresh') === '1';
    const dataset = await getTimetableDataset(forceRefresh);

    return NextResponse.json({
      count: dataset.stations.length,
      stations: dataset.stations,
      lastUpdated: dataset.fetchedAt,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch stations' },
      { status: 500 }
    );
  }
}
