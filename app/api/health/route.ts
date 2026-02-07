/**
 * Health check endpoint
 */

import { NextResponse } from 'next/server';
// import { getPool } from '@/lib/db/client';

export async function GET() {
  const status = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    database: 'disabled', // Database is currently disabled
  };

  // TODO: Test database connection (currently disabled)
  // try {
  //   const pool = getPool();
  //   await pool.query('SELECT 1');
  //   status.database = 'connected';
  // } catch (error) {
  //   status.status = 'degraded';
  //   status.database = 'disconnected';
  //   console.error('Database health check failed:', error);
  // }

  return NextResponse.json(status, {
    status: status.status === 'ok' ? 200 : 503,
  });
}
