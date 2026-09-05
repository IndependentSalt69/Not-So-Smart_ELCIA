import { generateSvgFrame, INITIAL_MOCK_INCIDENTS } from '@/data/mockIncidents';
import { canTransition } from '@/lib/stateMachine';
import { api, ApiError, getMediaBaseUrl, isMockDataEnabled } from '@/services/api';
import { notificationService } from '@/services/notificationService';

/**
 * Convert backend relative evidence path to browser-accessible static media URL
 */
export function getEvidenceMediaUrl(filePath?: string | null): string {
  if (!filePath) return '';
  if (
    filePath.startsWith('http://') ||
    filePath.startsWith('https://') ||
    filePath.startsWith('data:')
  ) {
    return filePath;
  }

  const origin = getMediaBaseUrl();
  const normalizedPath = filePath.replace(/\\/g, '/');

  // Map outputs/jobs/<job_id>/... -> /static/jobs/<job_id>/...
  const jobsMatch = normalizedPath.match(/(?:^|\/)outputs\/jobs\/([^\/]+)\/(.+)$/);
  if (jobsMatch) {
    const jobId = jobsMatch[1];
    const subPath = jobsMatch[2];
    return `${origin}/static/jobs/${jobId}/${subPath}`;
  }

  // Map outputs/evidence/<filename> -> /static/evidence/<filename>
  const evidenceMatch = normalizedPath.match(/(?:^|\/)outputs\/evidence\/([^\/]+)$/);
  if (evidenceMatch) {
    const filename = evidenceMatch[1];
    return `${origin}/static/evidence/${filename}`;
  }

  // Fallback filename extraction
  const cleanFilename = normalizedPath.replace(/^.*[\\\/]/, '');
  return `${origin}/static/evidence/${cleanFilename}`;
}

/**
 * Derive browser-accessible annotated video MP4 URL from evidence file path
 */
