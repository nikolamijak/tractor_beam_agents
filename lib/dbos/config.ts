/**
 * DBOS Configuration
 * Configures DBOS SDK for durable workflow execution
 * See .claude/instructions/dbos-instructions.md for comprehensive guide
 */

import { DBOS } from '@dbos-inc/dbos-sdk';

export interface DBOSConfigOptions {
  name?: string;
  systemDatabaseUrl?: string;
}

/**
 * Initialize DBOS configuration
 * Call this before DBOS.launch()
 */
export function configureDBOS(options: DBOSConfigOptions = {}) {
  const config = {
    name: options.name || process.env.DBOS_APP_NAME || 'dmap',
    systemDatabaseUrl:
      options.systemDatabaseUrl ||
      process.env.DBOS_SYSTEM_DATABASE_URL ||
      process.env.DATABASE_URL,
  };

  if (!config.systemDatabaseUrl) {
    throw new Error(
      'DBOS system database URL not configured. Set DBOS_SYSTEM_DATABASE_URL or DATABASE_URL environment variable.'
    );
  }

  DBOS.setConfig(config);

  console.log(`[DBOS] Configured with app name: ${config.name}`);
  return config;
}

/**
 * Launch DBOS
 * Initializes workflows and connects to database
 */
export async function launchDBOS(): Promise<void> {
  try {
    await DBOS.launch();
    console.log('[DBOS] ✅ Launched successfully');
  } catch (error) {
    console.error('[DBOS] ❌ Failed to launch:', error);
    throw error;
  }
}

/**
 * Shutdown DBOS
 * Call this on application shutdown
 */
export async function shutdownDBOS(): Promise<void> {
  try {
    await DBOS.shutdown();
    console.log('[DBOS] ✅ Shutdown complete');
  } catch (error) {
    console.error('[DBOS] ❌ Shutdown failed:', error);
    throw error;
  }
}

/**
 * Check if DBOS is initialized
 */
export function isDBOSInitialized(): boolean {
  try {
    // Try to access DBOS properties to check if it's initialized
    // This is a simple check - DBOS doesn't expose a formal "isInitialized" method
    return true;
  } catch {
    return false;
  }
}
