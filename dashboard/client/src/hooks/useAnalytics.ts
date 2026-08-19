import { analyticsService } from '@/services/analyticsService';
import { incidentService } from '@/services/incidentService';
import { AnalyticsSummary } from '@/types/analytics';
import { useCallback, useEffect, useState } from 'react';

export function useAnalytics() {
  const [data, setData] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const summary = await analyticsService.getAnalyticsSummary();
      setData(summary);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch analytics');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnalytics();
    const unsubscribe = incidentService.subscribe(() => {
      fetchAnalytics();
    });
    return unsubscribe;
  }, [fetchAnalytics]);

  return {
    data,
    loading,
    error,
    refetch: fetchAnalytics,
  };
}
