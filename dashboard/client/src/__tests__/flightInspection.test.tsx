import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  FlightInspectionCard,
  FlightInspectionResultsList,
  FlightInspectionRow,
  FlightRunHistoryDrawer,
} from '@/components/inspections';
import { FlightInspectionRunSummary } from '@/types/inspection';
import { Incident } from '@/types/incident';
import { inspectionService } from '@/services/inspectionService';
import { api } from '@/services/api';

// Helper to create mock Incident
function createMockIncident(
  id: string,
  code: string,
  type: Incident['type'],
  priority: Incident['priority'],
  confidence: number | null,
  source: 'AI_VISION' | 'HUMAN_REPORTED' = 'AI_VISION',
  status: Incident['status'] = 'DETECTED'
): Incident {
  return {
    id,
    code,
    type,
    confidence,
    source,
    severity: 7.5,
    priority,
    timestamp: '2026-09-07T00:15:00Z',
    zone: 'Electronics City Zone (EC-01)',
    zoneId: 'EC-01',
    locationDescription: `${code} - ${type} Hazard`,
    coordinates: { lat: 12.8452, lng: 77.6631 },
    durationSeconds: 15.0,
    evidenceFrame: '/static/evidence/frame.jpg',
    severityFactors: {
      waterExtent: 5.0,
      persistenceSeconds: 15,
      roadObstruction: 6.0,
      roadCriticality: 7.0,
      explanation: ['Moderate obstruction'],
    },
    recommendedAction: 'Inspect roadway',
    status,
    history: [],
  };
}

