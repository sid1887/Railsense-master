import { NextRequest, NextResponse } from 'next/server';
import { getStationLiveInsight } from '@/services/ntesIntelligenceService';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const stationCode = request.nextUrl.searchParams.get('stationCode')?.trim();
    if (!stationCode) {
      return NextResponse.json({ error: 'stationCode is required' }, { status: 400 });
    }

    const result = await getStationLiveInsight(stationCode);

    return NextResponse.json(
      {
        success: true,
        data: result,
      },
      {
        headers: {
          'Cache-Control': 'public, max-age=20',
        },
      }
    );
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Failed to fetch station live data',
      },
      { status: 500 }
    );
  }
}
