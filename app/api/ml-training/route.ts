import { NextRequest, NextResponse } from 'next/server';
import {
  mlModelTrainingService,
  type TrainingDataPoint,
} from '@/services/mlModelTrainingService';

export const dynamic = 'force-dynamic';

/**
 * GET: Retrieve model information, training status, and schedule
 * POST: Start training, manage models, or add training data
 */
export async function GET(request: NextRequest) {
  const action = request.nextUrl.searchParams.get('action') || 'models';

  try {
    switch (action) {
      case 'models':
        return NextResponse.json({
          success: true,
          models: mlModelTrainingService.getAllModels().map((m) => ({
            id: m.id,
            version: m.version,
            accuracy: m.metrics.accuracy,
            mae: m.metrics.mae,
            rmse: m.metrics.rmse,
            trainingSize: m.metrics.trainingSize,
            generalizedWell: m.metrics.generalizedWell,
            createdAt: m.createdAt,
            isActive: m.isActive,
            trainingDuration: m.trainingDuration,
            featureImportance: m.metrics.featureImportance,
          })),
          activeModel: mlModelTrainingService.getActiveModel()
            ? {
                id: mlModelTrainingService.getActiveModel()?.id,
                version: mlModelTrainingService.getActiveModel()?.version,
              }
            : null,
          timestamp: Date.now(),
        });

      case 'model':
        const modelId = request.nextUrl.searchParams.get('id');
        if (!modelId) {
          return NextResponse.json(
            { error: 'Model ID required' },
            { status: 400 }
          );
        }

        const model = mlModelTrainingService.getModel(modelId);
        if (!model) {
          return NextResponse.json(
            { error: 'Model not found' },
            { status: 404 }
          );
        }

        return NextResponse.json({
          success: true,
          model: {
            id: model.id,
            version: model.version,
            metrics: model.metrics,
            isActive: model.isActive,
            status: model.status,
          },
        });

      case 'training-status': {
        const jobId = request.nextUrl.searchParams.get('jobId');
        if (!jobId) {
          return NextResponse.json(
            { error: 'Job ID required' },
            { status: 400 }
          );
        }

        const job = mlModelTrainingService.getJobStatus(jobId);
        if (!job) {
          return NextResponse.json(
            { error: 'Job not found' },
            { status: 404 }
          );
        }

        return NextResponse.json({
          success: true,
          job: {
            jobId: job.jobId,
            status: job.status,
            progress: job.progress,
            error: job.error,
            model: job.model
              ? {
                  id: job.model.id,
                  version: job.model.version,
                  metrics: job.model.metrics,
                }
              : null,
          },
        });
      }

      case 'data-size':
        return NextResponse.json({
          success: true,
          trainingDataSize: mlModelTrainingService.getTrainingDataSize(),
          dataPointsNeeded: 100,
          isSufficient: mlModelTrainingService.getTrainingDataSize() >= 100,
        });

      case 'schedule':
        return NextResponse.json({
          success: true,
          schedule: mlModelTrainingService.getRetrainingSchedule(),
        });

      case 'history':
        return NextResponse.json({
          success: true,
          history: mlModelTrainingService.getTrainingHistory(),
        });

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Error in ML training API:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const action = request.nextUrl.searchParams.get('action') || 'train';

  try {
    const body = await request.json().catch(() => ({}));

    switch (action) {
      case 'train': {
        // Start a training job
        const job = mlModelTrainingService.startTrainingJob();

        return NextResponse.json({
          success: true,
          job: {
            jobId: job.jobId,
            status: job.status,
            progress: job.progress,
          },
          message: 'Training job started',
          timestamp: Date.now(),
        });
      }

      case 'add-training-data': {
        // Add a single training data point
        if (!body.trainNumber || body.actualDelay === undefined) {
          return NextResponse.json(
            { error: 'Missing required fields: trainNumber, actualDelay' },
            { status: 400 }
          );
        }

        const dataPoint: TrainingDataPoint = {
          trainNumber: body.trainNumber,
          dayOfWeek: body.dayOfWeek || new Date().getDay(),
          hourOfDay: body.hourOfDay || new Date().getHours(),
          seasonality: body.seasonality || 2, // Spring
          routeDistance: body.routeDistance || 500,
          previousDelay: body.previousDelay || 0,
          weatherCondition: body.weatherCondition || 1,
          trafficDensity: body.trafficDensity || 50,
          haltCount: body.haltCount || 5,
          signallingStatus: body.signallingStatus || 1,
          actualDelay: body.actualDelay,
          timestamp: Date.now(),
        };

        mlModelTrainingService.addTrainingData(dataPoint);

        return NextResponse.json({
          success: true,
          message: 'Training data point added',
          dataSize: mlModelTrainingService.getTrainingDataSize(),
        });
      }

      case 'batch-training-data': {
        // Add multiple training data points
        if (!Array.isArray(body.dataPoints)) {
          return NextResponse.json(
            { error: 'Expected array of dataPoints' },
            { status: 400 }
          );
        }

        const dataPoints: TrainingDataPoint[] = body.dataPoints.map(
          (dp: Partial<TrainingDataPoint>) => ({
            trainNumber: dp.trainNumber || 'TRAIN-' + Math.random(),
            dayOfWeek: dp.dayOfWeek || new Date().getDay(),
            hourOfDay: dp.hourOfDay || new Date().getHours(),
            seasonality: dp.seasonality || 2,
            routeDistance: dp.routeDistance || 500,
            previousDelay: dp.previousDelay || 0,
            weatherCondition: dp.weatherCondition || 1,
            trafficDensity: dp.trafficDensity || 50,
            haltCount: dp.haltCount || 5,
            signallingStatus: dp.signallingStatus || 1,
            actualDelay: dp.actualDelay || Math.random() * 30,
            timestamp: Date.now(),
          })
        );

        mlModelTrainingService.addBatchTrainingData(dataPoints);

        return NextResponse.json({
          success: true,
          message: `Added ${dataPoints.length} training data points`,
          dataSize: mlModelTrainingService.getTrainingDataSize(),
        });
      }

      case 'activate-model': {
        // Activate a specific model
        if (!body.modelId) {
          return NextResponse.json(
            { error: 'Model ID required' },
            { status: 400 }
          );
        }

        const success = mlModelTrainingService.activateModel(body.modelId);

        if (!success) {
          return NextResponse.json(
            { error: 'Model not found' },
            { status: 404 }
          );
        }

        return NextResponse.json({
          success: true,
          message: `Model ${body.modelId} activated`,
          activeModel: mlModelTrainingService.getActiveModel(),
        });
      }

      case 'delete-model': {
        // Delete a model
        if (!body.modelId) {
          return NextResponse.json(
            { error: 'Model ID required' },
            { status: 400 }
          );
        }

        const success = mlModelTrainingService.deleteModel(body.modelId);

        if (!success) {
          return NextResponse.json(
            { error: 'Model not found' },
            { status: 404 }
          );
        }

        return NextResponse.json({
          success: true,
          message: `Model ${body.modelId} deleted`,
        });
      }

      case 'update-schedule': {
        // Update retraining schedule
        mlModelTrainingService.updateRetrainingSchedule({
          enabled: body.enabled,
          intervalDays: body.intervalDays || 7,
        });

        return NextResponse.json({
          success: true,
          schedule: mlModelTrainingService.getRetrainingSchedule(),
        });
      }

      case 'compare-models': {
        // Compare two models
        if (!body.modelId1 || !body.modelId2) {
          return NextResponse.json(
            { error: 'Missing modelId1 or modelId2' },
            { status: 400 }
          );
        }

        const comparison = mlModelTrainingService.compareModels(
          body.modelId1,
          body.modelId2
        );

        if (!comparison) {
          return NextResponse.json(
            { error: 'One or both models not found' },
            { status: 404 }
          );
        }

        return NextResponse.json({
          success: true,
          comparison,
        });
      }

      case 'export-model': {
        // Export model
        if (!body.modelId) {
          return NextResponse.json(
            { error: 'Model ID required' },
            { status: 400 }
          );
        }

        const modelData = mlModelTrainingService.exportModel(body.modelId);

        return NextResponse.json({
          success: true,
          modelData,
        });
      }

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Error in ML training API:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
