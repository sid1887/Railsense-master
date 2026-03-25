import { NextRequest, NextResponse } from 'next/server';
import { passengerAlertService, PassengerJourney } from '@/services/passengerAlertService';

/**
 * Passenger Alerts API
 * POST: Register journey and generate alerts
 * GET: Retrieve alerts for journey
 * DELETE: Dismiss alert
 */

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      journeyId,
      journey,
      alertType,
      alertData,
    } = body;

    if (!journeyId || !journey) {
      return NextResponse.json(
        { error: 'Missing journeyId or journey details' },
        { status: 400 }
      );
    }

    // Register journey
    const journeyData: PassengerJourney = {
      boardingStation: journey.boardingStation,
      boardingStationCode: journey.boardingStationCode || 'UNKNOWN',
      alightingStation: journey.alightingStation,
      alightingStationCode: journey.alightingStationCode || 'UNKNOWN',
      boardingTime: journey.boardingTime,
      expectedArrival: journey.expectedArrival,
      trainNumber: journey.trainNumber,
    };

    passengerAlertService.registerJourney(journeyId, journeyData);

    // If alert type specified, create alert
    let alertId: string | null = null;
    if (alertType === 'connection-miss' && alertData) {
      const alert = passengerAlertService.createConnectionMissAlert(
        journeyId,
        alertData.connectingTrain,
        alertData.boardingStation,
        alertData.boardingTime,
        alertData.estimatedArrival
      );
      alertId = alert.id;
    } else if (alertType === 'platform-change' && alertData) {
      const alert = passengerAlertService.createPlatformChangeAlert(
        journeyId,
        alertData.trainNumber,
        alertData.oldPlatform,
        alertData.newPlatform
      );
      alertId = alert.id;
    } else if (alertType === 'delay-warning' && alertData) {
      const alert = passengerAlertService.createDelayWarningAlert(
        journeyId,
        alertData.trainNumber,
        alertData.currentDelay,
        alertData.predictedDelay,
        alertData.riskLevel
      );
      alertId = alert.id;
    } else if (alertType === 'connection-tight' && alertData) {
      const alert = passengerAlertService.createConnectionTightAlert(
        journeyId,
        alertData.connectingTrain,
        alertData.bufferTime
      );
      alertId = alert.id;
    } else if (alertType === 'service-disruption' && alertData) {
      const alert = passengerAlertService.createServiceDisruptionAlert(
        journeyId,
        alertData.affectedSection,
        alertData.reason,
        alertData.estimatedDuration
      );
      alertId = alert.id;
    }

    return NextResponse.json(
      {
        success: true,
        journeyId,
        alertId,
        alerts: passengerAlertService.getAlerts(),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[PassengerAlerts API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const journeyId = searchParams.get('journeyId');

    // Get all alerts
    const alerts = passengerAlertService.getAlerts();

    return NextResponse.json(
      {
        alerts,
        unreadCount: alerts.filter((a) => !a.read).length,
        journeyId,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[PassengerAlerts API] Error:', error);
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

    const success = passengerAlertService.dismissAlert(alertId);

    if (!success) {
      return NextResponse.json(
        { error: 'Alert not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        alerts: passengerAlertService.getAlerts(),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[PassengerAlerts API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
