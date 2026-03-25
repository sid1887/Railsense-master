import { NextRequest, NextResponse } from 'next/server';
import { getTrainsBetweenInsight } from '@/services/ntesIntelligenceService';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const fromStationCode = request.nextUrl.searchParams.get('from')?.trim();
    const toStationCode = request.nextUrl.searchParams.get('to')?.trim();

    if (!fromStationCode || !toStationCode) {
      return NextResponse.json({ error: 'from and to query params are required' }, { status: 400 });
    }

    const result = await getTrainsBetweenInsight(fromStationCode, toStationCode);
    if (!result) {
      return NextResponse.json({ success: false, error: 'Unable to resolve trains-between data' }, { status: 404 });
    }

    return NextResponse.json(
      {
        success: true,
        data: result,
      },
      {
        headers: {
          'Cache-Control': 'public, max-age=15',
        },
      }
    );
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Failed to fetch trains between stations',
      },
      { status: 500 }
    );
  }
}
