'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

/**
 * Error Boundary Component
 * Catches React errors and prevents app crashes
 * Particularly useful for Firefox + React 19 DevTools compatibility issues
 */
export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    // Check if this is a Firefox DevTools error that can be safely ignored
    const errorMessage = error?.message || '';
    const isDevToolsError =
      errorMessage.includes('__reactContextDevtoolDebugId') ||
      errorMessage.includes("can't access property");

    // If it's a DevTools error, don't show the error UI
    if (isDevToolsError) {
      console.warn('[ErrorBoundary] Suppressed Firefox DevTools error:', errorMessage);
      return { hasError: false };
    }

    // For other errors, show the error UI
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const errorMessage = error?.message || '';
    const isDevToolsError =
      errorMessage.includes('__reactContextDevtoolDebugId') ||
      errorMessage.includes("can't access property");

    if (!isDevToolsError) {
      console.error('[ErrorBoundary] Uncaught error:', error, errorInfo);
    }
  }

  public render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-8">
            <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 border border-red-200 dark:border-red-800">
              <div className="flex items-center mb-4">
                <div className="text-red-600 dark:text-red-400 text-2xl mr-3">⚠️</div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                  Something went wrong
                </h2>
              </div>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                An error occurred while rendering this page.
              </p>
              {this.state.error && (
                <details className="mb-4">
                  <summary className="cursor-pointer text-sm text-gray-700 dark:text-gray-300 font-medium">
                    Error details
                  </summary>
                  <pre className="mt-2 p-3 bg-gray-100 dark:bg-gray-900 rounded text-xs overflow-auto">
                    {this.state.error.message}
                  </pre>
                </details>
              )}
              <button
                onClick={() => window.location.reload()}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Reload Page
              </button>
            </div>
          </div>
        )
      );
    }

    return this.props.children;
  }
}