describe('Flight Inspection UI (TODO #4 Phase 3)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('1. Renders single-hazard flight inspection summary card', () => {
    const summary: FlightInspectionRunSummary = {
      job_id: '66faba48-1111-2222-3333-444455556666',
      job_prefix: '66FABA48',
      zone_code: 'EC-01',
      total_hazards: 1,
      class_counts: { POTHOLE: 1 },
      priority_counts: { P1: 1 },
      status: 'COMPLETED',
      created_at: '2026-09-07T00:15:00Z',
      completed_at: '2026-09-07T00:18:00Z',
      annotated_video_url: '/static/jobs/66faba48/annotated_output.mp4',
      has_human_report: false,
    };

    const html = renderToStaticMarkup(
      <FlightInspectionCard
        summary={summary}
        onPlayVideo={vi.fn()}
        onOpenHistory={vi.fn()}
      />
    );

    expect(html).toContain('Flight Inspection #66FABA48');
    expect(html).toContain('Zone: EC-01');
    expect(html).toContain('1');
    expect(html).toContain('1 Pothole');
    expect(html).toContain('1 P1');
    expect(html).toContain('Play Annotated Flight Video');
  });

  it('2. Renders 11-hazard inspection with correct total and breakdown', () => {
    const summary: FlightInspectionRunSummary = {
      job_id: '66faba48-3b1a-4d22-9e12-8921df348911',
      job_prefix: '66FABA48',
      zone_code: 'EC-01',
      total_hazards: 11,
      class_counts: {
        POTHOLE: 8,
        OPEN_MANHOLE: 1,
        WATERLOGGING: 2,
      },
      priority_counts: {
        P1: 3,
        P2: 5,
        P3: 3,
      },
      status: 'COMPLETED',
      created_at: '2026-09-07T00:15:00Z',
      completed_at: '2026-09-07T00:18:42Z',
      annotated_video_url: '/static/jobs/66faba48/annotated_output.mp4',
      has_human_report: false,
    };

    const html = renderToStaticMarkup(<FlightInspectionCard summary={summary} />);

    expect(html).toContain('11');
    expect(html).toContain('Hazards Detected');
    expect(html).toContain('8 Potholes');
    expect(html).toContain('1 Open Manhole');
    expect(html).toContain('2 Waterloggings');
    expect(html).toContain('3 P1');
    expect(html).toContain('5 P2');
    expect(html).toContain('3 P3');
  });

  it('3. Renders correct 5-class breakdown chips', () => {
    const summary: FlightInspectionRunSummary = {
      job_id: '5class-job',
      job_prefix: '5CLASS01',
      zone_code: 'EC-02',
      total_hazards: 5,
      class_counts: {
        POTHOLE: 1,
        WATERLOGGING: 1,
        OPEN_MANHOLE: 1,
        DRAINAGE_OVERFLOW: 1,
        DAMAGED_FOOTPATH: 1,
      },
      priority_counts: { P2: 5 },
      status: 'COMPLETED',
      created_at: '2026-09-07T00:15:00Z',
      has_human_report: false,
    };

    const html = renderToStaticMarkup(<FlightInspectionCard summary={summary} />);

    expect(html).toContain('1 Pothole');
    expect(html).toContain('1 Waterlogging');
    expect(html).toContain('1 Open Manhole');
    expect(html).toContain('1 Drainage Overflow');
    expect(html).toContain('1 Damaged Footpath');
  });

  it('4. Renders correct priority counts (P1, P2, P3)', () => {
    const summary: FlightInspectionRunSummary = {
      job_id: 'prio-job',
      job_prefix: 'PRIO0001',
      zone_code: 'EC-03',
      total_hazards: 9,
      class_counts: { POTHOLE: 9 },
      priority_counts: { P1: 3, P2: 4, P3: 2 },
      status: 'COMPLETED',
      created_at: '2026-09-07T00:15:00Z',
      has_human_report: false,
    };

    const html = renderToStaticMarkup(<FlightInspectionCard summary={summary} />);

    expect(html).toContain('3 P1');
    expect(html).toContain('4 P2');
    expect(html).toContain('2 P3');
  });

  it('5. Hazard class filter chips and counters render in FlightInspectionResultsList', () => {
    const incidents: Incident[] = [
      createMockIncident('1', 'INC-66FABA48-1', 'pothole', 'P1', 0.94),
      createMockIncident('2', 'INC-66FABA48-2', 'pothole', 'P2', 0.91),
      createMockIncident('3', 'INC-66FABA48-3', 'waterlogging', 'P2', 0.88),
      createMockIncident('4', 'INC-66FABA48-4', 'open_manhole', 'P1', 0.96),
    ];

    const html = renderToStaticMarkup(
      <FlightInspectionResultsList incidents={incidents} onSelectIncident={vi.fn()} />
    );

    expect(html).toContain('Showing 4 of 4 hazards');
    expect(html).toContain('All Classes (4)');
    expect(html).toContain('Potholes');
    expect(html).toContain('Waterlogging');
    expect(html).toContain('Open Manholes');
    expect(html).toContain('INC-66FABA48-1');
    expect(html).toContain('INC-66FABA48-2');
    expect(html).toContain('INC-66FABA48-3');
    expect(html).toContain('INC-66FABA48-4');
  });

  it('6. Priority filter counts render in FlightInspectionResultsList', () => {
    const incidents: Incident[] = [
      createMockIncident('1', 'INC-66FABA48-1', 'pothole', 'P1', 0.94),
      createMockIncident('2', 'INC-66FABA48-2', 'pothole', 'P2', 0.91),
      createMockIncident('3', 'INC-66FABA48-3', 'waterlogging', 'P3', 0.88),
    ];

    const html = renderToStaticMarkup(
      <FlightInspectionResultsList incidents={incidents} onSelectIncident={vi.fn()} />
    );

    expect(html).toContain('P1 (1)');
    expect(html).toContain('P2 (1)');
    expect(html).toContain('P3 (1)');
  });

  it('7. Status filter counts render in FlightInspectionResultsList', () => {
    const incidents: Incident[] = [
      createMockIncident('1', 'INC-66FABA48-1', 'pothole', 'P1', 0.94, 'AI_VISION', 'DETECTED'),
      createMockIncident('2', 'INC-66FABA48-2', 'pothole', 'P2', 0.91, 'AI_VISION', 'VERIFIED'),
    ];

    const html = renderToStaticMarkup(
      <FlightInspectionResultsList incidents={incidents} onSelectIncident={vi.fn()} />
    );

    expect(html).toContain('Detected (1)');
    expect(html).toContain('Verified (1)');
  });

  it('8. Individual incident rows remain separate (1 physical hazard = 1 Incident)', () => {
    const incidents: Incident[] = Array.from({ length: 11 }, (_, i) =>
      createMockIncident(
        `id-${i + 1}`,
        `INC-66FABA48-${i + 1}`,
        i === 8 ? 'open_manhole' : i >= 9 ? 'waterlogging' : 'pothole',
        'P2',
        0.9
      )
    );

    const html = renderToStaticMarkup(
      <FlightInspectionResultsList incidents={incidents} onSelectIncident={vi.fn()} />
    );

    // All 11 distinct rows must be rendered
    for (let i = 1; i <= 11; i++) {
      expect(html).toContain(`INC-66FABA48-${i}`);
    }
  });

  it('9. FlightInspectionRow renders incident details correctly', () => {
    const inc = createMockIncident('1', 'INC-66FABA48-1', 'pothole', 'P1', 0.94);

    const html = renderToStaticMarkup(
      <FlightInspectionRow incident={inc} onSelect={vi.fn()} />
    );

    expect(html).toContain('INC-66FABA48-1');
    expect(html).toContain('Pothole');
    expect(html).toContain('94% AI Conf');
    expect(html).toContain('7.5/10 Sev');
    expect(html).toContain('12.8452°N, 77.6631°E');
    expect(html).toContain('Inspect');
  });

  it('10. Zero-hazard flight renders VideoVerification controls', () => {
    const summary: FlightInspectionRunSummary = {
      job_id: '8f2b1c04-0000-0000-0000-000000000000',
      job_prefix: '8F2B1C04',
      zone_code: 'EC-01',
      total_hazards: 0,
      class_counts: {},
      priority_counts: {},
      status: 'PENDING_REVIEW',
      created_at: '2026-09-07T00:15:00Z',
      has_human_report: false,
    };

    const html = renderToStaticMarkup(
      <FlightInspectionCard
        summary={summary}
        onConfirmClear={vi.fn()}
        onReportAnomaly={vi.fn()}
      />
    );

    expect(html).toContain('0');
    expect(html).toContain('Hazards (AI Scan Clear)');
    expect(html).toContain('VERIFICATION REQUIRED');
    expect(html).toContain('Confirm Clear (True Negative)');
    expect(html).toContain('Report Undetected Hazard');
  });

  it('11. Confirmed-clear state renders correctly (True Negative)', () => {
    const summary: FlightInspectionRunSummary = {
      job_id: '8f2b1c04-0000-0000-0000-000000000000',
      job_prefix: '8F2B1C04',
      zone_code: 'EC-01',
      total_hazards: 0,
      class_counts: {},
      priority_counts: {},
      status: 'CONFIRMED_CLEAR',
      created_at: '2026-09-07T00:15:00Z',
      has_human_report: false,
    };

    const html = renderToStaticMarkup(<FlightInspectionCard summary={summary} />);

    expect(html).toContain('CONFIRMED CLEAR (True Negative)');
    expect(html).toContain('Flight Verified Clear of Hazards');
    expect(html).not.toContain('Confirm Clear (True Negative)');
  });

  it('12. Human-reported incident renders N/A confidence + HUMAN REPORTED', () => {
    const inc = createMockIncident(
      'manual-1',
      'INC-8F2B1C04-M14',
      'waterlogging',
      'P2',
      null, // null confidence for human reported
      'HUMAN_REPORTED'
    );

    const html = renderToStaticMarkup(
      <FlightInspectionRow incident={inc} onSelect={vi.fn()} />
    );

    expect(html).toContain('INC-8F2B1C04-M14');
    expect(html).toContain('AI Confidence: N/A • HUMAN REPORTED');
    // Must NOT display 100% or 1.0 confidence
    expect(html).not.toContain('100% AI Conf');
    expect(html).not.toContain('1.0 AI Conf');
  });

  it('13. Missing video does not render broken video action', () => {
    const summary: FlightInspectionRunSummary = {
      job_id: 'novid-job',
      job_prefix: 'NOVID001',
      zone_code: 'EC-01',
      total_hazards: 1,
      class_counts: { POTHOLE: 1 },
      priority_counts: { P1: 1 },
      status: 'COMPLETED',
      created_at: '2026-09-07T00:15:00Z',
      annotated_video_url: null, // No video available
      has_human_report: false,
    };

    const html = renderToStaticMarkup(
      <FlightInspectionCard summary={summary} onPlayVideo={vi.fn()} />
    );

    expect(html).not.toContain('Play Annotated Flight Video');
  });

  it('14. Historical run selection loads detail via inspectionService', async () => {
    const mockDetail = {
      summary: {
        job_id: 'job-12345678-0000',
        job_prefix: 'JOB12345',
        zone_code: 'EC-01',
        total_hazards: 2,
        class_counts: { POTHOLE: 2 },
        priority_counts: { P1: 2 },
        status: 'COMPLETED',
        created_at: '2026-09-07T00:10:00Z',
        annotated_video_url: '/static/jobs/job-12345678-0000/annotated_output.mp4',
        has_human_report: false,
      },
      incidents: [
        {
          id: 'inc-1',
          incident_code: 'INC-JOB12345-1',
          incident_type: 'POTHOLE' as const,
          confidence: 0.94,
          severity_score: 8.0,
          priority: 'P1' as const,
          zone_id: 'zone-1',
          status: 'DETECTED' as const,
          created_at: '2026-09-07T00:10:00Z',
          updated_at: '2026-09-07T00:10:00Z',
        },
      ],
      verification: null,
    };

    vi.spyOn(api, 'get').mockResolvedValueOnce(mockDetail);

    const result = await inspectionService.getFlightRunDetail('job-12345678-0000');

    expect(api.get).toHaveBeenCalledWith('/process/runs/job-12345678-0000');
    expect(result.summary.job_prefix).toBe('JOB12345');
    expect(result.incidents).toHaveLength(1);
    expect(result.incidents[0].code).toBe('INC-JOB12345-1');
    expect(result.incidents[0].type).toBe('pothole');
    expect(result.incidents[0].confidence).toBe(0.94);
  });

  it('15. inspectionService.listFlightRuns queries backend with parameters', async () => {
    const mockList = {
      items: [
        {
          job_id: 'job-abc',
          job_prefix: 'JOBABC01',
          total_hazards: 3,
          class_counts: { POTHOLE: 3 },
          priority_counts: { P2: 3 },
          status: 'COMPLETED',
          created_at: '2026-09-07T00:00:00Z',
          has_human_report: false,
        },
      ],
      total: 1,
      skip: 0,
      limit: 20,
    };

    vi.spyOn(api, 'get').mockResolvedValueOnce(mockList);

    const res = await inspectionService.listFlightRuns({ zone_id: 'EC-01', limit: 10 });
    expect(api.get).toHaveBeenCalledWith('/process/runs', { zone_id: 'EC-01', limit: 10 });
    expect(res.items).toHaveLength(1);
    expect(res.items[0].job_prefix).toBe('JOBABC01');
  });

  it('16. Counts in results list are dynamically computed with no hardcoding', () => {
    const dynamicIncidents: Incident[] = [
      createMockIncident('1', 'INC-DYN-1', 'drainage_overflow', 'P1', 0.95),
      createMockIncident('2', 'INC-DYN-2', 'damaged_footpath', 'P3', 0.82),
    ];

    const html = renderToStaticMarkup(
      <FlightInspectionResultsList incidents={dynamicIncidents} onSelectIncident={vi.fn()} />
    );

    expect(html).toContain('Showing 2 of 2 hazards');
    expect(html).toContain('Drainage Overflow');
    expect(html).toContain('Damaged Footpaths');
    // Potholes not present in this dynamic batch
    expect(html).not.toContain('Potholes');
  });
});
