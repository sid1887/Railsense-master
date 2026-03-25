/**
 * OpenAPI 3.0 Specification for RailSense API
 * Auto-generated from code analysis
 * Version: 1.0.0
 */

import { NextRequest, NextResponse } from 'next/server';

const openApiSpec = {
  openapi: '3.0.0',
  info: {
    title: 'RailSense API',
    description: 'Railway Intelligence Platform - Real-time Train Tracking & Analytics',
    version: '1.0.0',
    contact: {
      name: 'RailSense Support',
      url: 'https://railsense.dev'
    },
    license: {
      name: 'MIT'
    }
  },
  servers: [
    {
      url: 'http://localhost:3000/api',
      description: 'Development Server'
    },
    {
      url: 'https://api.railsense.dev',
      description: 'Production Server'
    }
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'JWT token in Authorization header (Bearer token)'
      }
    },
    schemas: {
      User: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          email: { type: 'string', format: 'email' },
          name: { type: 'string' },
          role: { type: 'string', enum: ['user', 'admin'] },
          created_at: { type: 'string', format: 'date-time' },
          last_login: { type: 'string', format: 'date-time' }
        }
      },
      TrainPosition: {
        type: 'object',
        properties: {
          train_number: { type: 'string' },
          train_name: { type: 'string' },
          latitude: { type: 'number' },
          longitude: { type: 'number' },
          current_station: { type: 'string' },
          status: { type: 'string' },
          delay_minutes: { type: 'integer' },
          speed_kmph: { type: 'number' },
          progress_percent: { type: 'integer' },
          updated_at: { type: 'string', format: 'date-time' }
        }
      },
      TrainRoute: {
        type: 'object',
        properties: {
          train_number: { type: 'string' },
          route_id: { type: 'string' },
          stops: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                latitude: { type: 'number' },
                longitude: { type: 'number' },
                arrival_time: { type: 'string' },
                departure_time: { type: 'string' },
                sequence: { type: 'integer' }
              }
            }
          }
        }
      },
      Alert: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          user_id: { type: 'integer' },
          train_number: { type: 'string' },
          alert_type: { type: 'string' },
          message: { type: 'string' },
          severity: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
          read: { type: 'boolean' },
          created_at: { type: 'string', format: 'date-time' }
        }
      },
      Prediction: {
        type: 'object',
        properties: {
          train_number: { type: 'string' },
          prediction_type: { type: 'string', enum: ['eta', 'halt', 'crowding'] },
          predicted_value: { type: 'number' },
          confidence: { type: 'number', minimum: 0, maximum: 100 },
          created_at: { type: 'string', format: 'date-time' }
        }
      },
      PredictionResult: {
        type: 'object',
        properties: {
          eta_minutes: { type: 'number', description: 'Estimated minutes to destination' },
          halt_probability: { type: 'number', description: 'Probability of halt (0-1)' },
          crowding_level: { type: 'string', enum: ['low', 'medium', 'high', 'full'] }
        }
      },
      ErrorResponse: {
        type: 'object',
        properties: {
          error: { type: 'string' },
          details: { type: 'object' }
        }
      }
    }
  },
  paths: {
    '/auth/signup': {
      post: {
        tags: ['Authentication'],
        summary: 'Register a new user',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string', format: 'email' },
                  password: { type: 'string', minLength: 6 },
                  name: { type: 'string' }
                }
              }
            }
          }
        },
        responses: {
          '201': {
            description: 'User created successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    message: { type: 'string' },
                    user: { $ref: '#/components/schemas/User' },
                    accessToken: { type: 'string' },
                    refreshToken: { type: 'string' },
                    expiresIn: { type: 'integer' }
                  }
                }
              }
            }
          },
          '400': { description: 'Invalid input' },
          '409': { description: 'User already exists' }
        }
      }
    },
    '/auth/signin': {
      post: {
        tags: ['Authentication'],
        summary: 'Login user',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string', format: 'email' },
                  password: { type: 'string' }
                }
              }
            }
          }
        },
        responses: {
          '200': {
            description: 'Login successful',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    message: { type: 'string' },
                    user: { $ref: '#/components/schemas/User' },
                    accessToken: { type: 'string' },
                    refreshToken: { type: 'string' },
                    expiresIn: { type: 'integer' }
                  }
                }
              }
            }
          },
          '401': { description: 'Invalid credentials' }
        }
      }
    },
    '/auth/refresh': {
      post: {
        tags: ['Authentication'],
        summary: 'Refresh access token',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['refreshToken'],
                properties: {
                  refreshToken: { type: 'string' }
                }
              }
            }
          }
        },
        responses: {
          '200': {
            description: 'Token refreshed',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    accessToken: { type: 'string' },
                    expiresIn: { type: 'integer' },
                    tokenType: { type: 'string' }
                  }
                }
              }
            }
          },
          '401': { description: 'Invalid refresh token' }
        }
      }
    },
    '/auth/profile': {
      get: {
        tags: ['Authentication'],
        summary: 'Get current user profile',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'User profile',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/User' }
              }
            }
          },
          '401': { description: 'Unauthorized' },
          '404': { description: 'User not found' }
        }
      }
    },
    '/train/{trainNumber}': {
      get: {
        tags: ['Trains'],
        summary: 'Get train information and current position',
        parameters: [
          {
            name: 'trainNumber',
            in: 'path',
            required: true,
            schema: { type: 'string' },
            description: 'Train number'
          }
        ],
        responses: {
          '200': {
            description: 'Train details',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/TrainPosition' }
              }
            }
          },
          '404': { description: 'Train not found' }
        }
      }
    },
    '/train/{trainNumber}/route': {
      get: {
        tags: ['Trains'],
        summary: 'Get train route information',
        parameters: [
          {
            name: 'trainNumber',
            in: 'path',
            required: true,
            schema: { type: 'string' }
          }
        ],
        responses: {
          '200': {
            description: 'Train route',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/TrainRoute' }
              }
            }
          }
        }
      }
    },
    '/predict': {
      get: {
        tags: ['Predictions'],
        summary: 'Get ML predictions for a train',
        parameters: [
          {
            name: 'trainNumber',
            in: 'query',
            required: true,
            schema: { type: 'string' }
          },
          {
            name: 'type',
            in: 'query',
            schema: { type: 'string', enum: ['eta', 'halt', 'crowding'] }
          }
        ],
        responses: {
          '200': {
            description: 'Predictions',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Prediction' }
              }
            }
          }
        }
      }
    },
    '/stations': {
      get: {
        tags: ['Stations'],
        summary: 'Get nearby stations',
        parameters: [
          {
            name: 'latitude',
            in: 'query',
            required: true,
            schema: { type: 'number' }
          },
          {
            name: 'longitude',
            in: 'query',
            required: true,
            schema: { type: 'number' }
          },
          {
            name: 'radius',
            in: 'query',
            schema: { type: 'number', default: 50, description: 'Radius in km' }
          }
        ],
        responses: {
          '200': {
            description: 'List of nearby stations'
          }
        }
      }
    },
    '/health': {
      get: {
        tags: ['System'],
        summary: 'Health check endpoint',
        responses: {
          '200': {
            description: 'System is healthy',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', enum: ['ok', 'degraded', 'down'] },
                    timestamp: { type: 'string', format: 'date-time' },
                    database: { type: 'string' }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
};

export async function GET(req: NextRequest) {
  return NextResponse.json(openApiSpec, {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    }
  });
}
