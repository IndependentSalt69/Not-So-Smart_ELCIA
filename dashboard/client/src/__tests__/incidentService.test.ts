import { beforeEach, describe, expect, it } from 'vitest';
import {
  incidentService,
  mapBackendIncidentToFrontend,
  BackendIncidentItem,
  getEvidenceMediaUrl,
  getIncidentVideoUrlFromEvidencePath,
  formatPersistenceDuration,
} from '../services/incidentService';
import {
  mapBackendTypeToFrontend,
  mapFrontendTypeToBackend,
  getIncidentTypeLabel,
  IncidentType,
  BackendIncidentType,
} from '../types/incident';

describe('Incident Service', () => {
  beforeEach(() => {
    process.env.VITE_USE_MOCK_DATA = 'true';
    incidentService.resetToMockData();
  });

  it('correctly transforms job evidence file paths to browser-accessible static media URLs', () => {
    const jobPath = 'outputs/jobs/49559b26-9c73-4037-9f67-0fd7f711c6f3/evidence/hazard_1_LOW.jpg';
    const mediaUrl = getEvidenceMediaUrl(jobPath);
    expect(mediaUrl).toBe('http://127.0.0.1:8000/static/jobs/49559b26-9c73-4037-9f67-0fd7f711c6f3/evidence/hazard_1_LOW.jpg');

    const windowsPath = 'outputs\\jobs\\eb3dc24f-502a-4996-877e-b346bfc11f35\\evidence\\hazard_2_LOW.jpg';
    const winMediaUrl = getEvidenceMediaUrl(windowsPath);
    expect(winMediaUrl).toBe('http://127.0.0.1:8000/static/jobs/eb3dc24f-502a-4996-877e-b346bfc11f35/evidence/hazard_2_LOW.jpg');

    const globalEvPath = 'outputs/evidence/sample_global.jpg';
    expect(getEvidenceMediaUrl(globalEvPath)).toBe('http://127.0.0.1:8000/static/evidence/sample_global.jpg');

    expect(getEvidenceMediaUrl(null)).toBe('');
    expect(getEvidenceMediaUrl('https://example.com/live.jpg')).toBe('https://example.com/live.jpg');
  });

  it('correctly derives job annotated video MP4 URLs from evidence paths', () => {
    const jobPath = 'outputs/jobs/49559b26-9c73-4037-9f67-0fd7f711c6f3/evidence/hazard_1_LOW.jpg';
    const videoUrl = getIncidentVideoUrlFromEvidencePath(jobPath);
    expect(videoUrl).toBe('http://127.0.0.1:8000/static/jobs/49559b26-9c73-4037-9f67-0fd7f711c6f3/annotated_output.mp4');

    expect(getIncidentVideoUrlFromEvidencePath(null)).toBeNull();
  });

  it('correctly maps 5 hazard types between frontend and backend contracts', () => {
    const pairs: [IncidentType, BackendIncidentType][] = [
      ['waterlogging', 'WATERLOGGING'],
      ['pothole', 'POTHOLE'],
      ['drainage_overflow', 'DRAINAGE_OVERFLOW'],
      ['damaged_footpath', 'DAMAGED_FOOTPATH'],
      ['open_manhole', 'OPEN_MANHOLE'],
    ];

    for (const [fe, be] of pairs) {
      expect(mapBackendTypeToFrontend(be)).toBe(fe);
      expect(mapFrontendTypeToBackend(fe)).toBe(be);
    }

    expect(getIncidentTypeLabel('open_manhole')).toBe('Open Manhole');
  });

  it('formats persistence duration accurately with human-readable units and N/A for missing', () => {
    expect(formatPersistenceDuration(14.5)).toBe('14.5s');
    expect(formatPersistenceDuration(14.0)).toBe('14s');
    expect(formatPersistenceDuration(1.0)).toBe('1s');
    expect(formatPersistenceDuration(0.5)).toBe('0.5s');
    expect(formatPersistenceDuration(84)).toBe('1m 24s');
    expect(formatPersistenceDuration(123)).toBe('2m 03s');
    expect(formatPersistenceDuration(null)).toBe('N/A');
    expect(formatPersistenceDuration(undefined)).toBe('N/A');
    expect(formatPersistenceDuration(NaN)).toBe('N/A');
  });

  it('propagates real backend duration_seconds without silent 180s fallback', () => {
    const realItem: BackendIncidentItem = {
      id: 'test-real-duration-uuid',
      incident_code: 'INC-DUR-01',
      incident_type: 'POTHOLE',
      confidence: 0.94,
      severity_score: 7.5,
      priority: 'P1',
      zone_id: 'EC-01',
      status: 'DETECTED',
      duration_seconds: 14.5,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const frontendIncident = mapBackendIncidentToFrontend(realItem);
    expect(frontendIncident.durationSeconds).toBe(14.5);
    expect(frontendIncident.severityFactors.persistenceSeconds).toBe(14.5);
    expect(frontendIncident.severityFactors.explanation[1]).toContain('(14.5s)');
  });

  it('sets durationSeconds to null and does NOT fallback to 180s when backend duration is missing', () => {
    const missingItem: BackendIncidentItem = {
      id: 'test-missing-duration-uuid',
      incident_code: 'INC-DUR-02',
      incident_type: 'WATERLOGGING',
      confidence: 0.88,
      severity_score: 8.0,
      priority: 'P1',
      zone_id: 'EC-01',
      status: 'DETECTED',
      duration_seconds: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const frontendIncident = mapBackendIncidentToFrontend(missingItem);
    expect(frontendIncident.durationSeconds).toBeNull();
    expect(frontendIncident.severityFactors.persistenceSeconds).toBeNull();
    expect(frontendIncident.durationSeconds).not.toBe(180);
    expect(frontendIncident.severityFactors.explanation[1]).toBe(
      'Temporal persistence unrecorded during initial aerial pass.'
    );
  });

  it('maps backend open_manhole item with correct recommended action fallback', () => {
    const mockItem: BackendIncidentItem = {
      id: 'test-manhole-uuid',
      incident_code: 'INC-MANHOLE-01',
      incident_type: 'OPEN_MANHOLE',
      confidence: 0.97,
      severity_score: 9.5,
      priority: 'P1',
      zone_id: 'EC-01',
      status: 'DETECTED',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const frontendIncident = mapBackendIncidentToFrontend(mockItem);
    expect(frontendIncident.type).toBe('open_manhole');
    expect(frontendIncident.recommendedAction).toBe(
      'Install immediate high-visibility barricade and dispatch sewer maintenance crew to replace manhole lid.'
    );
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
