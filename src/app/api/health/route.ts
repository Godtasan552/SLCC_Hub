import { NextResponse } from 'next/server';
import mongoose from 'mongoose';

/**
 * Health Check Endpoint
 * Used by Docker health checks and monitoring systems
 * Returns 200 if healthy, 503 if unhealthy
 */
export async function GET() {
  try {
    // Check database connection status
    const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
    
    // If database is not connected, return unhealthy status
    if (dbStatus !== 'connected') {
      return NextResponse.json(
        { 
          status: 'unhealthy', 
          database: dbStatus,
          message: 'Database connection is not established'
        },
        { status: 503 }
      );
    }

    // All checks passed
    return NextResponse.json({
      status: 'healthy',
      database: dbStatus,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  } catch (error) {
    // Catch any unexpected errors
    return NextResponse.json(
      { 
        status: 'unhealthy', 
        error: error instanceof Error ? error.message : 'Health check failed' 
      },
      { status: 503 }
    );
  }
}
