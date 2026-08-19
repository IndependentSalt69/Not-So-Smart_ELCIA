import { INITIAL_MOCK_INCIDENTS } from '@/data/mockIncidents';
import { canTransition } from '@/lib/stateMachine';
import { Incident, IncidentFilters, IncidentStatus, SortDirection, SortField } from '@/types/incident';

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
    // Artificial small async delay to mirror future API call
    await new Promise((resolve) => setTimeout(resolve, 30));

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
   * Get single incident by ID
   */
  async getIncidentById(id: string): Promise<Incident | undefined> {
    await new Promise((resolve) => setTimeout(resolve, 15));
    return incidentsState.find((inc) => inc.id === id);
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
