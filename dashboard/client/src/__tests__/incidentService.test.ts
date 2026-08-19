import { beforeEach, describe, expect, it } from 'vitest';
import { incidentService } from '../services/incidentService';

describe('Incident Service', () => {
  beforeEach(() => {
    incidentService.resetToMockData();
  });

  it('fetches all initial mock incidents', async () => {
    const incidents = await incidentService.getIncidents();
    expect(incidents.length).toBeGreaterThan(5);
    expect(incidents.some((i) => i.id === 'EC-0142')).toBe(true);
  });

  it('filters incidents by type', async () => {
    const waterIncidents = await incidentService.getIncidents({ type: 'waterlogging' });
    expect(waterIncidents.every((i) => i.type === 'waterlogging')).toBe(true);

    const potholeIncidents = await incidentService.getIncidents({ type: 'pothole' });
    expect(potholeIncidents.every((i) => i.type === 'pothole')).toBe(true);
  });

  it('filters incidents by priority', async () => {
    const p1Incidents = await incidentService.getIncidents({ priority: 'P1' });
    expect(p1Incidents.every((i) => i.priority === 'P1')).toBe(true);
  });

  it('filters incidents by zoneId', async () => {
    const zoneIncidents = await incidentService.getIncidents({ zoneId: 'EC-01' });
    expect(zoneIncidents.every((i) => i.zoneId === 'EC-01')).toBe(true);
  });

  it('finds incident by ID', async () => {
    const incident = await incidentService.getIncidentById('EC-0142');
    expect(incident).toBeDefined();
    expect(incident?.id).toBe('EC-0142');
    expect(incident?.zoneId).toBe('EC-01');
  });

  it('verifies a DETECTED incident into VERIFIED status', async () => {
    const updated = await incidentService.verifyIncident('EC-0142', 'Test Operator', 'Verified genuine flood');
    expect(updated.status).toBe('VERIFIED');
    expect(updated.history.some((h) => h.status === 'VERIFIED')).toBe(true);

    const fetched = await incidentService.getIncidentById('EC-0142');
    expect(fetched?.status).toBe('VERIFIED');
  });

  it('rejects a DETECTED incident into REJECTED status', async () => {
    const updated = await incidentService.rejectIncident('EC-0142', 'Sun glare on asphalt');
    expect(updated.status).toBe('REJECTED');

    const fetched = await incidentService.getIncidentById('EC-0142');
    expect(fetched?.status).toBe('REJECTED');
  });

  it('assigns a VERIFIED incident to a team and advances to ASSIGNED status', async () => {
    // First verify EC-0142
    await incidentService.verifyIncident('EC-0142');

    // Now assign
    const assigned = await incidentService.assignIncident(
      'EC-0142',
      'Drainage Operations Team A',
      'Deploy Sump Pump'
    );
    expect(assigned.status).toBe('ASSIGNED');
    expect(assigned.owner).toBe('Drainage Operations Team A');
    expect(assigned.recommendedAction).toBe('Deploy Sump Pump');
  });

  it('throws error when trying to assign an unverified incident', async () => {
    // EC-0142 is DETECTED initially
    await expect(
      incidentService.assignIncident('EC-0142', 'Team A', 'Action')
    ).rejects.toThrow();
  });

  it('progresses an incident through entire lifecycle to CLOSED', async () => {
    // DETECTED -> VERIFIED
    await incidentService.verifyIncident('EC-0142');
    // VERIFIED -> ASSIGNED
    await incidentService.assignIncident('EC-0142', 'Crew 1', 'Pump');
    // ASSIGNED -> IN_PROGRESS
    const inProgress = await incidentService.updateIncidentStatus('EC-0142', 'IN_PROGRESS');
    expect(inProgress.status).toBe('IN_PROGRESS');
    // IN_PROGRESS -> RE_INSPECTION
    const reinspection = await incidentService.updateIncidentStatus('EC-0142', 'RE_INSPECTION');
    expect(reinspection.status).toBe('RE_INSPECTION');
    // RE_INSPECTION -> CLOSED
    const closed = await incidentService.updateIncidentStatus('EC-0142', 'CLOSED');
    expect(closed.status).toBe('CLOSED');
  });
});
