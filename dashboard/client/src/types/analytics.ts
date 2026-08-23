import { PriorityLevel, IncidentStatus } from './incident';

export interface KpiMetrics {
  totalActiveIncidents: number;
  criticalP1Count: number;
  highP2Count: number;
  routineP3Count: number;
  waterloggedAreaSqm: number | null;
  potholeClustersCount: number;
  pendingVerificationCount: number;
  meanTimeToResolutionHours: number | null;
}

export interface TrendDataPoint {
  date: string;
  waterlogging: number;
  potholes: number;
  rainfallMm: number | null;
}

export interface ZoneMetric {
  zoneId: string;
  zoneCode?: string;
  zoneName: string;
  activeIncidents: number;
  waterloggedAreaSqm: number | null;
  p1Count: number;
  p2Count: number;
  p3Count: number;
}

export interface StatusDistribution {
  status: string;
  count: number;
  color?: string;
}

export interface PriorityDistribution {
  priority: PriorityLevel;
  count: number;
  color?: string;
}

export interface AnalyticsSummary {
  kpis: KpiMetrics;
  trend: TrendDataPoint[];
  zoneMetrics: ZoneMetric[];
  statusDistribution: StatusDistribution[];
  priorityDistribution: PriorityDistribution[];
}

// Backend Response Schemas (snake_case)
export interface BackendAnalyticsKPI {
  total_active_incidents: number;
  critical_p1_count: number;
  high_p2_count: number;
  routine_p3_count: number;
  waterlogged_area_sqm: number | null;
  pothole_clusters_count: number;
  pending_verification_count: number;
  mean_time_to_resolution_hours: number | null;
}

export interface BackendStatusDistributionItem {
  status: IncidentStatus | string;
  count: number;
}

export interface BackendPriorityDistributionItem {
  priority: PriorityLevel;
  count: number;
}

export interface BackendAnalyticsSummary {
  kpis: BackendAnalyticsKPI;
  status_distribution: BackendStatusDistributionItem[];
  priority_distribution: BackendPriorityDistributionItem[];
}

export interface BackendAnalyticsTrendItem {
  date: string;
  waterlogging: number;
  potholes: number;
  rainfall_mm: number | null;
}

export interface BackendZoneAnalyticsItem {
  zone_id: string;
  zone_code: string;
  zone_name: string;
  active_incidents: number;
  waterlogged_area_sqm: number | null;
  p1_count: number;
  p2_count: number;
  p3_count: number;
}
