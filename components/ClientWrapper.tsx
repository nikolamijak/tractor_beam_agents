'use client';

import { ReactNode, useEffect } from 'react';
import { ErrorBoundary } from './ErrorBoundary';

/**
 * Client Wrapper Component
 * Wraps the app with error boundary and client-side error handling
 *
 * Note: This suppresses React 19 + Firefox DevTools compatibility warnings
 * See: https://github.com/facebook/react/issues/31452
 */
export function ClientWrapper({ children }: { children: ReactNode }) {
  useEffect(() => {
    // Suppress Firefox DevTools errors on client-side
    if (typeof window !== 'undefined') {
      const originalError = console.error;
      const originalWarn = console.warn;

      // Intercept console.error
      console.error = function (...args) {
        const errorStr = String(args[0] || '');
        // Suppress known Firefox + React 19 DevTools errors
        if (
          errorStr.includes('__reactContextDevtoolDebugId') ||
          errorStr.includes("can't access property") ||
          errorStr.includes('_context is undefined') ||
          errorStr.includes('e.type._context is undefined')
        ) {
          return; // Silently ignore - this is a DevTools issue, not app functionality
        }
        originalError.apply(console, args);
      };

      // Intercept console.warn for hydration warnings
      console.warn = function (...args) {
        const warnStr = String(args[0] || '');
        if (
          warnStr.includes('hydration') ||
          warnStr.includes('Hydration')
        ) {
          return; // Silently ignore hydration warnings
        }
        originalWarn.apply(console, args);
      };

      // Clean up on unmount
      return () => {
        console.error = originalError;
        console.warn = originalWarn;
      };
    }
  }, []);

  return <ErrorBoundary>{children}</ErrorBoundary>;
}