export function getIncidentVideoUrlFromEvidencePath(filePath?: string | null): string | null {
  if (!filePath) return null;

  if (
    (filePath.startsWith('http://') || filePath.startsWith('https://')) &&
    filePath.includes('annotated_output.mp4')
  ) {
    return filePath;
  }

  const origin = getMediaBaseUrl();
  const normalizedPath = filePath.replace(/\\/g, '/');

  // Match outputs/jobs/<job_id>/... or static/jobs/<job_id>/...
  const jobsMatch = normalizedPath.match(/(?:^|\/)(?:outputs|static)\/jobs\/([^\/]+)\//);
  if (jobsMatch && jobsMatch[1]) {
    const jobId = jobsMatch[1];
    return `${origin}/static/jobs/${jobId}/annotated_output.mp4`;
  }

  return null;
}




// In-memory cache & pending promise deduplicator for primary evidence media URLs
const primaryEvidenceCache = new Map<string, string | null>();
const pendingEvidencePromises = new Map<string, Promise<string | null>>();

import {
  ACTIVE_STATUSES,
  Assignment,
  AssignmentCreatePayload,
  BackendIncidentType,
  COMPLETED_STATUSES,
  DetectionObservation,
  EvidenceAsset,
  getIncidentTypeLabel,
  Incident,
  IncidentFilters,
  IncidentQueueCounts,
  IncidentQueueTab,
  IncidentStatus,
  IncidentType,
  InspectionCreatePayload,
  InspectionRecord,
  InspectionResult,
  mapBackendTypeToFrontend,
  mapFrontendTypeToBackend,
  PriorityLevel,
  REJECTED_STATUSES,
  SortDirection,
  SortField,
  User,
} from '@/types/incident';

export interface BackendIncidentItem {
  id: string;
  incident_code: string;
  incident_type: BackendIncidentType;
  confidence: number;
  severity_score: number;
  priority: 'P1' | 'P2' | 'P3';
  zone_id: string;
  status: IncidentStatus;
  started_at?: string | null;
  ended_at?: string | null;
  duration_seconds?: number | null;
  recommended_action?: string | null;
  location?: {
    type: 'Point';
    coordinates: [number, number];
  } | null;
  created_at: string;
  updated_at: string;
}

export interface BackendIncidentListResponse {
  items: BackendIncidentItem[];
  total: number;
  skip: number;
  limit: number;
}

export interface BackendEvidenceItem {
  id: string;
  incident_id: string;
  evidence_type: 'IMAGE' | 'VIDEO' | 'CLIP';
  file_path: string;
  captured_at?: string | null;
  description?: string | null;
  is_primary: boolean;
  created_at: string;
}

export interface BackendUserItem {
  id: string;
  name: string;
  email: string;
  role: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface BackendAssignmentItem {
  id: string;
  incident_id: string;
  assigned_to: string;
  assigned_team?: string | null;
  assigned_at?: string | null;
  completed_at?: string | null;
  notes?: string | null;
}

export interface BackendDetectionItem {
  id: string;
  incident_id: string;
  detection_type: string;
  confidence: number;
  frame_number?: number | null;
  detected_at?: string | null;
  location?: {
    type: string;
    coordinates: [number, number];
  } | null;
  detection_metadata?: Record<string, any> | null;
  created_at: string;
}

export interface BackendInspectionItem {
  id: string;
  incident_id: string;
  inspector_id: string;
  result: InspectionResult;
  inspection_time?: string | null;
  notes?: string | null;
  location?: {
    type: string;
    coordinates: [number, number];
  } | null;
  evidence_id?: string | null;
  created_at: string;
}

/**
 * Format persistence duration (in seconds) to human-readable string (e.g. "14.5s", "14s", "1m 24s", or "N/A" if unavailable).
 */
export function formatPersistenceDuration(seconds?: number | null): string {
  if (seconds === null || seconds === undefined || isNaN(seconds)) {
    return 'N/A';
  }
  if (seconds < 60) {
    const formatted = Number.isInteger(seconds) ? `${seconds}` : `${parseFloat(seconds.toFixed(1))}`;
    return `${formatted}s`;
  }
  const mins = Math.floor(seconds / 60);
  const remainingSecs = Math.round(seconds % 60);
  return `${mins}m ${remainingSecs.toString().padStart(2, '0')}s`;
}

export function mapBackendIncidentToFrontend(item: BackendIncidentItem): Incident {
  const type: IncidentType = mapBackendTypeToFrontend(item.incident_type);

  const lng = item.location?.coordinates?.[0] ?? 77.6631;
  const lat = item.location?.coordinates?.[1] ?? 12.8452;

  const severity = item.severity_score;
  const rawDuration = item.duration_seconds;
  const durationSeconds: number | null =
    rawDuration !== null && rawDuration !== undefined && !isNaN(Number(rawDuration))
      ? Number(rawDuration)
      : null;

  const displayCode = item.incident_code || item.id;
  const evidenceFrame = generateSvgFrame(
    `${lat.toFixed(4)}N, ${lng.toFixed(4)}E`,
    displayCode,
    false,
    type
  );
  const evidenceOverlay = generateSvgFrame(
    `${lat.toFixed(4)}N, ${lng.toFixed(4)}E`,
    displayCode,
    true,
    type
  );

  return {
    id: item.id || item.incident_code, // Prefer actual backend UUID primary key
    code: item.incident_code || item.id, // Human readable tracking code
    type,
    confidence: item.confidence,
    severity: item.severity_score,
    priority: item.priority as PriorityLevel,
    timestamp: item.started_at || item.created_at,
    zone: `Electronics City Zone (${item.zone_id ? item.zone_id.slice(0, 8) : 'EC-01'})`,
    zoneId: 'EC-01',
    locationDescription: item.recommended_action
      ? `${displayCode} - ${getIncidentTypeLabel(type)} Hazard`
      : `Electronics City Arterial Corridor (${lat.toFixed(4)}°N, ${lng.toFixed(4)}°E)`,
    coordinates: { lat, lng },
    durationSeconds,
    evidenceFrame,
    evidenceOverlay,
    severityFactors: {
      waterExtent: type === 'waterlogging' || type === 'drainage_overflow' ? Math.min(10, severity * 0.9) : 0,
      waterExtentLabel:
        type === 'waterlogging' || type === 'drainage_overflow'
          ? `${Math.round(severity * 9)}% arterial lane coverage`
          : undefined,
      persistenceSeconds: durationSeconds,
      roadObstruction: severity,
      roadObstructionLabel: severity > 8 ? 'High dual-lane blockage' : 'Moderate lane obstruction',
      roadCriticality: Math.min(10, severity * 1.05),
      roadCriticalityLabel: 'Primary arterial corridor connecting Phase 1 & Hosur Highway',
      explanation: [
        `${getIncidentTypeLabel(type)} detected by aerial drone vision sensor.`,
        durationSeconds !== null
          ? `Temporal persistence verified over scan duration (${formatPersistenceDuration(durationSeconds)}).`
          : `Temporal persistence unrecorded during initial aerial pass.`,
        `Directly impacts vehicle movement across Electronics City key transit corridor.`,
      ],
    },
    recommendedAction:
      item.recommended_action ||
      (type === 'waterlogging'
        ? 'Deploy high-capacity mobile de-watering sump pumps & unblock storm drain grates'
        : type === 'drainage_overflow'
          ? 'Dispatch high-pressure drain jetting team & clear storm culvert obstruction'
          : type === 'damaged_footpath'
            ? 'Dispatch civil masonry repair crew & install temporary pedestrian safety barriers'
            : type === 'open_manhole'
              ? 'Install immediate high-visibility barricade and dispatch sewer maintenance crew to replace manhole lid.'
              : 'Deploy Cold-Mix Bitumen Patching & Place High-Visibility Hazard Barricades'),
    status: item.status as IncidentStatus,
    history: [
      {
        status: item.status as IncidentStatus,
        timestamp: item.created_at,
        actor: 'FastAPI Backend Engine',
        notes: `Database record fetched from PostgreSQL/PostGIS (UUID: ${item.id})`,
      },
    ],
  };
}

const STORAGE_KEY = 'civicpulse_incidents_v1';

// In-memory cache synced with localStorage for simulated persistence (mock mode only)
let incidentsState: Incident[] = (() => {
  if (isMockDataEnabled()) {
    try {
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          return JSON.parse(stored);
        }
      }
    } catch (e) {
      console.error('Failed to load incidents from localStorage:', e);
    }
    return [...INITIAL_MOCK_INCIDENTS];
  }
  return [];
})();

