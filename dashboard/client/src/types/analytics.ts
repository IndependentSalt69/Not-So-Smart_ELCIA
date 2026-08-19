import { PriorityLevel, ZoneId } from './incident';

export interface KpiMetrics {
  totalActiveIncidents: number;
  criticalP1Count: number;
  highP2Count: number;
  routineP3Count: number;
  waterloggedAreaSqm: number;
  potholeClustersCount: number;
  pendingVerificationCount: number;
  meanTimeToResolutionHours: number;
}

export interface TrendDataPoint {
  date: string;
  waterlogging: number;
  potholes: number;
  rainfallMm: number;
}

export interface ZoneMetric {
  zoneId: ZoneId;
  zoneName: string;
  activeIncidents: number;
  waterloggedAreaSqm: number;
  p1Count: number;
  p2Count: number;
  p3Count: number;
}

export interface StatusDistribution {
  status: string;
  count: number;
  color: string;
}

export interface PriorityDistribution {
  priority: PriorityLevel;
  count: number;
  color: string;
}

export interface AnalyticsSummary {
  kpis: KpiMetrics;
  trend: TrendDataPoint[];
  zoneMetrics: ZoneMetric[];
  statusDistribution: StatusDistribution[];
  priorityDistribution: PriorityDistribution[];
}
