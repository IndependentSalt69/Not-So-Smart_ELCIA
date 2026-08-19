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
  label: 'waterlogging' | 'pothole';
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
  type: 'waterlogging' | 'pothole' | 'clear';
  description: string;
  thumbnailUrl: string;
  mediaUrl: string;
  mediaType: 'image' | 'video';
  defaultTelemetry: DroneTelemetry;
}
