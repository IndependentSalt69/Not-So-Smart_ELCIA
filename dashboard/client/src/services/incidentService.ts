import { generateSvgFrame, INITIAL_MOCK_INCIDENTS } from '@/data/mockIncidents';
import { canTransition } from '@/lib/stateMachine';
import { api, ApiError } from '@/services/api';
import {
  Incident,
  IncidentFilters,
  IncidentStatus,
  IncidentType,
  PriorityLevel,
  SortDirection,
  SortField,
} from '@/types/incident';

export interface BackendIncidentItem {
  id: string;
  incident_code: string;
  incident_type: 'WATERLOGGING' | 'POTHOLE';
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

export function mapBackendIncidentToFrontend(item: BackendIncidentItem): Incident {
  const isWater = item.incident_type?.toUpperCase() === 'WATERLOGGING';
  const type: IncidentType = isWater ? 'waterlogging' : 'pothole';

  const lng = item.location?.coordinates?.[0] ?? 77.6631;
  const lat = item.location?.coordinates?.[1] ?? 12.8452;

  const severity = item.severity_score;
  const durationSeconds = item.duration_seconds ?? 180;

  const displayCode = item.incident_code || item.id;
  const evidenceFrame = generateSvgFrame(
    `${lat.toFixed(4)}N, ${lng.toFixed(4)}E`,
    displayCode,
    false,
    isWater
  );
  const evidenceOverlay = generateSvgFrame(
    `${lat.toFixed(4)}N, ${lng.toFixed(4)}E`,
    displayCode,
    true,
    isWater
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
      ? `${displayCode} - ${isWater ? 'Waterlogging' : 'Pothole'} Hazard`
      : `Electronics City Arterial Corridor (${lat.toFixed(4)}°N, ${lng.toFixed(4)}°E)`,
    coordinates: { lat, lng },
    durationSeconds,
    evidenceFrame,
    evidenceOverlay,
    severityFactors: {
      waterExtent: isWater ? Math.min(10, severity * 0.9) : 0,
      waterExtentLabel: isWater ? `${Math.round(severity * 9)}% arterial lane coverage` : undefined,
      persistenceSeconds: durationSeconds,
      roadObstruction: severity,
      roadObstructionLabel: severity > 8 ? 'High dual-lane blockage' : 'Moderate lane obstruction',
      roadCriticality: Math.min(10, severity * 1.05),
      roadCriticalityLabel: 'Primary arterial corridor connecting Phase 1 & Hosur Highway',
      explanation: [
        `${isWater ? 'Water pooling' : 'Surface cratering'} detected by aerial drone vision sensor.`,
        `Temporal persistence verified over scan duration (${durationSeconds}s).`,
        `Directly impacts vehicle movement across Electronics City key transit corridor.`,
      ],
    },
    recommendedAction:
      item.recommended_action ||
      (isWater
        ? 'Deploy high-capacity mobile de-watering sump pumps & unblock storm drain grates'
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

// In-memory cache synced with localStorage for simulated persistence
let incidentsState: Incident[] = (() => {
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
})();

type StateListener = () => void;
const listeners = new Set<StateListener>();

const persist = () => {
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(incidentsState));
    }
  } catch (e) {
    console.error('Failed to persist incidents to localStorage:', e);
  }
  listeners.forEach((listener) => listener());
};

export const incidentService = {
  /**
   * Subscribe to incidents state changes
   */
  subscribe(listener: StateListener): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  /**
   * Get filtered and sorted list of incidents
   */
  async getIncidents(
    filters?: IncidentFilters,
    sortField: SortField = 'timestamp',
    sortDir: SortDirection = 'desc'
  ): Promise<Incident[]> {
    try {
      const queryParams: Record<string, string | number | undefined> = {};

      if (filters) {
        if (filters.status && filters.status !== 'all') {
          queryParams.status = filters.status;
        }
        if (filters.priority && filters.priority !== 'all') {
          queryParams.priority = filters.priority;
        }
        if (filters.type && filters.type !== 'all') {
          queryParams.incident_type = filters.type.toUpperCase();
        }
      }

      if (sortField === 'priority') {
        queryParams.sort_by = 'priority';
      } else {
        queryParams.sort_by = 'created_at';
      }
      queryParams.order = sortDir;

      const response = await api.get<BackendIncidentListResponse>('/incidents/', queryParams);

      if (response && Array.isArray(response.items) && response.items.length > 0) {
        let backendIncidents = response.items.map(mapBackendIncidentToFrontend);

        if (filters) {
          if (filters.zoneId && filters.zoneId !== 'all') {
            backendIncidents = backendIncidents.filter((inc) => inc.zoneId === filters.zoneId);
          }
          if (filters.searchQuery && filters.searchQuery.trim() !== '') {
            const q = filters.searchQuery.toLowerCase().trim();
            backendIncidents = backendIncidents.filter(
              (inc) =>
                inc.id.toLowerCase().includes(q) ||
                inc.locationDescription.toLowerCase().includes(q) ||
                inc.zone.toLowerCase().includes(q) ||
                inc.type.toLowerCase().includes(q)
            );
          }
        }
        return backendIncidents;
      }
    } catch (err) {
      console.warn('Backend API fetch failed, falling back to local state:', err);
    }

    let result = [...incidentsState];

    if (filters) {
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
  },

  /**
   * Get single incident by ID (UUID or tracking code) from GET /api/v1/incidents/{incident_id}
   */
  async getIncidentById(id: string): Promise<Incident | undefined> {
    try {
      const item = await api.get<BackendIncidentItem>(`/incidents/${id}`);
      if (item && (item.id || item.incident_code)) {
        return mapBackendIncidentToFrontend(item);
      }
    } catch (err: any) {
      if (err instanceof ApiError && err.status === 404) {
        console.warn(`Incident '${id}' not found on backend API.`);
      } else {
        console.warn(`Failed to fetch incident '${id}' from backend API, checking local state:`, err);
      }
    }

    // Fallback to local state lookup
    return incidentsState.find((inc) => inc.id === id || inc.code === id);
  },

  /**
   * Transition an incident to VERIFIED status
   */
  async verifyIncident(id: string, actor: string = 'Command Operator', notes?: string): Promise<Incident> {
    return this.updateIncidentStatus(id, 'VERIFIED', actor, notes || 'Incident verified by human operator');
  },

  /**
   * Transition an incident to REJECTED (False Positive)
   */
  async rejectIncident(
    id: string,
    reason: string = 'Marked as false positive',
    actor: string = 'Command Operator'
  ): Promise<Incident> {
    return this.updateIncidentStatus(id, 'REJECTED', actor, reason);
  },

  /**
   * Assign an incident to a mitigation crew and recommended action
   */
  async assignIncident(
    id: string,
    owner: string,
    action: string,
    actor: string = 'Dispatch Supervisor'
  ): Promise<Incident> {
    const incident = incidentsState.find((inc) => inc.id === id);
    if (!incident) {
      throw new Error(`Incident ${id} not found`);
    }

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

    incidentsState = incidentsState.map((inc) => (inc.id === id ? updated : inc));
    persist();
    return updated;
  },

  /**
   * Advance or update status obeying the state machine
   */
  async updateIncidentStatus(
    id: string,
    nextStatus: IncidentStatus,
    actor: string = 'Command Operator',
    notes?: string
  ): Promise<Incident> {
    const incident = incidentsState.find((inc) => inc.id === id);
    if (!incident) {
      throw new Error(`Incident ${id} not found`);
    }

    if (!canTransition(incident.status, nextStatus)) {
      throw new Error(
        `Invalid status transition from ${incident.status} to ${nextStatus}. Transition is not allowed.`
      );
    }

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

    incidentsState = incidentsState.map((inc) => (inc.id === id ? updated : inc));
    persist();
    return updated;
  },

  /**
   * Add a newly detected/inferred incident to the active list
   */
  async createIncident(incident: Incident): Promise<Incident> {
    await new Promise((resolve) => setTimeout(resolve, 20));
    // Prepend to top of incidents list
    incidentsState = [incident, ...incidentsState.filter((i) => i.id !== incident.id)];
    persist();
    return incident;
  },

  /**
   * Reset mock data to original default fixtures
   */
  resetToMockData(): void {
    incidentsState = [...INITIAL_MOCK_INCIDENTS];
    persist();
  },
};