type StateListener = () => void;
const listeners = new Set<StateListener>();

const persist = (notify = true) => {
  if (isMockDataEnabled()) {
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(incidentsState));
      }
    } catch (e) {
      console.error('Failed to persist incidents to localStorage:', e);
    }
  }
  if (notify) {
    listeners.forEach((listener) => listener());
  }
};

function upsertIncidentsState(items: Incident[], notify = false) {
  const itemMap = new Map<string, Incident>();
  for (const inc of incidentsState) {
    itemMap.set(inc.id, inc);
  }
  for (const inc of items) {
    itemMap.set(inc.id, inc);
  }
  incidentsState = Array.from(itemMap.values());
  persist(notify);
}

function upsertSingleIncidentState(item: Incident, notify = true) {
  const index = incidentsState.findIndex(
    (i) => i.id === item.id || (i.code && i.code === item.code)
  );
  if (index !== -1) {
    incidentsState[index] = item;
  } else {
    incidentsState = [item, ...incidentsState];
  }
  persist(notify);
}

let isSeeding = false;

async function ensureBackendSeeded() {
  if (!isMockDataEnabled() || isSeeding) return;
  isSeeding = true;
  try {
    const listResp = await api.get<BackendIncidentListResponse>('/incidents/');
    const items = listResp?.items || [];
    const hasPothole = items.some((i) => i.incident_type?.toUpperCase() === 'POTHOLE');
    if (items.length < 3 || !hasPothole) {
      const zonesResp = await api.get<{ id: string; code: string }[]>('/zones/');
      let defaultZoneId = zonesResp?.[0]?.id;

      if (!defaultZoneId) {
        const newZone = await api.post<{ id: string }>('/zones/', {
          code: 'EC-01',
          name: 'Electronics City Phase 1 West',
          description: 'Primary arterial corridor',
        });
        defaultZoneId = newZone.id;
      }

      for (const mock of INITIAL_MOCK_INCIDENTS) {
        const payload = {
          incident_code: mock.code || mock.id,
          incident_type: mapFrontendTypeToBackend(mock.type),
          confidence: mock.confidence,
          severity_score: mock.severity,
          priority: mock.priority,
          zone_id: defaultZoneId,
          status: mock.status || 'DETECTED',
          started_at: mock.timestamp || new Date().toISOString(),
          recommended_action: mock.recommendedAction,
          location: mock.coordinates
            ? {
                type: 'Point',
                coordinates: [mock.coordinates.lng, mock.coordinates.lat],
              }
            : undefined,
        };
        try {
          await api.post('/incidents/', payload);
        } catch {
          // ignore duplicate seed errors
        }
      }
    }
  } catch (e) {
    console.warn('Backend auto-seed check failed:', e);
  } finally {
    isSeeding = false;
  }
}

