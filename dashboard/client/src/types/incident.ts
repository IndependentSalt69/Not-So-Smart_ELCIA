export type IncidentType = 'waterlogging' | 'pothole';

export type PriorityLevel = 'P1' | 'P2' | 'P3';

export type IncidentStatus =
  | 'DETECTED'
  | 'VERIFIED'
  | 'REJECTED'
  | 'ASSIGNED'
  | 'IN_PROGRESS'
  | 'RE_INSPECTION'
  | 'CLOSED';

export type ZoneId = 'EC-01' | 'EC-02' | 'EC-03' | 'EC-04';

export interface SeverityFactors {
  waterExtent: number; // 0.0 - 10.0 or percentage (e.g. 78%)
  waterExtentLabel?: string;
  persistenceSeconds: number; // Duration in seconds (e.g. 42s)
  roadObstruction: number; // 0.0 - 10.0 score
  roadObstructionLabel?: string; // e.g. "Dual-lane blockage"
  roadCriticality: number; // 0.0 - 10.0 score
  roadCriticalityLabel?: string; // e.g. "Arterial Corridor"
  explanation: string[];
}

export interface IncidentHistoryEntry {
  status: IncidentStatus;
  timestamp: string;
  actor: string;
  notes?: string;
}

export interface Incident {
  id: string; // e.g., "EC-0142"
  type: IncidentType;
  confidence: number; // 0.0 to 1.0 (e.g. 0.94 -> 94%)
  severity: number; // 0.0 to 10.0
  priority: PriorityLevel;
  timestamp: string; // ISO String or relative format
  zone: string; // "Phase 1 - Hosur Arterial"
  zoneId: ZoneId;
  locationDescription: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  durationSeconds: number;
  evidenceFrame: string; // image URL / path
  evidenceOverlay?: string; // segmentation mask / bounding box image URL
  evidenceClip?: string; // sample video clip URL
  severityFactors: SeverityFactors;
  recommendedAction: string;
  owner?: string;
  status: IncidentStatus;
  history: IncidentHistoryEntry[];
}

export interface IncidentFilters {
  type?: IncidentType | 'all';
  priority?: PriorityLevel | 'all';
  status?: IncidentStatus | 'all';
  zoneId?: ZoneId | 'all';
  searchQuery?: string;
}

export type SortField = 'severity' | 'timestamp' | 'priority' | 'confidence';
export type SortDirection = 'asc' | 'desc';
