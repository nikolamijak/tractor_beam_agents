/**
 * Provider Health API
 * GET /api/providers/health - Check health status of all registered providers
 */

import { NextResponse } from 'next/server';
import { getProviderRegistry } from '@/lib/providers';

export async function GET() {
  try {
    const registry = getProviderRegistry();
    const healthStatuses = await registry.getAllProviderHealth();

    return NextResponse.json({
      providers: healthStatuses.map(({ provider, status }) => ({
        provider,
        status: status.status,
        latencyMs: status.latencyMs,
        checkedAt: status.checkedAt,
        error: status.error,
      })),
      timestamp: new Date(),
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to check provider health', details: errorMessage },
      { status: 500 }
    );
  }
}