export const incidentService = {
  /**
   * Subscribe to incidents state changes
   */
  subscribe(listener: StateListener): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  /**
   * Get dynamic counts for the three queue status tabs (Active, Completed, Rejected)
   */
  async getQueueTabCounts(): Promise<IncidentQueueCounts> {
    try {
      const summary = await api.get<{
        status_distribution?: Array<{ status: IncidentStatus; count: number }>;
        kpis?: { total_active_incidents?: number };
      }>('/analytics/summary');

      if (summary && Array.isArray(summary.status_distribution)) {
        let active = 0;
        let completed = 0;
        let rejected = 0;

        for (const item of summary.status_distribution) {
          if (item.status === 'CLOSED') {
            completed += item.count;
          } else if (item.status === 'REJECTED') {
            rejected += item.count;
          } else {
            active += item.count;
          }
        }

        return { active, completed, rejected };
      }
    } catch (err) {
      console.warn('Failed to fetch backend queue tab counts:', err);
    }

    if (!isMockDataEnabled()) {
      return { active: 0, completed: 0, rejected: 0 };
    }

    let active = 0;
    let completed = 0;
    let rejected = 0;

    for (const inc of incidentsState) {
      if (inc.status === 'CLOSED') {
        completed++;
      } else if (inc.status === 'REJECTED') {
        rejected++;
      } else {
        active++;
      }
    }

    return { active, completed, rejected };
  },

  /**
   * Get filtered and sorted list of incidents
   */
  async getIncidents(
    filters?: IncidentFilters,
    sortField: SortField = 'timestamp',
    sortDir: SortDirection = 'desc'
  ): Promise<Incident[]> {
    if (isMockDataEnabled()) {
      let result = [...incidentsState];

      if (filters) {
        if (filters.queueTab === 'completed') {
          result = result.filter((inc) => inc.status === 'CLOSED');
        } else if (filters.queueTab === 'rejected') {
          result = result.filter((inc) => inc.status === 'REJECTED');
        } else if (filters.queueTab === 'active' || (!filters.queueTab && (!filters.status || filters.status === 'all'))) {
          result = result.filter((inc) => inc.status !== 'CLOSED' && inc.status !== 'REJECTED');
        }

        if (filters.type && filters.type !== 'all') {
          result = result.filter((inc) => inc.type === filters.type);
        }
        if (filters.priority && filters.priority !== 'all') {
          result = result.filter((inc) => inc.priority === filters.priority);
        }
        if (filters.status && filters.status !== 'all') {
          result = result.filter((inc) => inc.status === filters.status);
        }
        if (filters.zoneId && filters.zoneId !== 'all') {
          result = result.filter((inc) => inc.zoneId === filters.zoneId);
        }
        if (filters.searchQuery && filters.searchQuery.trim() !== '') {
          const q = filters.searchQuery.toLowerCase().trim();
          result = result.filter(
            (inc) =>
              inc.id.toLowerCase().includes(q) ||
              (inc.code && inc.code.toLowerCase().includes(q)) ||
              inc.locationDescription.toLowerCase().includes(q) ||
              inc.zone.toLowerCase().includes(q) ||
              inc.type.toLowerCase().includes(q)
          );
        }
      }

      result.sort((a, b) => {
        let comparison = 0;
        switch (sortField) {
          case 'severity':
            comparison = a.severity - b.severity;
            break;
          case 'confidence':
            comparison = a.confidence - b.confidence;
            break;
          case 'priority': {
            const rank = { P1: 3, P2: 2, P3: 1 };
            comparison = rank[a.priority] - rank[b.priority];
            break;
          }
          case 'timestamp':
          default:
            comparison = new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
            break;
        }
        return sortDir === 'asc' ? comparison : -comparison;
      });

      return result;
    }

    try {
      const queryParams: Record<string, string | number | undefined> = {};

      if (filters) {
        if (filters.status && filters.status !== 'all') {
          queryParams.status = filters.status;
        } else if (filters.queueTab === 'completed') {
          queryParams.status = 'CLOSED';
        } else if (filters.queueTab === 'rejected') {
          queryParams.status = 'REJECTED';
        } else if (filters.queueTab === 'active' || !filters.queueTab) {
          queryParams.status = 'DETECTED,VERIFIED,ASSIGNED,IN_PROGRESS,RE_INSPECTION';
        }

        if (filters.priority && filters.priority !== 'all') {
          queryParams.priority = filters.priority;
        }
        if (filters.type && filters.type !== 'all') {
          queryParams.incident_type = mapFrontendTypeToBackend(filters.type);
        }
      }

      if (sortField === 'priority') {
        queryParams.sort_by = 'priority';
      } else {
        queryParams.sort_by = 'created_at';
      }
      queryParams.order = sortDir;

      const response = await api.get<BackendIncidentListResponse>('/incidents/', queryParams);

      if (response && Array.isArray(response.items)) {
        let backendIncidents = response.items.map(mapBackendIncidentToFrontend);
        upsertIncidentsState(backendIncidents);

        if (filters) {
          if (filters.queueTab === 'completed') {
            backendIncidents = backendIncidents.filter((inc) => inc.status === 'CLOSED');
          } else if (filters.queueTab === 'rejected') {
            backendIncidents = backendIncidents.filter((inc) => inc.status === 'REJECTED');
          } else if (filters.queueTab === 'active' || (!filters.queueTab && (!filters.status || filters.status === 'all'))) {
            backendIncidents = backendIncidents.filter((inc) => inc.status !== 'CLOSED' && inc.status !== 'REJECTED');
          }

          if (filters.type && filters.type !== 'all') {
            backendIncidents = backendIncidents.filter((inc) => inc.type === filters.type);
          }
          if (filters.priority && filters.priority !== 'all') {
            backendIncidents = backendIncidents.filter((inc) => inc.priority === filters.priority);
          }
          if (filters.status && filters.status !== 'all') {
            backendIncidents = backendIncidents.filter((inc) => inc.status === filters.status);
          }
          if (filters.zoneId && filters.zoneId !== 'all') {
            backendIncidents = backendIncidents.filter((inc) => inc.zoneId === filters.zoneId);
          }
          if (filters.searchQuery && filters.searchQuery.trim() !== '') {
            const q = filters.searchQuery.toLowerCase().trim();
            backendIncidents = backendIncidents.filter(
              (inc) =>
                inc.id.toLowerCase().includes(q) ||
                (inc.code && inc.code.toLowerCase().includes(q)) ||
                inc.locationDescription.toLowerCase().includes(q) ||
                inc.zone.toLowerCase().includes(q) ||
                inc.type.toLowerCase().includes(q)
            );
          }
        }
        return backendIncidents;
      }
    } catch (err) {
      console.warn('Backend API fetch failed:', err);
    }

    return [];
  },

  /**
   * Get single incident by ID (UUID or tracking code) from GET /api/v1/incidents/{incident_id}
   */
  async getIncidentById(id: string): Promise<Incident | undefined> {
    if (isMockDataEnabled()) {
      return incidentsState.find((inc) => inc.id === id || inc.code === id);
    }

    try {
      const item = await api.get<BackendIncidentItem>(`/incidents/${id}`);
      if (item && (item.id || item.incident_code)) {
        const fresh = mapBackendIncidentToFrontend(item);
        upsertSingleIncidentState(fresh, false);
        return fresh;
      }
    } catch (err: any) {
      if (err instanceof ApiError && err.status === 404) {
        console.warn(`Incident '${id}' not found on backend API.`);
      } else {
        console.warn(`Failed to fetch incident '${id}' from backend API:`, err);
      }
    }

    return incidentsState.find((inc) => inc.id === id || inc.code === id);
  },

  /**
   * Get attached evidence assets for an incident from GET /api/v1/incidents/{incident_id}/evidence
   */
  async getIncidentEvidence(incidentId: string): Promise<EvidenceAsset[]> {
    try {
      const items = await api.get<BackendEvidenceItem[]>(`/incidents/${incidentId}/evidence`);
      if (Array.isArray(items)) {
        return items.map((item) => ({
          id: item.id,
          incidentId: item.incident_id,
          evidenceType: item.evidence_type,
          filePath: item.file_path,
          mediaUrl: getEvidenceMediaUrl(item.file_path),
          videoUrl: getIncidentVideoUrlFromEvidencePath(item.file_path),
          capturedAt: item.captured_at,

          description: item.description,
          isPrimary: item.is_primary,
          createdAt: item.created_at,
        }));
      }
    } catch (err: any) {
      if (err instanceof ApiError && err.status === 404) {
        console.warn(`Incident '${incidentId}' not found when fetching evidence.`);
      } else {
        console.warn(`Failed to fetch evidence for incident '${incidentId}':`, err);
      }
    }
    return [];
  },

  /**
   * Synchronously get cached primary evidence media URL if already loaded
   */
  getCachedPrimaryEvidence(incidentId: string): string | null | undefined {
    return primaryEvidenceCache.get(incidentId);
  },

  /**
   * Asynchronously fetch primary evidence media URL with in-memory caching and request deduplication
   */
  async getPrimaryEvidenceMediaUrl(incidentId: string): Promise<string | null> {
    if (primaryEvidenceCache.has(incidentId)) {
      return primaryEvidenceCache.get(incidentId) ?? null;
    }

    if (pendingEvidencePromises.has(incidentId)) {
      return pendingEvidencePromises.get(incidentId)!;
    }

    const promise = (async () => {
      try {
        const assets = await this.getIncidentEvidence(incidentId);
        if (assets && assets.length > 0) {
          const primary = assets.find((e) => e.isPrimary) || assets[0];
          const mediaUrl = primary.mediaUrl || getEvidenceMediaUrl(primary.filePath) || null;
          primaryEvidenceCache.set(incidentId, mediaUrl);
          return mediaUrl;
        }
        primaryEvidenceCache.set(incidentId, null);
        return null;
      } catch (err) {
        console.warn(`Failed to fetch primary evidence for incident '${incidentId}':`, err);
        primaryEvidenceCache.set(incidentId, null);
        return null;
      } finally {
        pendingEvidencePromises.delete(incidentId);
      }
    })();

    pendingEvidencePromises.set(incidentId, promise);
    return promise;
  },

  /**
   * Preload primary evidence thumbnails for a list of visible incidents
   */
  async preloadPrimaryEvidence(incidentIds: string[]): Promise<void> {
    const unCachedIds = incidentIds.filter((id) => id && !primaryEvidenceCache.has(id));
    if (unCachedIds.length === 0) return;

    // Concurrently fetch evidence for uncached IDs in batches of 10
    const batchSize = 10;
    for (let i = 0; i < unCachedIds.length; i += batchSize) {
      const batch = unCachedIds.slice(i, i + batchSize);
      await Promise.allSettled(batch.map((id) => this.getPrimaryEvidenceMediaUrl(id)));
    }
  },

  /**
   * Get model frame observations for an incident from GET /api/v1/incidents/{incident_id}/detections
   */
  async getIncidentDetections(incidentId: string): Promise<DetectionObservation[]> {
    try {
      const items = await api.get<BackendDetectionItem[]>(`/incidents/${incidentId}/detections`);
      if (Array.isArray(items)) {
        return items.map((item) => ({
          id: item.id,
          incidentId: item.incident_id,
          detectionType: item.detection_type,
          confidence: item.confidence,
          frameNumber: item.frame_number,
          detectedAt: item.detected_at,
          location: item.location,
          detectionMetadata: item.detection_metadata,
          createdAt: item.created_at,
        }));
      }
    } catch (err: any) {
      if (err instanceof ApiError && err.status === 404) {
        console.warn(`Incident '${incidentId}' not found when fetching detections.`);
      } else {
        console.warn(`Failed to fetch detections for incident '${incidentId}':`, err);
      }
    }
    return [];
  },

  /**
   * Record a field inspection verification via POST /api/v1/incidents/{incident_id}/inspections
   */
  async createIncidentInspection(
    incidentId: string,
    payload: InspectionCreatePayload
  ): Promise<InspectionRecord> {
    const item = await api.post<BackendInspectionItem>(`/incidents/${incidentId}/inspections`, payload);
    return {
      id: item.id,
      incidentId: item.incident_id,
      inspectorId: item.inspector_id,
      result: item.result,
      inspectionTime: item.inspection_time,
      notes: item.notes,
      location: item.location,
      evidenceId: item.evidence_id,
      createdAt: item.created_at,
    };
  },

  /**
   * Get field inspection verification history from GET /api/v1/incidents/{incident_id}/inspections
   */
  async getIncidentInspections(incidentId: string): Promise<InspectionRecord[]> {
    try {
      const items = await api.get<BackendInspectionItem[]>(`/incidents/${incidentId}/inspections`);
      if (Array.isArray(items)) {
        return items.map((item) => ({
          id: item.id,
          incidentId: item.incident_id,
          inspectorId: item.inspector_id,
          result: item.result,
          inspectionTime: item.inspection_time,
          notes: item.notes,
          location: item.location,
          evidenceId: item.evidence_id,
          createdAt: item.created_at,
        }));
      }
    } catch (err: any) {
      if (err instanceof ApiError && err.status === 404) {
        console.warn(`Incident '${incidentId}' not found when fetching inspections.`);
      } else {
        console.warn(`Failed to fetch inspections for incident '${incidentId}':`, err);
      }
    }
    return [];
  },

  /**
   * Get active system users for assignment selection from GET /api/v1/users/
   */
  async getUsers(): Promise<User[]> {
    try {
      const items = await api.get<BackendUserItem[]>('/users/');
      if (Array.isArray(items)) {
        return items.map((u) => ({
          id: u.id,
          name: u.name,
          email: u.email,
          role: u.role,
          isActive: u.is_active,
          createdAt: u.created_at,
          updatedAt: u.updated_at,
        }));
      }
    } catch (err: any) {
      if (err instanceof ApiError) {
        console.error('Backend API user fetch failed:', err.message);
        throw err;
      }
      console.warn('Backend API user fetch failed, checking fallback:', err);
    }
    return [];
  },

  /**
   * Create an assignment linking an incident to a user/team via POST /api/v1/incidents/{incident_id}/assignments
   */
  async createIncidentAssignment(
    incidentId: string,
    payload: AssignmentCreatePayload
  ): Promise<Assignment> {
    const item = await api.post<BackendAssignmentItem>(`/incidents/${incidentId}/assignments`, payload);
    return {
      id: item.id,
      incidentId: item.incident_id,
      assignedTo: item.assigned_to,
      assignedTeam: item.assigned_team,
      assignedAt: item.assigned_at,
      completedAt: item.completed_at,
      notes: item.notes,
    };
  },

  /**
   * Get existing assignments for an incident from GET /api/v1/incidents/{incident_id}/assignments
   */
  async getIncidentAssignments(incidentId: string): Promise<Assignment[]> {
    try {
      const items = await api.get<BackendAssignmentItem[]>(`/incidents/${incidentId}/assignments`);
      if (Array.isArray(items)) {
        return items.map((item) => ({
          id: item.id,
          incidentId: item.incident_id,
          assignedTo: item.assigned_to,
          assignedTeam: item.assigned_team,
          assignedAt: item.assigned_at,
          completedAt: item.completed_at,
          notes: item.notes,
        }));
      }
    } catch (err: any) {
      if (err instanceof ApiError && err.status === 404) {
        console.warn(`Incident '${incidentId}' not found when fetching assignments.`);
      } else {
        console.warn(`Failed to fetch assignments for incident '${incidentId}':`, err);
      }
    }
    return [];
  },

  /**
   * Transition an incident to VERIFIED status
   */
  async verifyIncident(id: string, actor: string = 'Command Operator', notes?: string): Promise<Incident> {
    return this.updateIncidentStatus(id, 'VERIFIED', actor, notes || 'Incident verified by operator.');
  },

  /**
   * Transition an incident to REJECTED (False Positive)
   */
  async rejectIncident(
    id: string,
    reason: string = 'Marked as false positive',
    actor: string = 'Command Operator'
  ): Promise<Incident> {
    return this.updateIncidentStatus(id, 'REJECTED', actor, reason || 'Incident rejected as false positive.');
  },

  /**
   * Assign an incident to a mitigation crew and recommended action
   */
  /**
   * Assign an incident to a mitigation crew and recommended action
   */
  async assignIncident(
    id: string,
    owner: string,
    action: string,
    actor: string = 'Dispatch Supervisor',
    assignedToUserId?: string
  ): Promise<Incident> {
    if (isMockDataEnabled()) {
      const incidentIndex = incidentsState.findIndex((inc) => inc.id === id || inc.code === id);
      if (incidentIndex === -1) {
        throw new Error(`Incident ${id} not found`);
      }

      const incident = incidentsState[incidentIndex];
      if (!canTransition(incident.status, 'ASSIGNED')) {
        throw new Error(`Cannot assign incident in status ${incident.status}. Must be in VERIFIED status first.`);
      }

      const updated: Incident = {
        ...incident,
        owner,
        recommendedAction: action,
        status: 'ASSIGNED',
        history: [
          ...incident.history,
          {
            status: 'ASSIGNED',
            timestamp: new Date().toISOString(),
            actor,
            notes: `Assigned to: ${owner} | Action: ${action}`,
          },
        ],
      };

      incidentsState[incidentIndex] = updated;
      persist();
      return updated;
    }

    let userId = assignedToUserId;

    if (!userId) {
      try {
        const availableUsers = await this.getUsers();
        if (availableUsers.length > 0) {
          userId = availableUsers[0].id;
        }
      } catch (err) {
        console.warn('Failed to fetch available users for assignment:', err);
      }
    }

    if (userId) {
      const payload: AssignmentCreatePayload = {
        assigned_to: userId,
        assigned_team: owner,
        notes: action,
      };

      try {
        await this.createIncidentAssignment(id, payload);
      } catch (err: any) {
        console.warn(`Backend assignment creation failed for incident '${id}':`, err);
        if (err instanceof ApiError && err.status === 404) {
          throw err;
        }
      }
    }

    const updatedWithStatus = await this.updateIncidentStatus(
      id,
      'ASSIGNED',
      actor,
      `Assigned to: ${owner} | Action: ${action}`
    );
    const fullUpdated: Incident = {
      ...updatedWithStatus,
      owner,
      recommendedAction: action,
    };
    upsertSingleIncidentState(fullUpdated);
    return fullUpdated;
  },

  /**
   * Advance or update status obeying backend status mutation contract (PATCH /api/v1/incidents/{incident_id}/status)
   */
  async updateIncidentStatus(
    id: string,
    nextStatus: IncidentStatus,
    actor: string = 'Command Operator',
    notes?: string
  ): Promise<Incident> {
    if (isMockDataEnabled()) {
      const incidentIndex = incidentsState.findIndex((inc) => inc.id === id || inc.code === id);
      if (incidentIndex === -1) {
        throw new Error(`Incident ${id} not found`);
      }

      const incident = incidentsState[incidentIndex];
      if (!canTransition(incident.status, nextStatus)) {
        throw new Error(
          `Invalid status transition from ${incident.status} to ${nextStatus}. Transition is not allowed.`
        );
      }

      const prevStatus = incident.status;
      const updated: Incident = {
        ...incident,
        status: nextStatus,
        history: [
          ...incident.history,
          {
            status: nextStatus,
            timestamp: new Date().toISOString(),
            actor,
            notes,
          },
        ],
      };

      incidentsState[incidentIndex] = updated;
      persist();

      if (prevStatus === 'DETECTED' && nextStatus === 'VERIFIED') {
        notificationService.addVerifiedNotification(updated, actor, notes);
      }

      return updated;
    }

    const prevIncident = incidentsState.find((inc) => inc.id === id || inc.code === id);
    const prevStatus = prevIncident?.status;

    const payload = {
      status: nextStatus,
      changed_by: null,
      comment: notes || (actor ? `Status changed by ${actor}` : `Status updated to ${nextStatus}`),
    };

    const responseItem = await api.patch<BackendIncidentItem>(`/incidents/${id}/status`, payload);

    if (responseItem && (responseItem.id || responseItem.incident_code)) {
      const updated = mapBackendIncidentToFrontend(responseItem);
      upsertSingleIncidentState(updated);

      if ((!prevStatus || prevStatus === 'DETECTED') && nextStatus === 'VERIFIED') {
        notificationService.addVerifiedNotification(updated, actor, notes);
      }

      return updated;
    }

    throw new Error(`Failed to update status for incident ${id} on backend API.`);
  },

  /**
   * Add a newly detected/inferred incident to the active list and publish to FastAPI backend
   */
  async createIncident(incident: Incident): Promise<Incident> {
    if (isMockDataEnabled()) {
      upsertSingleIncidentState(incident);
      return incident;
    }

    const zonesResp = await api.get<{ id: string; code: string }[]>('/zones/');
    let zoneId = zonesResp?.[0]?.id;

    if (incident.zoneId && Array.isArray(zonesResp) && zonesResp.length > 0) {
      const matched = zonesResp.find((z) => z.code === incident.zoneId);
      if (matched) zoneId = matched.id;
    }

    if (!zoneId) {
      const newZone = await api.post<{ id: string }>('/zones/', {
        code: incident.zoneId || 'EC-01',
        name: 'Electronics City Primary Zone',
        description: 'Surveillance zone created by ingestion studio',
      });
      zoneId = newZone.id;
    }

    const payload = {
      incident_code: incident.code || incident.id || `INC-${Math.floor(1000 + Math.random() * 9000)}`,
      incident_type: mapFrontendTypeToBackend(incident.type),
      confidence: incident.confidence,
      severity_score: incident.severity,
      priority: incident.priority,
      zone_id: zoneId,
      status: incident.status || 'DETECTED',
      started_at: incident.timestamp || new Date().toISOString(),
      recommended_action: incident.recommendedAction,
      location: incident.coordinates
        ? {
            type: 'Point',
            coordinates: [incident.coordinates.lng, incident.coordinates.lat],
          }
        : undefined,
    };

    const responseItem = await api.post<BackendIncidentItem>('/incidents/', payload);
    if (responseItem && (responseItem.id || responseItem.incident_code)) {
      const created = mapBackendIncidentToFrontend(responseItem);
      upsertSingleIncidentState(created);
      return created;
    }

    throw new Error('Failed to create incident on backend API.');
  },

  /**
   * Notify all queue subscribers to refresh backend incidents
   */
  notifySubscribers(): void {
    listeners.forEach((listener) => listener());
  },

  /**
   * Reset mock data to original default fixtures
   */
  resetToMockData(): void {
    if (isMockDataEnabled()) {
      incidentsState = JSON.parse(JSON.stringify(INITIAL_MOCK_INCIDENTS));
      persist();
    } else {
      incidentsState = [];
      persist(true);
    }
  },
};

