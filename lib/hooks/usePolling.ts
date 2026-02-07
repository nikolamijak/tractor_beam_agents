import { useEffect, useState } from 'react';

interface PollingOptions {
  enabled?: boolean;
  initialInterval?: number;
  maxInterval?: number;
}

export function usePolling<T>(
  fetchFn: () => Promise<T>,
  shouldStopPolling: (data: T | null) => boolean,
  options: PollingOptions = {}
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!options.enabled) return;

    let interval = options.initialInterval || 500;
    const maxInterval = options.maxInterval || 2000;
    let timeoutId: NodeJS.Timeout;

    const poll = async () => {
      try {
        setLoading(true);
        const result = await fetchFn();
        setData(result);
        setError(null);

        if (shouldStopPolling(result)) {
          setLoading(false);
          return; // Stop polling
        }

        // Exponential backoff
        interval = Math.min(interval * 1.5, maxInterval);
        timeoutId = setTimeout(poll, interval);
      } catch (err) {
        setError(err as Error);
        setLoading(false);
      }
    };

    poll();
    return () => clearTimeout(timeoutId);
  }, [options.enabled, fetchFn, shouldStopPolling, options.initialInterval, options.maxInterval]);

  return { data, loading, error };
}
