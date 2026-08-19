import { MOCK_ANALYTICS_DATA } from '@/data/mockAnalytics';
import { AnalyticsSummary, KpiMetrics } from '@/types/analytics';
import { incidentService } from './incidentService';

export const analyticsService = {
  /**
   * Fetch complete analytics summary
   */
  async getAnalyticsSummary(): Promise<AnalyticsSummary> {
    await new Promise((resolve) => setTimeout(resolve, 30));
    const incidents = await incidentService.getIncidents();

    // Compute live dynamic KPIs from current incidents list
    const active = incidents.filter((i) => i.status !== 'CLOSED' && i.status !== 'REJECTED');
    const p1 = active.filter((i) => i.priority === 'P1');
    const p2 = active.filter((i) => i.priority === 'P2');
    const p3 = active.filter((i) => i.priority === 'P3');
    const pendingVerification = incidents.filter((i) => i.status === 'DETECTED');

    // Approximate waterlogged surface area from active waterlogging incidents
    const waterloggedAreaSqm = active
      .filter((i) => i.type === 'waterlogging')
      .reduce((sum, i) => sum + Math.round(i.severity * 45), 0);

    const potholeClustersCount = active.filter((i) => i.type === 'pothole').length;

    const dynamicKpis: KpiMetrics = {
      totalActiveIncidents: active.length,
      criticalP1Count: p1.length,
      highP2Count: p2.length,
      routineP3Count: p3.length,
      waterloggedAreaSqm,
      potholeClustersCount,
      pendingVerificationCount: pendingVerification.length,
      meanTimeToResolutionHours: 1.4,
    };

    return {
      ...MOCK_ANALYTICS_DATA,
      kpis: dynamicKpis,
    };
  },

  /**
   * Fetch only KPI summary metrics
   */
  async getKpiMetrics(): Promise<KpiMetrics> {
    const summary = await this.getAnalyticsSummary();
    return summary.kpis;
  },
};
