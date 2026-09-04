import { IncidentType, PriorityLevel, SeverityFactors, ZoneId } from './incident';

export interface DroneTelemetry {
  droneId: string;
  cameraModel: string;
  altitudeMeters: number;
  speedMps: number;
  zoneId: ZoneId;
  locationDescription: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  timestamp: string;
}

export interface DetectedBoundingBox {
  id: string;
  label: IncidentType | 'clear';
  confidence: number;
  x: number; // percentage
  y: number; // percentage
  width: number; // percentage
  height: number; // percentage
}

export interface InferenceStage {
  name: string;
  description: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number; // 0 - 100
}

export interface InferenceResult {
  id: string;
  type: IncidentType | 'clear';
  confidence: number;
  severity: number;
  priority: PriorityLevel;
  waterAreaSqm?: number;
  potholeDepthCm?: number;
  boundingBoxes: DetectedBoundingBox[];
  originalMediaUrl: string;
  overlayMediaUrl: string;
  mediaType: 'image' | 'video';
  telemetry: DroneTelemetry;
  severityFactors: SeverityFactors;
  recommendedAction: string;
  analysisDurationMs: number;
}

export interface SampleFootagePreset {
  id: string;
  title: string;
  type: IncidentType | 'clear';
  description: string;
  thumbnailUrl: string;
  mediaUrl: string;
  mediaType: 'image' | 'video';
  defaultTelemetry: DroneTelemetry;
}

export type ProcessJobStatus = 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

export interface ProcessJobResponse {
  job_id: string;
  status: ProcessJobStatus;
  message: string;
  created_at: string;
}

export interface ProcessJobSummary {
  total_hazards: number;
  incidents_created: number;
  detections_created: number;
  evidence_created: number;
  skipped: number;
  failed: number;
  missing_gps: number;
  class_counts: Record<string, number>;
}

export interface ProcessJobResults {
  summary: ProcessJobSummary;
  incident_ids: string[];
  output_video_path: string;
  output_video_url: string;
  telemetry_file: string;
  evidence_dir: string;
  evidence_count: number;
}

export interface ProcessJobStatusResponse {
  job_id: string;
  status: ProcessJobStatus;
  progress_pct: number;
  current_stage: string;
  hazards_detected: number;
  evidence_count: number;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  error: string | null;
  results: ProcessJobResults | null;
}

export type ZoneDetectionStatus = 'AUTO_DETECTED' | 'MULTI_ZONE' | 'NO_MATCH' | 'NO_GPS' | 'MANUAL';

export interface ZoneMatchItem {
  zone_id: string;
  code: string;
  name: string;
  count: number;
  percentage: number;
}

export interface ZoneDetectionResponse {
  status: 'AUTO_DETECTED' | 'MULTI_ZONE' | 'NO_MATCH' | 'NO_GPS';
  detected_zone_id: string | null;
  detected_zone_code: string | null;
  detected_zone_name: string | null;
  confidence: number;
  total_points: number;
  matched_points: number;
  breakdown: ZoneMatchItem[];
  message: string;
}

