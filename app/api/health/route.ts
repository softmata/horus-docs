/**
 * HORUS Documentation - Health Check API
 *
 * GET /api/health - Check service health
 */

import { NextResponse } from 'next/server';

export async function GET() {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {
      documentation: 'healthy',
    },
    version: process.env.npm_package_version || '0.1.0',
  };

  return NextResponse.json(health, { status: 200 });
}
