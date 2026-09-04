import { api } from '@/services/api';
import {
  AnalyticsSummary,
  BackendAnalyticsSummary,
  BackendAnalyticsTrendItem,
  BackendZoneAnalyticsItem,
  KpiMetrics,
  PriorityDistribution,
  StatusDistribution,
  TrendDataPoint,
  ZoneMetric,
} from '@/types/analytics';

const STATUS_COLOR_MAP: Record<string, string> = {
  DETECTED: '#E11D48',
  Detected: '#E11D48',
  New: '#E11D48',
  VERIFIED: '#2563EB',
  Verified: '#2563EB',
  ASSIGNED: '#D97706',
  Assigned: '#D97706',
  IN_PROGRESS: '#059669',
  'In Progress': '#059669',
  'Work in Progress': '#059669',
  RE_INSPECTION: '#0891B2',
  'Re-inspection': '#0891B2',
  'Needs Follow-up': '#0891B2',
  CLOSED: '#64748B',
  Closed: '#64748B',
  Resolved: '#64748B',
  REJECTED: '#EF4444',
  Rejected: '#EF4444',
};

const formatStatusLabel = (rawStatus: string): string => {
  switch (rawStatus.toUpperCase()) {
    case 'DETECTED':
      return 'New';
    case 'VERIFIED':
      return 'Verified';
    case 'ASSIGNED':
      return 'Assigned';
    case 'IN_PROGRESS':
      return 'Work in Progress';
    case 'RE_INSPECTION':
      return 'Needs Follow-up';
    case 'CLOSED':
      return 'Resolved';
    case 'REJECTED':
      return 'Rejected';
    default:
      return rawStatus;
  }
};

export const analyticsService = {
  /**
   * Fetch complete analytics summary by fetching summary, trends, and zone endpoints concurrently.
   */
  async getAnalyticsSummary(): Promise<AnalyticsSummary> {
    const [summaryRes, trendsRes, zonesRes] = await Promise.all([
      api.get<BackendAnalyticsSummary>('/analytics/summary'),
      api.get<BackendAnalyticsTrendItem[]>('/analytics/trends', { days: 7 }),
      api.get<BackendZoneAnalyticsItem[]>('/analytics/zones'),
    ]);

    const kpis: KpiMetrics = {
      totalActiveIncidents: summaryRes.kpis.total_active_incidents ?? 0,
      criticalP1Count: summaryRes.kpis.critical_p1_count ?? 0,
      highP2Count: summaryRes.kpis.high_p2_count ?? 0,
      routineP3Count: summaryRes.kpis.routine_p3_count ?? 0,
      waterloggedAreaSqm: summaryRes.kpis.waterlogged_area_sqm,
      potholeClustersCount: summaryRes.kpis.pothole_clusters_count ?? 0,
      pendingVerificationCount: summaryRes.kpis.pending_verification_count ?? 0,
      meanTimeToResolutionHours: summaryRes.kpis.mean_time_to_resolution_hours,
    };

    const statusDistribution: StatusDistribution[] = (summaryRes.status_distribution || []).map((item) => {
      const label = formatStatusLabel(item.status);
      return {
        status: label,
        count: item.count,
        color: STATUS_COLOR_MAP[item.status] || STATUS_COLOR_MAP[label] || '#0D9488',
      };
    });

    const priorityDistribution: PriorityDistribution[] = (summaryRes.priority_distribution || []).map((item) => ({
      priority: item.priority,
      count: item.count,
      color: item.priority === 'P1' ? '#EF4444' : item.priority === 'P2' ? '#F97316' : '#F59E0B',
    }));

    const trend: TrendDataPoint[] = (trendsRes || []).map((item) => ({
      date: item.date,
      waterlogging: item.waterlogging,
      potholes: item.potholes,
      drainage_overflow: item.drainage_overflow,
      damaged_footpath: item.damaged_footpath,
      open_manhole: item.open_manhole,
      rainfallMm: item.rainfall_mm,
    }));

    const zoneMetrics: ZoneMetric[] = (zonesRes || []).map((item) => ({
      zoneId: item.zone_id,
      zoneCode: item.zone_code,
      zoneName: item.zone_name,
      activeIncidents: item.active_incidents,
      waterloggedAreaSqm: item.waterlogged_area_sqm,
      p1Count: item.p1_count,
      p2Count: item.p2_count,
      p3Count: item.p3_count,
    }));

    const waterloggingCount = (trendsRes || []).reduce((acc, curr) => acc + (curr.waterlogging || 0), 0);
    const potholesCount = (trendsRes || []).reduce((acc, curr) => acc + (curr.potholes || 0), 0);
    const damagedFootpathCount = (trendsRes || []).reduce((acc, curr) => acc + (curr.damaged_footpath || 0), 0);
    const drainageOverflowCount = (trendsRes || []).reduce((acc, curr) => acc + (curr.drainage_overflow || 0), 0);
    const openManholeCount = (trendsRes || []).reduce((acc, curr) => acc + (curr.open_manhole || 0), 0);

    const typeDistribution = [
      { type: 'waterlogging' as const, name: 'Waterlogging', count: waterloggingCount, color: '#0d9488' },
      { type: 'pothole' as const, name: 'Potholes', count: potholesCount, color: '#f59e0b' },
      { type: 'damaged_footpath' as const, name: 'Damaged Footpath', count: damagedFootpathCount, color: '#f97316' },
      { type: 'drainage_overflow' as const, name: 'Drainage Overflow', count: drainageOverflowCount, color: '#06b6d4' },
      { type: 'open_manhole' as const, name: 'Open Manhole', count: openManholeCount, color: '#dc2626' },
    ];

    return {
      kpis,
      trend,
      zoneMetrics,
      statusDistribution,
      priorityDistribution,
      typeDistribution,
    };
  },

  /**
   * Fetch daily incident trends over requested days.
   */
  async getAnalyticsTrends(days = 7): Promise<TrendDataPoint[]> {
    const rawTrends = await api.get<BackendAnalyticsTrendItem[]>('/analytics/trends', { days });
    return (rawTrends || []).map((item) => ({
      date: item.date,
      waterlogging: item.waterlogging,
      potholes: item.potholes,
      drainage_overflow: item.drainage_overflow,
      damaged_footpath: item.damaged_footpath,
      open_manhole: item.open_manhole,
      rainfallMm: item.rainfall_mm,
    }));
  },

  /**
   * Fetch zone operational risk metrics.
   */
  async getAnalyticsZones(): Promise<ZoneMetric[]> {
    const rawZones = await api.get<BackendZoneAnalyticsItem[]>('/analytics/zones');
    return (rawZones || []).map((item) => ({
      zoneId: item.zone_id,
      zoneCode: item.zone_code,
      zoneName: item.zone_name,
      activeIncidents: item.active_incidents,
      waterloggedAreaSqm: item.waterlogged_area_sqm,
      p1Count: item.p1_count,
      p2Count: item.p2_count,
      p3Count: item.p3_count,
    }));
  },

  /**
   * Fetch only KPI summary metrics.
   */
  async getKpiMetrics(): Promise<KpiMetrics> {
    const summary = await this.getAnalyticsSummary();
    return summary.kpis;
  },
};
