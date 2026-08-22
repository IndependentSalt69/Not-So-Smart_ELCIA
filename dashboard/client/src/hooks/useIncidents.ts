import { incidentService } from '@/services/incidentService';
import { Incident, IncidentFilters, IncidentStatus, SortDirection, SortField } from '@/types/incident';
import { useCallback, useEffect, useState } from 'react';

export function useIncidents(
  initialFilters?: IncidentFilters,
  sortField: SortField = 'timestamp',
  sortDir: SortDirection = 'desc'
) {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<IncidentFilters>(initialFilters || {});

  const fetchIncidents = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await incidentService.getIncidents(filters, sortField, sortDir);
      setIncidents(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch incidents');
    } finally {
      setLoading(false);
    }
  }, [filters, sortField, sortDir]);

  useEffect(() => {
    fetchIncidents();
    const unsubscribe = incidentService.subscribe(() => {
      fetchIncidents();
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

  return {
    incidents,
    loading,
    error,
    filters,
    setFilters,
    refetch: fetchIncidents,
    getIncidentById,
    getIncidentEvidence,
    getUsers,
    getIncidentAssignments,
    verifyIncident,
    rejectIncident,
    assignIncident,
    updateStatus,
  };
}
