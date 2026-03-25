import { NextRequest, NextResponse } from 'next/server';
import { getTrainTimetable } from '@/services/timetableScraper';

export const dynamic = 'force-dynamic';

interface Params {
  params: Promise<{
    trainNumber: string;
  }>;
}

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const { trainNumber } = await params;
    const forceRefresh = request.nextUrl.searchParams.get('refresh') === '1';

    const train = await getTrainTimetable(trainNumber, forceRefresh);

    if (!train) {
      return NextResponse.json(
        { error: `Train ${trainNumber} not found in timetable cache` },
        { status: 404 }
      );
    }

    return NextResponse.json({
      trainNumber: train.trainNumber,
      route: train.route,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch train route' },
      { status: 500 }
    );
  }
}
