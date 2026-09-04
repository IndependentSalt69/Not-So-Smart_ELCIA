import { IncidentType, PriorityLevel } from './incident';

export interface IncidentNotification {
  id: string;
  incidentId: string;
  incidentCode: string;
  incidentType: IncidentType;
  priority: PriorityLevel;
  locationDescription?: string;
  timestamp: string;
  isRead: boolean;
  actor?: string;
  notes?: string;
}
