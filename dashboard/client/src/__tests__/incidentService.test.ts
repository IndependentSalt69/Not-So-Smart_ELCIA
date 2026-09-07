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

  it('correctly resolves source flight video URLs for manual-review incidents from jobs and uploads', () => {
    // 1. Direct static job annotated output
    const staticJobUrl = getIncidentVideoUrlFromEvidencePath('/static/jobs/job-456/annotated_output.mp4');
    expect(staticJobUrl).toBe('http://127.0.0.1:8000/static/jobs/job-456/annotated_output.mp4');

    // 2. Relative uploads flight video path
    const uploadPath = 'uploads/job-789/flight_raw.mp4';
    const uploadUrl = getIncidentVideoUrlFromEvidencePath(uploadPath);
    expect(uploadUrl).toBe('http://127.0.0.1:8000/static/uploads/job-789/flight_raw.mp4');

    // 3. Static uploads flight video URL
    const staticUploadUrl = getIncidentVideoUrlFromEvidencePath('/static/uploads/job-789/flight_raw.mp4');
    expect(staticUploadUrl).toBe('http://127.0.0.1:8000/static/uploads/job-789/flight_raw.mp4');

    // 4. Windows backslash upload path
    const winUploadPath = 'uploads\\job-789\\flight_raw.mp4';
    expect(getIncidentVideoUrlFromEvidencePath(winUploadPath)).toBe('http://127.0.0.1:8000/static/uploads/job-789/flight_raw.mp4');

    // 5. Genuinely non-video path returns null
    expect(getIncidentVideoUrlFromEvidencePath('outputs/evidence/some_snapshot.jpg')).toBeNull();
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

  it('preserves actual AI detection confidence and AI_VISION source for genuine AI incidents', () => {
    const aiIncidentItem: BackendIncidentItem = {
      id: 'ai-pothole-uuid',
      incident_code: 'INC-AUTO-01',
      incident_type: 'POTHOLE',
      confidence: 0.94,
      severity_score: 8.0,
      priority: 'P1',
      zone_id: 'EC-01',
      status: 'DETECTED',
      source: 'AI_VISION',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const frontendIncident = mapBackendIncidentToFrontend(aiIncidentItem);
    expect(frontendIncident.confidence).toBe(0.94);
    expect(frontendIncident.source).toBe('AI_VISION');
    expect(frontendIncident.severityFactors.explanation[0]).toBe('Pothole detected by aerial drone vision sensor.');
  });

  it('maps human-reported incident to confidence null, source HUMAN_REPORTED, and operator explanation', () => {
    const manualIncidentItem: BackendIncidentItem = {
      id: 'manual-incident-uuid',
      incident_code: 'INC-JOB12345-M12',
      incident_type: 'WATERLOGGING',
      confidence: 1.0, // Backend DB NOT NULL placeholder
      severity_score: 6.5,
      priority: 'P2',
      zone_id: 'EC-01',
      status: 'DETECTED',
      source: 'HUMAN_REPORTED',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const frontendIncident = mapBackendIncidentToFrontend(manualIncidentItem);
    // AI detection confidence must be null (rendered as N/A), never 1.0 or 100%
    expect(frontendIncident.confidence).toBeNull();
    expect(frontendIncident.source).toBe('HUMAN_REPORTED');
    expect(frontendIncident.severityFactors.explanation[0]).toBe(
      'Waterlogging reported manually by human operator during aerial footage review.'
    );
  });

  describe('Zone Consistency Mapping', () => {
    it('1. EC-04 incident maps to zoneId = EC-04 with canonical zone name', () => {
      const item: BackendIncidentItem = {
        id: 'inc-ec04-uuid-1',
        incident_code: 'INC-57923255-1',
        incident_type: 'POTHOLE',
        confidence: 0.92,
        severity_score: 7.2,
        priority: 'P2',
        zone_id: '803a13e5-416d-4614-b404-f730d1d8926e',
        zone_code: 'EC-04',
        zone_name: 'Main Junction Corridor (EPIC Area)',
        status: 'DETECTED',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const mapped = mapBackendIncidentToFrontend(item);
      expect(mapped.zoneId).toBe('EC-04');
      expect(mapped.zone).toBe('Main Junction Corridor (EPIC Area)');
    });

    it('2. EC-03 incident maps to EC-03', () => {
      const item: BackendIncidentItem = {
        id: 'inc-ec03-uuid-1',
        incident_code: 'INC-EC03-01',
        incident_type: 'WATERLOGGING',
        confidence: 0.85,
        severity_score: 8.0,
        priority: 'P1',
        zone_id: '01f02dbd-ad38-471a-bcfd-1366bc18aa67',
        zone_code: 'EC-03',
        status: 'DETECTED',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const mapped = mapBackendIncidentToFrontend(item);
      expect(mapped.zoneId).toBe('EC-03');
      expect(mapped.zone).toBe('Phase 2 - North (Velankani Drive)');
    });

    it('3. EC-01 incident remains EC-01', () => {
      const item: BackendIncidentItem = {
        id: 'inc-ec01-uuid-1',
        incident_code: 'INC-EC01-01',
        incident_type: 'DRAINAGE_OVERFLOW',
        confidence: 0.91,
        severity_score: 6.8,
        priority: 'P2',
        zone_id: 'ade35080-dbe8-4989-b158-f844f383562f',
        zone_code: 'EC-01',
        status: 'DETECTED',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const mapped = mapBackendIncidentToFrontend(item);
      expect(mapped.zoneId).toBe('EC-01');
      expect(mapped.zone).toBe('Phase 1 - West (Hosur Road Corridor)');
    });

    it('4. Missing/unknown zone does NOT become EC-01', () => {
      const unknownItem: BackendIncidentItem = {
        id: 'inc-unknown-uuid',
        incident_code: 'INC-UNKNOWN-01',
        incident_type: 'POTHOLE',
        confidence: 0.75,
        severity_score: 5.0,
        priority: 'P3',
        zone_id: '99999999-9999-9999-9999-999999999999',
        zone_code: null,
        zone_name: null,
        status: 'DETECTED',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const mapped = mapBackendIncidentToFrontend(unknownItem);
      expect(mapped.zoneId).toBeNull();
      expect(mapped.zoneId).not.toBe('EC-01');
      expect(mapped.zone).toBe('Zone unavailable');
    });

    it('5. Resolves zone code from known UUID if zone_code is missing', () => {
      const itemOnlyUuid: BackendIncidentItem = {
        id: 'inc-uuid-only',
        incident_code: 'INC-57923255-4',
        incident_type: 'POTHOLE',
        confidence: 0.89,
        severity_score: 6.5,
        priority: 'P2',
        zone_id: '803a13e5-416d-4614-b404-f730d1d8926e',
        status: 'DETECTED',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const mapped = mapBackendIncidentToFrontend(itemOnlyUuid);
      expect(mapped.zoneId).toBe('EC-04');
      expect(mapped.zone).toBe('Main Junction Corridor (EPIC Area)');
    });
  });
});
