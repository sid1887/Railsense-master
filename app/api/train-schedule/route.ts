import { NextRequest, NextResponse } from 'next/server';
import { getTrainScheduleInsight } from '@/services/ntesIntelligenceService';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const trainNumber = request.nextUrl.searchParams.get('trainNumber')?.trim();
    if (!trainNumber) {
      return NextResponse.json({ error: 'trainNumber is required' }, { status: 400 });
    }

    const result = await getTrainScheduleInsight(trainNumber);
    if (!result) {
      return NextResponse.json({ success: false, error: 'Train schedule not found' }, { status: 404 });
    }

    return NextResponse.json(
      {
        success: true,
        data: result,
      },
      {
        headers: {
          'Cache-Control': 'public, max-age=120',
        },
      }
    );
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Failed to fetch train schedule',
      },
      { status: 500 }
    );
  }
}
