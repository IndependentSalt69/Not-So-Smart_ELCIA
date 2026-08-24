import { incidentService } from '@/services/incidentService';
import {
  Incident,
  IncidentFilters,
  IncidentQueueCounts,
  IncidentStatus,
  SortDirection,
  SortField,
} from '@/types/incident';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

export function useIncidents(
  initialFilters?: IncidentFilters,
  sortField: SortField = 'timestamp',
  sortDir: SortDirection = 'desc'
) {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [filtersState, setFiltersState] = useState<IncidentFilters>(initialFilters || { queueTab: 'active' });
  const [tabCounts, setTabCounts] = useState<IncidentQueueCounts>({
    active: 0,
    completed: 0,
    rejected: 0,
  });

  const fetchIdRef = useRef<number>(0);
  const isFirstMountRef = useRef<boolean>(true);
  const prevFilterKeyRef = useRef<string>('');

  // Stabilize setFilters so identical objects do not cause re-renders
  const setFilters = useCallback((newFilters: IncidentFilters | ((prev: IncidentFilters) => IncidentFilters)) => {
    setFiltersState((prev) => {
      const next = typeof newFilters === 'function' ? newFilters(prev) : newFilters;
      if (JSON.stringify(prev) === JSON.stringify(next)) {
        return prev;
      }
      return next;
    });
  }, []);

  const filterKey = useMemo(() => {
    return JSON.stringify({ filters: filtersState, sortField, sortDir });
  }, [filtersState, sortField, sortDir]);

  const fetchIncidents = useCallback(async (isSilent = false) => {
    const fetchId = ++fetchIdRef.current;
    const isParamChange = prevFilterKeyRef.current !== filterKey;
    prevFilterKeyRef.current = filterKey;

    // Show loading skeletons ONLY if parameters changed or initial mount, AND it's not a silent background update
    if (!isSilent && (isFirstMountRef.current || isParamChange)) {
      setLoading(true);
    }
    isFirstMountRef.current = false;

    try {
      setError(null);
      const [data, counts] = await Promise.all([
        incidentService.getIncidents(filtersState, sortField, sortDir),
        incidentService.getQueueTabCounts(),
      ]);

      // Guard against race conditions (stale responses resolving out of order)
      if (fetchId === fetchIdRef.current) {
        setIncidents(data);
        setTabCounts(counts);
      }
    } catch (err: any) {
      if (fetchId === fetchIdRef.current) {
        setError(err.message || 'Failed to fetch incidents');
      }
    } finally {
      if (fetchId === fetchIdRef.current) {
        setLoading(false);
      }
    }
  }, [filtersState, sortField, sortDir, filterKey]);

  useEffect(() => {
    fetchIncidents(false);

    const unsubscribe = incidentService.subscribe(() => {
      // Background subscriber notifications (e.g. status updates) update silently without displaying loading skeletons
      fetchIncidents(true);
    });

    return unsubscribe;
  }, [fetchIncidents]);

  const verifyIncident = async (id: string, actor?: string, notes?: string) => {
    const updated = await incidentService.verifyIncident(id, actor, notes);
    return updated;
  };

  const rejectIncident = async (id: string, reason?: string, actor?: string) => {
    const updated = await incidentService.rejectIncident(id, reason, actor);
    return updated;
  };

  const assignIncident = async (id: string, owner: string, action: string, actor?: string, assignedToUserId?: string) => {
    const updated = await incidentService.assignIncident(id, owner, action, actor, assignedToUserId);
    return updated;
  };

  const updateStatus = async (id: string, status: IncidentStatus, actor?: string, notes?: string) => {
    const updated = await incidentService.updateIncidentStatus(id, status, actor, notes);
    return updated;
  };

  const getIncidentById = useCallback(async (id: string) => {
    return await incidentService.getIncidentById(id);
  }, []);

  const getIncidentEvidence = useCallback(async (id: string) => {
    return await incidentService.getIncidentEvidence(id);
  }, []);

  const getUsers = useCallback(async () => {
    return await incidentService.getUsers();
  }, []);

  const getIncidentAssignments = useCallback(async (id: string) => {
    return await incidentService.getIncidentAssignments(id);
  }, []);

  const getIncidentDetections = useCallback(async (id: string) => {
    return await incidentService.getIncidentDetections(id);
  }, []);

  const getIncidentInspections = useCallback(async (id: string) => {
    return await incidentService.getIncidentInspections(id);
  }, []);

  const createIncidentInspection = useCallback(
    async (id: string, payload: Parameters<typeof incidentService.createIncidentInspection>[1]) => {
      return await incidentService.createIncidentInspection(id, payload);
    },
    []
  );

  return {
    incidents,
    tabCounts,
    loading,
    error,
    filters: filtersState,
    setFilters,
    refetch: fetchIncidents,
    getIncidentById,
    getIncidentEvidence,
    getIncidentDetections,
    getIncidentInspections,
    createIncidentInspection,
    getUsers,
    getIncidentAssignments,
    verifyIncident,
    rejectIncident,
    assignIncident,
    updateStatus,
  };
}
