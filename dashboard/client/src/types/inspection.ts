/**
 * Types for Flight Inspection / Inspection Run frontend representation (TODO #4).
 * Matches Phase 2 backend aggregation response schemas.
 */

import { BackendIncidentItem, Incident } from './incident';
import { VideoVerification } from './verification';

export type FlightRunStatus =
  | 'COMPLETED'
  | 'PENDING_REVIEW'
  | 'CONFIRMED_CLEAR'
  | 'ANOMALY_REPORTED'
  | 'PROCESSING'
  | 'QUEUED'
  | 'FAILED';

export interface FlightInspectionRunSummary {
  job_id: string;
  job_prefix: string;
  zone_id?: string | null;
  zone_code?: string | null;
  total_hazards: number;
  class_counts: Record<string, number>;
  priority_counts: Record<string, number>;
  status: FlightRunStatus | string;
  created_at: string;
  completed_at?: string | null;
  annotated_video_url?: string | null;
  has_human_report: boolean;
}

export interface FlightInspectionRunListResponse {
  items: FlightInspectionRunSummary[];
  total: number;
  skip: number;
  limit: number;
}

export interface FlightInspectionRunDetail {
  summary: FlightInspectionRunSummary;
  incidents: BackendIncidentItem[];
  verification?: VideoVerification | null;
}

export interface FlightInspectionRunDetailParsed {
  summary: FlightInspectionRunSummary;
  incidents: Incident[];
  verification?: VideoVerification | null;
}
