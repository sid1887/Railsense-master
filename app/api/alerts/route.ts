import { NextRequest, NextResponse } from 'next/server';
import { alertManager, Alert, AlertType } from '@/services/alertManager';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      type,
      category = 'system',
      title,
      message,
      trainNumber,
      sectionCode,
      dismissible = true,
      expiresIn,
      sound = false
    } = body;

    if (!type || !title || !message) {
      return NextResponse.json(
        { error: 'Missing required fields: type, title, message' },
        { status: 400 }
      );
    }

    // Create alert object matching the Alert interface
    const alertData = {
      type: type as AlertType,
      category,
      title,
      message,
      trainNumber,
      sectionCode,
      dismissible,
      expiresIn,
      sound
    };

    // Filter out undefined fields
    const filteredData = Object.fromEntries(
      Object.entries(alertData).filter(([, v]) => v !== undefined)
    );

    const alertId = alertManager.addAlert(filteredData as any);

    return NextResponse.json({ success: true, alertId }, { status: 201 });
  } catch (error) {
    console.error('[Alerts API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const filterType = searchParams.get('type');

    let alerts = alertManager.getAlerts();

    if (filterType) {
      alerts = alerts.filter(a => a.type === filterType);
    }

    return NextResponse.json({ alerts }, { status: 200 });
  } catch (error) {
    console.error('[Alerts API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const alertId = searchParams.get('id');

    if (!alertId) {
      return NextResponse.json(
        { error: 'Missing alert ID' },
        { status: 400 }
      );
    }

    const success = alertManager.removeAlert(alertId);

    if (!success) {
      return NextResponse.json(
        { error: 'Alert not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('[Alerts API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
