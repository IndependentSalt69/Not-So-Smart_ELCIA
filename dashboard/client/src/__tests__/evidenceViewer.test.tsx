import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EvidenceViewer } from '@/components/detail/EvidenceViewer';
import { incidentService } from '@/services/incidentService';
import { Incident } from '@/types/incident';

function createMockIncident(id: string, code: string): Incident {
  return {
    id,
    code,
    type: 'waterlogging',
    confidence: 0.92,
    source: 'AI_VISION',
    severity: 8.0,
    priority: 'P1',
    timestamp: '2026-09-07T12:00:00Z',
    zone: 'Electronics City Zone (EC-01)',
    zoneId: 'EC-01',
    locationDescription: `${code} - Waterlogging Hazard`,
    coordinates: { lat: 12.8452, lng: 77.6631 },
    durationSeconds: 14.5,
    evidenceFrame: '/static/evidence/fallback.jpg',
    severityFactors: {
      waterExtent: 8.0,
      persistenceSeconds: 14.5,
      roadObstruction: 8.0,
      roadCriticality: 8.5,
      explanation: ['Waterlogging detected by aerial drone vision sensor.'],
    },
    recommendedAction: 'Deploy high-capacity mobile dewatering pump',
    status: 'DETECTED',
    history: [],
  };
}

describe('EvidenceViewer Component', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders primary evidence path and detection observations', async () => {
    const mockIncident = createMockIncident('inc-uuid-1', 'INC-57923255-1');

    vi.spyOn(incidentService, 'getIncidentEvidence').mockResolvedValue([
      {
        id: 'ev-1',
        incidentId: 'inc-uuid-1',
        evidenceType: 'IMAGE',
        filePath: 'outputs/jobs/job-123/evidence/hazard_1_HIGH.jpg',
        mediaUrl: '/static/jobs/job-123/evidence/hazard_1_HIGH.jpg',
        videoUrl: '/static/jobs/job-123/annotated_output.mp4',
        isPrimary: true,
        createdAt: '2026-09-07T12:00:00Z',
      },
    ]);

    vi.spyOn(incidentService, 'getIncidentDetections').mockResolvedValue([
      {
        id: 'det-1',
        incidentId: 'inc-uuid-1',
        detectionType: 'waterlogging',
        confidence: 0.92,
        frameNumber: 42,
        detectedAt: '2026-09-07T12:00:00Z',
        detectionMetadata: {
          job_id: 'job-123',
          hazard_id: 1,
          timestamp_sec: 1.4,
          risk_level: 'HIGH',
        },
        createdAt: '2026-09-07T12:00:00Z',
      },
    ]);

    const html = renderToStaticMarkup(<EvidenceViewer incident={mockIncident} />);
    expect(html).toContain('Photos &amp; Evidence');
    expect(html).toContain('Show Detected Issues');
  });
});
