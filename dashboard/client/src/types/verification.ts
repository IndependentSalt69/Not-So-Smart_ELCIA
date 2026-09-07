export type VerificationStatus = 'PENDING_REVIEW' | 'CONFIRMED_CLEAR' | 'ANOMALY_REPORTED';

export interface VideoVerification {
  id: string;
  job_id: string;
  video_filename: string;
  video_path: string;
  annotated_video_url?: string | null;
  telemetry_path?: string | null;
  zone_id?: string | null;
  custom_zone_name?: string | null;
  drone_id?: string | null;
  ai_hazard_count: number;
  status: VerificationStatus;
  reviewer_id?: string | null;
  reviewed_at?: string | null;
  review_notes?: string | null;
  created_incident_id?: string | null;
  created_at: string;
  updated_at: string;
}

export interface VideoVerificationListResponse {
  items: VideoVerification[];
  total: number;
  skip: number;
  limit: number;
}

export interface ConfirmClearPayload {
  reviewer_id?: string;
  notes?: string;
}

export interface ReportAnomalyPayload {
  reviewer_id?: string;
  hazard_type: 'WATERLOGGING' | 'POTHOLE' | 'DRAINAGE_OVERFLOW' | 'DAMAGED_FOOTPATH' | 'OPEN_MANHOLE';
  priority: 'P1' | 'P2' | 'P3';
  severity_score: number;
  description?: string;
  timestamp_sec?: number;
  frame_number?: number;
  zone_id?: string;
  custom_zone_name?: string;
  location?: {
    type: 'Point';
    coordinates: [number, number];
  };
}

export interface ReportAnomalyResponse {
  verification: VideoVerification;
  incident: {
    id: string;
    incident_code: string;
    incident_type: string;
    priority: string;
    severity_score: number;
    status: string;
    zone_id: string;
    created_at: string;
  };
  message: string;
}
