/**
 * Next.js Instrumentation
 * Sets up and launches DBOS when the server starts
 * See: https://nextjs.org/docs/app/guides/instrumentation
 */
import { initializeDBOS } from './lib/dbos';

export async function register() {
  // Only run on Node.js runtime (not Edge)
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    try {
      console.log('[Instrumentation] Initializing DBOS...');

      // Import initialization function
      // const { initializeDBOS } = await import('./lib/dbos/init');

      // Initialize DBOS fully (configure + launch + register workflows)
      await initializeDBOS();

      console.log('[Instrumentation] ✅ DBOS initialized and ready');
    } catch (error) {
      console.error('[Instrumentation] ❌ Failed to initialize DBOS:', error);
      // Don't throw - log the error but allow server to continue
      // This prevents the entire app from crashing on DBOS init failure
    }
  }
}
